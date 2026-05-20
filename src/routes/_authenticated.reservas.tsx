import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, MapPin, MessageCircle, Star } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useBookings, useAddReview, useUpdateBookingStatus, type Booking } from "@/store/bookings";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/reservas")({
  head: () => ({ meta: [{ title: "Mis reservas — Homie" }] }),
  component: Reservas,
});

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  "en camino": "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-700",
};

function Reservas() {
  const bookings = useBookings();
  const active = bookings.filter((b) => b.status !== "completado" && b.status !== "cancelada");
  const past = bookings.filter((b) => b.status === "completado" || b.status === "cancelada");

  return (
    <AppShell>
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
                {active.map((b) => <BookingCard key={b.id} b={b} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Historial</h2>
              <div className="space-y-2">
                {past.map((b) => <BookingCard key={b.id} b={b} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function BookingCard({ b }: { b: Booking }) {
  const [showReview, setShowReview] = useState(false);
  const cancel = useUpdateBookingStatus();

  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{b.service}</div>
          <div className="text-sm text-muted-foreground">con {b.providerName}</div>
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
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold"
            >
              <Star className="size-3.5" /> Dejar reseña
            </button>
          )}
          {b.status === "completado" && b.hasReview && (
            <span className="text-xs text-muted-foreground">✓ Reseña enviada</span>
          )}
        </div>
      </div>

      {showReview && <ReviewModal b={b} onClose={() => setShowReview(false)} />}
    </div>
  );
}

function ReviewModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const addReview = useAddReview();

  async function submit() {
    await addReview.mutateAsync({
      reservaId: b.id,
      prestadorId: b.providerId,
      calificacion: rating,
      comentario: comment,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-background rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold">Califica a {b.providerName}</h3>
          <p className="text-sm text-muted-foreground">{b.service}</p>
        </div>
        <div className="flex justify-center gap-1">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => setRating(n)} className="p-1">
              <Star className={`size-9 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Cuéntanos cómo fue tu experiencia..."
          className="w-full px-4 py-3 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 resize-none text-sm"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-border font-semibold text-sm">
            Cancelar
          </button>
          <button
            disabled={addReview.isPending}
            onClick={submit}
            className="flex-1 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm disabled:opacity-50"
          >
            {addReview.isPending ? "Enviando..." : "Enviar reseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
