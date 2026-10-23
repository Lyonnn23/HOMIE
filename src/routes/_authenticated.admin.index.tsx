import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, BadgeCheck, BarChart3, CalendarDays, ChevronRight, ClipboardList, Flag, LifeBuoy, Loader2, ShieldCheck, Ticket, Users, Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [
    { name: "description", content: "Resumen de reservas, ingresos y pendientes de administración en Homie." },
    { property: "og:title", content: "Panel de administración — Homie" },
    { property: "og:description", content: "Resumen de reservas, ingresos y pendientes de administración en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Panel de administración — Homie" }] }),
  component: AdminHome,
});

const LINKS = [
  { label: "Verificaciones", desc: "Revisar identidad y antecedentes", to: "/admin/verificaciones" as const, icon: BadgeCheck },
  { label: "Reservas", desc: "Todas las reservas de la plataforma", to: "/admin/reservas" as const, icon: CalendarDays },
  { label: "Liquidaciones", desc: "Pagos semanales a profesionales", to: "/admin/liquidaciones" as const, icon: Wallet },
  { label: "Profesionales", desc: "Buscar, suspender y reactivar", to: "/admin/prestadores" as const, icon: Users },
  { label: "Reclamos", desc: "Disputas y reembolsos", to: "/admin/reclamos" as const, icon: AlertTriangle },
  { label: "Reportes", desc: "Reportes de conducta", to: "/admin/reportes" as const, icon: Flag },
  { label: "Soporte", desc: "Conversaciones con usuarios", to: "/admin/soporte" as const, icon: LifeBuoy },
  { label: "Métricas", desc: "Embudo de registros y reservas", to: "/admin/metricas" as const, icon: BarChart3 },
  { label: "Cupones", desc: "Descuentos y campañas", to: "/admin/cupones" as const, icon: Ticket },
];

function AdminHome() {
  const { user } = useAuth();

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

  const resumenQ = useQuery({
    queryKey: ["admin-resumen"],
    enabled: isAdminQ.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_resumen");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (isAdminQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  }
  if (!isAdminQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta sección es solo para administradores.</p>
          <Link to="/" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-[#111827] text-white text-sm font-semibold">Ir al inicio</Link>
        </div>
      </div>
    );
  }

  const r = resumenQ.data;
  const kpis: { label: string; value: string; accent?: string; to?: (typeof LINKS)[number]["to"] }[] = r
    ? [
        { label: "Reservas hoy", value: String(r.reservas_hoy), to: "/admin/reservas" },
        { label: "Pendientes de confirmar", value: String(r.reservas_pendientes), accent: r.reservas_pendientes > 0 ? "#EF9F27" : undefined, to: "/admin/reservas" },
        { label: "Reservas del mes", value: String(r.reservas_mes) },
        { label: "Ingresos del mes", value: formatCLP(r.ingresos_mes) },
        { label: "Comisión Homie del mes", value: formatCLP(r.comision_mes), accent: "#00754F" },
        { label: "Por liquidar", value: formatCLP(r.por_liquidar), accent: r.por_liquidar > 0 ? "#0E7490" : undefined, to: "/admin/liquidaciones" },
        { label: "Verificaciones pendientes", value: String(r.verificaciones_pendientes), accent: r.verificaciones_pendientes > 0 ? "#EF9F27" : undefined, to: "/admin/verificaciones" },
        { label: "Reclamos abiertos", value: String(r.reclamos_abiertos), accent: r.reclamos_abiertos > 0 ? "#FF3B6B" : undefined, to: "/admin/reclamos" },
        { label: "Profesionales verificados", value: String(r.prestadores_verificados), to: "/admin/prestadores" },
        { label: "Clientes", value: String(r.clientes) },
      ]
    : [];

  return (
    <AppShell>
      <div className="px-5 py-6 max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="title-2 flex items-center gap-2"><ShieldCheck className="size-6 text-[#EF9F27]" /> Panel de administración</h1>
          <p className="lead mt-1">Resumen operativo de Homie y accesos a cada herramienta.</p>
        </header>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Indicadores</h2>
          {resumenQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
          {resumenQ.error && (
            <div className="card p-4 text-sm text-[#FF3B6B]">No se pudo cargar el resumen: {(resumenQ.error as Error).message}</div>
          )}
          {r && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {kpis.map((k) => {
                const inner = (
                  <>
                    <div className="text-xl font-bold tracking-tight" style={k.accent ? { color: k.accent } : undefined}>{k.value}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-snug">{k.label}</div>
                  </>
                );
                return k.to ? (
                  <Link key={k.label} to={k.to} className="card card-link p-4 block">{inner}</Link>
                ) : (
                  <div key={k.label} className="card p-4">{inner}</div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Herramientas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="card card-link p-4 flex items-center gap-3">
                <span className="size-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0">
                  <l.icon className="size-5 text-[#111827]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm text-[#111827]">{l.label}</span>
                  <span className="block text-xs text-muted-foreground truncate">{l.desc}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="size-3.5" /> Los montos corresponden a pagos confirmados en Mercado Pago durante el mes en curso.
        </p>
      </div>
    </AppShell>
  );
}
