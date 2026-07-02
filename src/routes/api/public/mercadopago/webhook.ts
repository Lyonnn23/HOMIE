import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Mercado Pago webhook receiver.
 * MP sends: POST /api/public/mercadopago/webhook?type=payment&data.id=<paymentId>
 * Headers include `x-signature` (ts=..,v1=..) and `x-request-id`.
 * Manifest to sign: `id:<dataId>;request-id:<xRequestId>;ts:<ts>;`
 * Docs: https://www.mercadopago.cl/developers/en/docs/your-integrations/notifications/webhooks
 */
export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
        const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

        const sigHeader = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        const rawBody = await request.text();

        // ---- Signature verification (MANDATORY) ----
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[MP webhook] MERCADOPAGO_WEBHOOK_SECRET not configured — rejecting");
          return new Response("Webhook not configured", { status: 401 });
        }
        if (!dataId) {
          // Nothing verifiable/processable — acknowledge without side effects.
          return new Response("ok", { status: 200 });
        }
        {
          const parts = Object.fromEntries(
            sigHeader.split(",").map((s) => {
              const [k, ...rest] = s.trim().split("=");
              return [k, rest.join("=")];
            })
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (!ts || !v1) {
            return new Response("Missing signature parts", { status: 401 });
          }
          // Replay protection: reject notifications older than 5 minutes.
          const tsNum = Number(ts);
          const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
          if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
            console.warn("[MP webhook] stale or invalid ts");
            return new Response("Stale signature", { status: 401 });
          }
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          const a = Buffer.from(expected, "hex");
          const b = Buffer.from(v1, "hex");
          if (a.length !== b.length || b.length === 0 || !timingSafeEqual(a, b)) {
            console.warn("[MP webhook] invalid signature");
            return new Response("Invalid signature", { status: 401 });
          }
        }

        // Only care about payment notifications.
        if (type !== "payment" || !dataId) {
          return new Response("ok", { status: 200 });
        }

        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) return new Response("Missing access token", { status: 500 });

        // Fetch payment details from MP.
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mpRes.ok) {
          console.error("[MP webhook] payment fetch failed", mpRes.status);
          return new Response("Payment fetch failed", { status: 202 });
        }
        const payment = (await mpRes.json()) as {
          id: number | string;
          status: string; // approved | rejected | pending | in_process | refunded | cancelled
          external_reference?: string | null;
          preference_id?: string | null;
          transaction_amount?: number;
        };

        const reservaId = payment.external_reference;
        if (!reservaId) {
          return new Response("Missing external_reference", { status: 202 });
        }

        // Map MP status to our internal states.
        let pagoEstado: "pagado" | "rechazado" | "pendiente" | "reembolsado" = "pendiente";
        let reservaEstado: "confirmada" | "cancelada" | "pendiente" | null = null;
        switch (payment.status) {
          case "approved":
            pagoEstado = "pagado";
            reservaEstado = "confirmada";
            break;
          case "rejected":
          case "cancelled":
            pagoEstado = "rechazado";
            reservaEstado = "cancelada";
            break;
          case "refunded":
          case "charged_back":
            pagoEstado = "reembolsado";
            reservaEstado = "cancelada";
            break;
          default:
            pagoEstado = "pendiente";
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        await supabaseAdmin
          .from("pagos")
          .update({
            mp_payment_id: String(payment.id),
            estado: pagoEstado,
            updated_at: new Date().toISOString(),
          })
          .eq("reserva_id", reservaId);

        if (reservaEstado) {
          await supabaseAdmin
            .from("reservas")
            .update({ estado: reservaEstado })
            .eq("id", reservaId);
        }

        // Consume rawBody to avoid unused-var warnings; useful for future logging.
        void rawBody;

        return new Response("ok", { status: 200 });
      },
    },
  },
});
