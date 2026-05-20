import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, MapPin, Check, X, Truck, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProviderBookings, useUpdateBookingStatus, type Booking, type DbEstado } from "@/store/bookings";
import { formatCLP } from "@/data/services";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [{ title: "Panel del prestador — Manitos" }] }),
  component: PanelPage,
});

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  "en camino": "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-700",
};

function PanelPage() {
  const { usuario } = useAuth();
  const { bookings, isLoading, hasPrestador } = useProviderBookings();

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Solo prestadores</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta sección es para cuentas de tipo prestador.</p>
          <Link to="/" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm">Ir al inicio</Link>
        </div>
      </AppShell>
    );
  }

  if (!isLoading && !hasPrestador) {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Completa tu perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">Necesitas completar tu onboarding de prestador.</p>
          <Link to="/onboarding-prestador" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm">
            Completar perfil
          </Link>
        </div>
      </AppShell>
    );
  }

  const pendientes = bookings.filter((b) => b.status === "pendiente");
  const activas = bookings.filter((b) => b.status === "confirmada" || b.status === "en camino");
  const cerradas = bookings.filter((b) => b.status === "completado" || b.status === "cancelada");

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona tus reservas entrantes</p>
      </header>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Cargando...</div>
      ) : bookings.length === 0 ? (
        <div className="px-5 mt-10 text-center">
          <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center">
            <CalendarCheck className="size-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">Aún no tienes solicitudes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Las nuevas reservas aparecerán aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {pendientes.length > 0 && <Section title={`Nuevas (${pendientes.length})`} items={pendientes} />}
          {activas.length > 0 && <Section title="Activas" items={activas} />}
          {cerradas.length > 0 && <Section title="Historial" items={cerradas} />}
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, items }: { title: string; items: Booking[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h2>
      <div className="space-y-2">
        {items.map((b) => <ProviderBookingCard key={b.id} b={b} />)}
      </div>
    </section>
  );
}

function ProviderBookingCard({ b }: { b: Booking }) {
  const update = useUpdateBookingStatus();
  const set = (estado: DbEstado) => update.mutate({ id: b.id, estado });

  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{b.service}</div>
          <div className="text-sm text-muted-foreground">para {b.clientName}</div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[b.status]}`}>{b.status}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span>{b.date} · {b.time}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{b.address}</span>
      </div>
      {b.note && <p className="mt-2 text-xs text-muted-foreground italic">"{b.note}"</p>}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="font-semibold text-sm">{formatCLP(b.price)}</span>
        <div className="flex gap-2">
          {b.status === "pendiente" && (
            <>
              <button
                disabled={update.isPending}
                onClick={() => set("cancelada")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                <X className="size-3.5" /> Rechazar
              </button>
              <button
                disabled={update.isPending}
                onClick={() => set("confirmada")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50"
              >
                <Check className="size-3.5" /> Aceptar
              </button>
            </>
          )}
          {b.status === "confirmada" && (
            <button
              disabled={update.isPending}
              onClick={() => set("en_camino")}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50"
            >
              <Truck className="size-3.5" /> En camino
            </button>
          )}
          {b.status === "en camino" && (
            <button
              disabled={update.isPending}
              onClick={() => set("completada")}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" /> Completar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
