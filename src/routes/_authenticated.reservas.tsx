import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBookings } from "@/store/bookings";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/reservas")({
  head: () => ({ meta: [{ title: "Mis reservas — Manitos" }] }),
  component: Reservas,
});

const STATUS_STYLE: Record<string, string> = {
  "pendiente": "bg-yellow-100 text-yellow-800",
  "en camino": "bg-blue-100 text-blue-800",
  "completado": "bg-green-100 text-green-800",
};

function Reservas() {
  const bookings = useBookings();
  const active = bookings.filter((b) => b.status !== "completado");
  const past = bookings.filter((b) => b.status === "completado");

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

function BookingCard({ b }: { b: ReturnType<typeof useBookings>[number] }) {
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
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="font-semibold text-sm">{formatCLP(b.price)}</span>
      </div>
    </div>
  );
}
