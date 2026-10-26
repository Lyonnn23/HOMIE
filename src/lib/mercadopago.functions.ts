import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ reservaId: z.string().uuid() });

export const createPaymentPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

    // Load reserva as authenticated user (RLS ensures the caller is cliente/prestador).
    const { data: reserva, error: rErr } = await context.supabase
      .from("reservas")
      .select("id, cliente_id, prestador_id, total, fecha, hora, servicio_id, servicios(nombre)")
      .eq("id", data.reservaId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!reserva) throw new Error("Reserva no encontrada");

    // Verify the caller is the cliente of this reserva.
    const { data: usuario } = await context.supabase
      .from("usuarios")
      .select("id, email, nombre")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!usuario || usuario.id !== reserva.cliente_id) {
      throw new Error("Solo el cliente de la reserva puede pagar");
    }

    // Modelo: el cliente paga exactamente el precio del profesional (menos cupón);
    // la comisión de Homie se descuenta del pago al profesional. Un cupón lo
    // absorbe Homie (costo de marketing), nunca el profesional.
    const total = Number(reserva.total);
    if (!total || total <= 0) throw new Error("No se pudo validar el precio del servicio");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rc } = await supabaseAdmin
      .from("reservas").select("comision, estado, descuento").eq("id", reserva.id).maybeSingle();
    if (rc?.estado === "cancelada") throw new Error("La reserva está cancelada");
    const descuento = Number(rc?.descuento ?? 0);
    const precio = total + descuento;
    const comisionBruta = Number(rc?.comision ?? 0);
    const montoPrestador = Math.max(0, precio - comisionBruta);
    const comision = total - montoPrestador; // puede ser negativo si el cupón supera la comisión
    const serviceName =
      (reserva.servicios as { nombre?: string } | null)?.nombre ?? "Servicio Homie";

    // Build absolute origin for back_urls / notification_url.
    const forwardedProto = getRequestHeader("x-forwarded-proto") ?? "https";
    const host = getRequestHeader("x-forwarded-host") ?? getRequestHeader("host");
    if (!host) throw new Error("No se pudo determinar el host");
    const origin = `${forwardedProto}://${host}`;

    const prefBody = {
      items: [
        {
          id: reserva.id,
          title: serviceName,
          quantity: 1,
          currency_id: "CLP",
          unit_price: total,
        },
      ],
      payer: usuario.email ? { email: usuario.email, name: usuario.nombre ?? undefined } : undefined,
      external_reference: reserva.id,
      back_urls: {
        success: `${origin}/reservas?pago=exito&reserva=${reserva.id}`,
        pending: `${origin}/reservas?pago=pendiente&reserva=${reserva.id}`,
        failure: `${origin}/reservas?pago=error&reserva=${reserva.id}`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/public/mercadopago/webhook`,
      statement_descriptor: "HOMIE",
      metadata: {
        reserva_id: reserva.id,
        cliente_id: reserva.cliente_id,
        prestador_id: reserva.prestador_id,
      },
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prefBody),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[MP] createPreference failed", res.status, text);
      throw new Error(`Mercado Pago rechazó la preferencia (${res.status})`);
    }
    const pref = (await res.json()) as {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    };

    // Persist pending pago row with elevated privileges (admin bypasses RLS).
    await supabaseAdmin.from("pagos").upsert(
      {
        reserva_id: reserva.id,
        mp_preference_id: pref.id,
        monto_total: total,
        monto_prestador: montoPrestador,
        comision,
        moneda: "CLP",
        estado: "pendiente",
      },
      { onConflict: "reserva_id" }
    );

    const isSandbox = accessToken.startsWith("TEST-");
    return {
      preferenceId: pref.id,
      initPoint: isSandbox ? pref.sandbox_init_point : pref.init_point,
    };
  });

const refundSchema = z.object({ reservaId: z.string().uuid() });

/**
 * Reembolso al cancelar una reserva pagada.
 * Reglas: cancela el PRESTADOR o el ADMIN → 100%. Cancela el CLIENTE con 24h o más
 * de anticipación → 100%; con menos de 24h → 90% (10% cubre la comisión y el tiempo
 * reservado del profesional). Solo reembolsa pagos en estado "pagado".
 */
export const refundReserva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => refundSchema.parse(input))
  .handler(async ({ data, context }) => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // La reserva debe ser visible para quien llama (RLS) y estar cancelada.
    const { data: reserva } = await context.supabase
      .from("reservas")
      .select("id, estado, fecha, hora, cancelada_por")
      .eq("id", data.reservaId)
      .maybeSingle();
    if (!reserva) throw new Error("Reserva no encontrada");
    if (reserva.estado !== "cancelada") throw new Error("La reserva no está cancelada");

    const { data: pago } = await supabaseAdmin
      .from("pagos")
      .select("id, mp_payment_id, monto_total, estado")
      .eq("reserva_id", reserva.id)
      .maybeSingle();
    if (!pago || pago.estado !== "pagado" || !pago.mp_payment_id) {
      return { reembolsado: 0, motivo: "sin_pago" as const };
    }

    const inicio = new Date(`${reserva.fecha}T${reserva.hora}`);
    const horas = (inicio.getTime() - Date.now()) / 36e5;
    const porcentaje = reserva.cancelada_por === "cliente" && horas < 24 ? 0.9 : 1;
    const monto = Math.round(Number(pago.monto_total) * porcentaje);

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${pago.mp_payment_id}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `refund-${reserva.id}`,
      },
      body: JSON.stringify(porcentaje < 1 ? { amount: monto } : {}),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[MP] refund failed", res.status, text);
      throw new Error("Mercado Pago no pudo procesar el reembolso. Homie lo revisará manualmente.");
    }
    await supabaseAdmin
      .from("pagos")
      .update({ estado: "reembolsado", reembolsado_at: new Date().toISOString() })
      .eq("id", pago.id);
    return { reembolsado: monto, motivo: porcentaje < 1 ? ("tardia" as const) : ("total" as const) };
  });

const proSchema = z.object({ planId: z.enum(["mensual", "anual"]) });

/** Pago de Homie Premium (mensual/anual). La activación la hace el webhook al confirmar el pago. */
export const createProPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => proSchema.parse(input))
  .handler(async ({ data, context }) => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usuario } = await context.supabase.from("usuarios").select("id, email, nombre").eq("user_id", context.userId).maybeSingle();
    if (!usuario) throw new Error("Usuario no encontrado");
    const { data: prestador } = await context.supabase.from("prestadores").select("id, verificado").eq("usuario_id", usuario.id).maybeSingle();
    if (!prestador) throw new Error("No tienes perfil de profesional");
    if (!prestador.verificado) throw new Error("Homie Premium se activa cuando tu perfil está verificado");
    const { data: plan } = await supabaseAdmin.from("planes_pro").select("*").eq("id", data.planId).eq("activo", true).maybeSingle();
    if (!plan) throw new Error("Plan no disponible");

    const { data: sus, error: sErr } = await supabaseAdmin
      .from("suscripciones_pro")
      .insert({ prestador_id: prestador.id, plan_id: plan.id, monto: plan.precio, estado: "pendiente" })
      .select("id").single();
    if (sErr || !sus) throw new Error("No se pudo crear la suscripción");

    const forwardedProto = getRequestHeader("x-forwarded-proto") ?? "https";
    const host = getRequestHeader("x-forwarded-host") ?? getRequestHeader("host");
    const origin = `${forwardedProto}://${host}`;
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: `pro-${plan.id}`, title: plan.nombre, quantity: 1, currency_id: "CLP", unit_price: plan.precio }],
        payer: usuario.email ? { email: usuario.email, name: usuario.nombre ?? undefined } : undefined,
        external_reference: `pro:${sus.id}`,
        back_urls: {
          success: `${origin}/pro?pago=exito`, pending: `${origin}/pro?pago=pendiente`, failure: `${origin}/pro?pago=error`,
        },
        auto_return: "approved",
        notification_url: `${origin}/api/public/mercadopago/webhook`,
        statement_descriptor: "HOMIE PRO",
      }),
    });
    if (!res.ok) throw new Error(`Mercado Pago rechazó la preferencia (${res.status})`);
    const pref = (await res.json()) as { id: string; init_point: string; sandbox_init_point: string };
    await supabaseAdmin.from("suscripciones_pro").update({ mp_preference_id: pref.id }).eq("id", sus.id);
    return { initPoint: accessToken.startsWith("TEST-") ? pref.sandbox_init_point : pref.init_point };
  });
