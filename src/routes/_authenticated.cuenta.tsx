import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Bell, CreditCard, HelpCircle, MapPin, Shield, LogOut, Heart, Scale, Accessibility, ShieldCheck, MessageSquareQuote } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBookings } from "@/store/bookings";
import { useFavoritos } from "@/hooks/use-favoritos";
import { useAuth } from "@/hooks/use-auth";
import { useAccesibilidad } from "@/hooks/use-accesibilidad";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta — Homie" }] }),
  component: Cuenta,
});

function Cuenta() {
  const bookings = useBookings();
  const favs = useFavoritos();
  const { usuario, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { modoFacil, setModoFacil } = useAccesibilidad();

  const isAdminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .in("role", ["admin", "superadmin"]);
      return (data ?? []).length > 0;
    },
  });
  const completed = bookings.filter((b) => b.status === "completado").length;
  const initials = (usuario?.nombre ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const items: Array<{ icon: typeof Bell; label: string; to?: string; badge?: string }> = [
    usuario?.tipo === "prestador"
      ? { icon: MessageSquareQuote, label: "Cotizar solicitudes", to: "/cotizar" }
      : { icon: MessageSquareQuote, label: "Mis solicitudes de cotización", to: "/solicitudes" },
    { icon: MapPin, label: "Direcciones guardadas", to: "/direcciones" },
    { icon: CreditCard, label: "Métodos de pago", badge: "Próximamente" },
    { icon: Heart, label: "Mis favoritos", to: "/favoritos", badge: favs.length ? String(favs.length) : undefined },
    { icon: Bell, label: "Notificaciones", to: "/notif-config" },
    { icon: Shield, label: "Privacidad y seguridad", to: "/seguridad" },
    { icon: HelpCircle, label: "Ayuda y soporte", to: "/ayuda" },
    { icon: Scale, label: "Reclamos y sugerencias", to: "/reclamos" },
  ];

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Mi cuenta</h1>
      </header>

      <section className="px-5">
        <div className="p-5 rounded-3xl bg-white border border-border flex items-center gap-4">
          {usuario?.foto_url ? (
            <img src={usuario.foto_url} alt="" className="size-16 rounded-full object-cover" />
          ) : (
            <div className="size-16 rounded-full bg-foreground text-background flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{usuario?.nombre ?? "Mi perfil"}</div>
            <div className="text-sm text-muted-foreground truncate">{usuario?.email}</div>
            <div className="mt-1 inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {usuario?.tipo === "prestador" ? "Prestador" : "Cliente"}
            </div>
          </div>
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
          {items.map((it) => {
            const content = (
              <>
                <it.icon className="size-4 text-[#EF9F27]" />
                <span className="flex-1 text-sm">{it.label}</span>
                {it.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-[#F5F5F0] text-[10px] font-bold text-[#111827]">
                    {it.badge}
                  </span>
                )}
                {it.to && <ChevronRight className="size-4 text-muted-foreground" />}
              </>
            );
            if (it.to) {
              return (
                <Link
                  key={it.label}
                  to={it.to}
                  className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/40 transition"
                >
                  {content}
                </Link>
              );
            }
            return (
              <div
                key={it.label}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-left opacity-60"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Accesibilidad</h2>
        <div className="rounded-2xl bg-white border border-border overflow-hidden">
          <button
            type="button"
            role="switch"
            aria-checked={modoFacil}
            aria-pressed={modoFacil}
            onClick={() => setModoFacil(!modoFacil)}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/40 transition"
          >
            <Accessibility className="size-4 text-[#EF9F27]" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm">Accesibilidad: Modo fácil</span>
              <span className="block text-xs text-muted-foreground">Letras grandes, más contraste, sin animaciones</span>
            </span>
            <span
              aria-hidden="true"
              className={`shrink-0 relative w-12 h-7 rounded-full transition-colors ${modoFacil ? "bg-[#EF9F27]" : "bg-[#D1D5DB]"}`}
            >
              <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${modoFacil ? "left-6" : "left-1"}`} />
            </span>
          </button>
        </div>
      </section>

      {isAdminQ.data && (
        <section className="px-5 mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Administración</h2>
          <div className="rounded-2xl bg-white border border-border divide-y divide-border overflow-hidden">
            {[
              { label: "Reportes", to: "/admin/reportes" as const },
              { label: "Verificaciones", to: "/admin/verificaciones" as const },
              { label: "Reclamos", to: "/admin/reclamos" as const },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/40 transition">
                <ShieldCheck className="size-4 text-[#EF9F27]" />
                <span className="flex-1 text-sm">{a.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-6">
        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-white border border-border text-sm text-destructive font-medium"
        >
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
