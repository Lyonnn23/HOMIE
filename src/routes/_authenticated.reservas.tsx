import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, MapPin, MessageCircle, Star, Shield, RotateCcw, Award, Scale, CreditCard, Loader2, KeyRound, CheckCircle2, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ContactoPrestador } from "@/components/ContactoPrestador";
import { ReportModal } from "@/components/ReportModal";
import { ReviewModal } from "@/components/ReviewModal";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { useBookings, useUpdateBookingStatus, type Booking } from "@/store/bookings";
import { formatCLP } from "@/data/services";
import { createPaymentPreference, refundReserva } from "@/lib/mercadopago.functions";


export const Route = createFileRoute("/_authenticated/reservas")({
  head: () => ({ meta: [
    { name: "description", content: "Consulta tus reservas y el estado de tus servicios en Homie." },
    { property: "og:title", content: "Mis reservas — Homie" },
    { property: "og:description", content: "Consulta tus reservas y el estado de tus servicios en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Mis reservas — Homie" }] }),
  component: Reservas,
});

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-[#FAC77540] text-[#854F0B]",
  confirmada: "bg-[#00C28820] text-[#00754F]",
  "en camino": "bg-blue-100 text-blue-800",
  completado: "bg-[#00C28820] text-[#00754F]",
  cancelada: "bg-[#FF3B6B20] text-[#FF3B6B]",
};

