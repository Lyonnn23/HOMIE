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

    // Use the price locked when the booking was created. The DB trigger
    // `fill_reserva_total` computed reservas.total/comision server-side at
    // insert time, so a provider raising prices later can't change what the
    // client is charged.
    const total = Number(reserva.total);
    if (!total || total <= 0) throw new Error("No se pudo validar el precio del servicio");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rc } = await supabaseAdmin
      .from("reservas").select("comision, estado").eq("id", reserva.id).maybeSingle();
    if (rc?.estado === "cancelada") throw new Error("La reserva está cancelada");
    const comision = Number(rc?.comision ?? Math.round(total - total / 1.15));
    const montoPrestador = total - comision;
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
