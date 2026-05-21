import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, MapPin, MessageCircle, Star, Shield, RotateCcw, Award } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ReportModal } from "@/components/ReportModal";
import { ReviewModal } from "@/components/ReviewModal";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { useBookings, useUpdateBookingStatus, type Booking } from "@/store/bookings";
import { formatCLP } from "@/data/services";


export const Route = createFileRoute("/_authenticated/reservas")({
  head: () => ({ meta: [{ title: "Mis reservas — Homie" }] }),
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

function BookingCard({ b, timesHired }: { b: Booking; timesHired: number }) {
  const [showReview, setShowReview] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const cancel = useUpdateBookingStatus();
  const canReport = b.status === "confirmada" || b.status === "en camino" || b.status === "completado";
  const isHabitual = timesHired >= 3;

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
          {b.status === "pendiente" && (
            <button
              disabled={cancel.isPending}
              onClick={() => cancel.mutate({ id: b.id, estado: "cancelada" })}
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
        </div>
      </div>

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
        <button
          onClick={() => setShowReport(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#FF3B6B] text-[#FF3B6B] text-xs font-semibold hover:bg-[#FF3B6B]/5"
        >
          <Shield className="size-3.5" /> Reportar problema
        </button>
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