function Reservas() {
  const bookings = useBookings();
  const active = bookings.filter((b) => b.status !== "completado" && b.status !== "cancelada");
  const past = bookings.filter((b) => b.status === "completado" || b.status === "cancelada");
  const hasOngoing = active.some((b) => b.status === "en camino" || b.status === "confirmada");

  // Count completed bookings per provider — 3+ = "Tu profesional habitual"
  const providerCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      if (b.status === "completado") m.set(b.providerId, (m.get(b.providerId) ?? 0) + 1);
    }
    return m;
  }, [bookings]);

  return (
    <AppShell>
      {hasOngoing && <EmergencyBanner />}
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
      </header>

      {bookings.length === 0 ? (
        <div className="px-5 mt-10 text-center">
          <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center">
            <CalendarCheck className="size-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">Aún no tienes reservas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Explora servicios y reserva en minutos.</p>
          <Link to="/" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm">
            Explorar servicios
          </Link>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activas</h2>
              <div className="space-y-2">
                {active.map((b) => <BookingCard key={b.id} b={b} timesHired={providerCount.get(b.providerId) ?? 0} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Historial</h2>
              <div className="space-y-2">
                {past.map((b) => <BookingCard key={b.id} b={b} timesHired={providerCount.get(b.providerId) ?? 0} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function CodigoConfirmacion({ reservaId }: { reservaId: string }) {
  const q = useQuery({
    queryKey: ["reserva-codigo", reservaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reserva_codigos").select("codigo").eq("reserva_id", reservaId).maybeSingle();
      if (error) throw error;
      return data?.codigo ?? null;
    },
  });
  if (q.isLoading || !q.data) return null;
  return (
    <div className="mt-3 p-3 rounded-xl bg-[#FAC77540] border border-[#EF9F27]/50 flex items-start gap-3">
      <KeyRound className="size-4 mt-0.5 text-[#854F0B] shrink-0" />
      <div className="text-xs text-[#854F0B]">
        <div className="font-semibold">Código de confirmación: <span className="font-mono text-base tracking-[0.25em] text-[#111827]">{q.data}</span></div>
        <p className="mt-0.5">Dáselo al profesional solo cuando el trabajo esté terminado.</p>
      </div>
    </div>
  );
}

function BookingCard({ b, timesHired }: { b: Booking; timesHired: number }) {
  const [showReview, setShowReview] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const cancel = useUpdateBookingStatus();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const canCancel = b.status === "pendiente" || b.status === "confirmada";

  const refund = useServerFn(refundReserva);
  async function confirmarCancelacion() {
    try {
      await cancel.mutateAsync({ id: b.id, estado: "cancelada", motivo });
      setCancelando(false); setMotivo("");
      if (b.status === "confirmada") {
        try {
          const r = await refund({ data: { reservaId: b.id } });
          if (r.reembolsado > 0) {
            toast.success(
              r.motivo === "tardia"
                ? `Reserva cancelada. Reembolso del 90% (${formatCLP(r.reembolsado)}) por cancelar con menos de 24 h.`
                : `Reserva cancelada. Reembolso completo de ${formatCLP(r.reembolsado)} en camino.`,
            );
            return;
          }
        } catch (e) {
          toast.warning(e instanceof Error ? e.message : "Reserva cancelada; el reembolso se procesará manualmente.");
          return;
        }
      }
      toast.success("Reserva cancelada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cancelar");
    }
  }

  async function confirmarTerminado() {
    try {
      await cancel.mutateAsync({ id: b.id, estado: "completada" });
      toast.success("Trabajo confirmado. ¡Gracias!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo confirmar");
    }
  }
  const createPreference = useServerFn(createPaymentPreference);
  const [paying, setPaying] = useState(false);
  const canReport = b.status === "confirmada" || b.status === "en camino" || b.status === "completado";
  const isHabitual = timesHired >= 3;

  async function pagar() {
    setPaying(true);
    try {
      const { initPoint } = await createPreference({ data: { reservaId: b.id } });
      window.location.href = initPoint;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setPaying(false);
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{b.service}</div>
          <div className="text-sm text-muted-foreground">con {b.providerName}</div>
          {isHabitual && (
            <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EF9F27]/15 text-[#854F0B] text-[10px] font-bold uppercase tracking-wide">
              <Award className="size-3 text-[#EF9F27]" />
              Tu profesional habitual
            </span>
          )}
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[b.status]}`}>
          {b.status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span>{b.date} · {b.time}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{b.address}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
        <span className="font-semibold text-sm">{formatCLP(b.price)}</span>
        <div className="flex gap-2 flex-wrap">
          {(b.status === "confirmada" || b.status === "en camino" || b.status === "completado") && (
            <Link
              to="/chat/$reservaId"
              params={{ reservaId: b.id }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
            >
              <MessageCircle className="size-3.5" /> Chat
            </Link>
          )}
          {(b.status === "confirmada" || b.status === "en camino") && (
            <ContactoPrestador reservaId={b.id} nombre={b.providerName} />
          )}
          {b.status === "pendiente" && (
            <button
              disabled={paying}
              onClick={pagar}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-bold disabled:opacity-50"
            >
              {paying ? <Loader2 className="size-3.5 animate-spin" /> : <CreditCard className="size-3.5" />} Pagar
            </button>
          )}
          {b.status === "en camino" && (
            <button
              disabled={cancel.isPending}
              onClick={confirmarTerminado}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#00C288] text-white text-xs font-bold disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" /> Confirmar trabajo terminado
            </button>
          )}
          {canCancel && !cancelando && (
            <button
              disabled={cancel.isPending}
              onClick={() => setCancelando(true)}
              className="px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          {b.status === "completado" && !b.hasReview && (
            <button
              onClick={() => setShowReview(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-semibold"
            >
              <Star className="size-3.5" /> Dejar reseña
            </button>
          )}
          {b.status === "completado" && b.hasReview && (
            <span className="text-xs text-muted-foreground">✓ Reseña enviada</span>
          )}
          {b.status === "completado" && (
            <Link
              to="/comprobante/$reservaId"
              params={{ reservaId: b.id }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
            >
              <FileText className="size-3.5" /> Comprobante
            </Link>
          )}
        </div>
      </div>

      {b.status === "en camino" && <CodigoConfirmacion reservaId={b.id} />}

      {canCancel && cancelando && (
        <div className="mt-3 p-3 rounded-xl bg-[#F5F5F0] border border-border">
          <label className="block text-xs font-semibold text-[#111827]">¿Por qué cancelas? (breve)</label>
          <input
            autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 140))}
            placeholder="Ej. Cambio de planes, encontré otra solución..."
            className="mt-1.5 w-full h-10 px-3 rounded-xl bg-white border border-border text-sm outline-none focus:border-foreground/30"
          />
          <div className="mt-2 flex gap-2 justify-end">
            <button onClick={() => { setCancelando(false); setMotivo(""); }} disabled={cancel.isPending}
              className="px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50">
              Volver
            </button>
            <button onClick={confirmarCancelacion} disabled={cancel.isPending || motivo.trim().length < 3}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FF3B6B] text-white text-xs font-semibold disabled:opacity-50">
              {cancel.isPending && <Loader2 className="size-3.5 animate-spin" />} Confirmar cancelación
            </button>
          </div>
        </div>
      )}

      {b.status === "cancelada" && b.motivoCancelacion && (
        <p className="mt-2 text-xs text-muted-foreground">
          Cancelada{b.canceladaPor === "prestador" ? " por el profesional" : b.canceladaPor === "cliente" ? " por ti" : ""}: "{b.motivoCancelacion}"
        </p>
      )}

      {b.status === "completado" && (
        <Link
          to="/reservar/$id"
          params={{ id: b.providerId }}
          search={{ service: b.service }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F5F5F0] border border-[#EF9F27] text-[#111827] text-xs font-bold hover:bg-[#EF9F27]/10"
        >
          <RotateCcw className="size-3.5 text-[#EF9F27]" />
          Volver a contratar → {b.providerName}
        </Link>
      )}

      {canReport && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#FF3B6B] text-[#FF3B6B] text-xs font-semibold hover:bg-[#FF3B6B]/5"
          >
            <Shield className="size-3.5" /> Reportar problema
          </button>
          <Link
            to="/reclamos"
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-[#111827] hover:bg-muted"
          >
            <Scale className="size-3.5 text-[#EF9F27]" /> Reclamo
          </Link>
        </div>
      )}

      {showReview && <ReviewModal b={b} onClose={() => setShowReview(false)} />}
      {showReport && (
        <ReportModal
          reservaId={b.id}
          reportadoId={b.providerId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}



