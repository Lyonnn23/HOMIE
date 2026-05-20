import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Bell, CreditCard, HelpCircle, MapPin, Shield, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBookings } from "@/store/bookings";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta — Manitos" }] }),
  component: Cuenta,
});

function Cuenta() {
  const bookings = useBookings();
  const completed = bookings.filter((b) => b.status === "completado").length;

  const items = [
    { icon: MapPin, label: "Direcciones guardadas" },
    { icon: CreditCard, label: "Métodos de pago" },
    { icon: Bell, label: "Notificaciones" },
    { icon: Shield, label: "Privacidad y seguridad" },
    { icon: HelpCircle, label: "Ayuda y soporte" },
  ];

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Mi cuenta</h1>
      </header>

      <section className="px-5">
        <div className="p-5 rounded-3xl bg-white border border-border flex items-center gap-4">
          <div className="size-16 rounded-full bg-foreground text-background flex items-center justify-center text-xl font-bold">
            MR
          </div>
          <div className="flex-1">
            <div className="font-semibold">María Rodríguez</div>
            <div className="text-sm text-muted-foreground">maria@email.cl</div>
          </div>
          <button className="text-sm font-medium underline underline-offset-4">Editar</button>
        </div>
      </section>

      <section className="px-5 mt-4 grid grid-cols-3 gap-2">
        <Stat label="Reservas" value={bookings.length} />
        <Stat label="Completadas" value={completed} />
        <Stat label="Activas" value={bookings.length - completed} />
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Historial</h2>
        {bookings.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            Aún no tienes servicios contratados.
            <Link to="/" className="block mt-2 text-foreground font-medium underline">Buscar servicios</Link>
          </div>
        ) : (
          <Link to="/reservas" className="flex items-center justify-between p-4 rounded-2xl bg-white border border-border">
            <span className="text-sm">Ver mis reservas ({bookings.length})</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        )}
      </section>

      <section className="px-5 mt-6">
        <div className="rounded-2xl bg-white border border-border divide-y divide-border overflow-hidden">
          {items.map((it) => (
            <button key={it.label} className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/40 transition">
              <it.icon className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{it.label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <button className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-white border border-border text-sm text-destructive font-medium">
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-border text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
