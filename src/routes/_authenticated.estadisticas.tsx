import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  CheckCircle2, DollarSign, CalendarDays, CalendarCheck, ThumbsUp, Star, MessageSquareQuote, Eye, Crown, Loader2, Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCLP, esPro } from "@/data/services";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/estadisticas")({
  head: () => ({ meta: [
    { name: "description", content: "Estadísticas de reservas, ingresos y cotizaciones de tu perfil profesional en Homie." },
    { property: "og:title", content: "Estadísticas — Homie" },
    { property: "og:description", content: "Estadísticas de reservas, ingresos y cotizaciones de tu perfil profesional en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Estadísticas — Homie" }] }),
  component: EstadisticasPage,
});

const MESES = ["stats.m1", "stats.m2", "stats.m3", "stats.m4", "stats.m5", "stats.m6", "stats.m7", "stats.m8", "stats.m9", "stats.m10", "stats.m11", "stats.m12"];

function usePrestadorMin() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["prestador-pro", usuario?.id],
    enabled: !!usuario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestadores")
        .select("id, verificado, pro_hasta, pro_trial_usado, nombre")
        .eq("usuario_id", usuario!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useStats(prestadorId: string | undefined) {
  return useQuery({
    queryKey: ["stats-prestador", prestadorId],
    enabled: !!prestadorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("stats_prestador", { _prestador_id: prestadorId! });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

function useReservasUltimos6Meses(prestadorId: string | undefined) {
  return useQuery({
    queryKey: ["reservas-6m", prestadorId],
    enabled: !!prestadorId,
    queryFn: async () => {
      const desde = new Date();
      desde.setDate(1); desde.setHours(0, 0, 0, 0);
      desde.setMonth(desde.getMonth() - 5);
      const { data, error } = await supabase
        .from("reservas")
        .select("id, fecha, estado, total")
        .eq("prestador_id", prestadorId!)
        .gte("fecha", desde.toISOString().slice(0, 10))
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function EstadisticasPage() {
  const { t } = useT();
  const { usuario } = useAuth();
  const prestadorQ = usePrestadorMin();
  const p = prestadorQ.data;
  const statsQ = useStats(p?.id);
  const reservasQ = useReservasUltimos6Meses(p?.id);
  const pro = esPro(p?.pro_hasta);

  const meses = useMemo(() => {
    const now = new Date();
    const out: { key: string; label: string; total: number; completadas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: t(MESES[d.getMonth()]), total: 0, completadas: 0 });
    }
    for (const r of reservasQ.data ?? []) {
      const k = String(r.fecha).slice(0, 7);
      const m = out.find((x) => x.key === k);
      if (!m) continue;
      m.total += 1;
      if (r.estado === "completada") m.completadas += 1;
    }
    return out;
  }, [reservasQ.data, t]);
  const maxMes = Math.max(1, ...meses.map((m) => m.total));

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">{t("stats.soloPros")}</h1>
          <Link to="/" className="inline-block mt-6 btn-primary">{t("stats.irInicio")}</Link>
        </div>
      </AppShell>
    );
  }

  if (prestadorQ.isLoading) {
    return <AppShell><div className="py-16 text-center"><Loader2 className="size-5 mx-auto animate-spin text-muted-foreground" /></div></AppShell>;
  }
  if (!p) {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">{t("stats.completaPerfil")}</h1>
          <Link to="/onboarding-prestador" className="inline-block mt-6 btn-primary">{t("stats.completarPerfil")}</Link>
        </div>
      </AppShell>
    );
  }

  const s = statsQ.data;
  const tasaCot = s && s.cotizaciones_enviadas > 0 ? Math.round((100 * s.cotizaciones_ganadas) / s.cotizaciones_enviadas) : null;

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-8 pb-6 -mt-px">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="title-1">{t("stats.titulo")}</h1>
            <p className="text-sm text-white/70 mt-1">{t("stats.sub")}</p>
          </div>
          {pro ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EF9F27] text-[#111827] text-xs font-bold"><Crown className="size-3.5" /> {t("stats.premium")}</span>
          ) : (
            <Link to="/pro" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-bold">
              <Crown className="size-3.5" /> {t("stats.hazte")}
            </Link>
          )}
        </div>
      </header>

      <div className="px-5 mt-5 pb-10 relative">
        {!pro && (
          <div className="absolute inset-x-5 top-0 z-10 flex justify-center pt-24 pointer-events-none">
            <div className="pointer-events-auto card p-5 max-w-sm text-center shadow-float">
              <span className="inline-flex size-12 rounded-full bg-[#FAC77540] items-center justify-center">
                <Lock className="size-6 text-[#854F0B]" />
              </span>
              <h2 className="mt-3 font-bold text-lg">{t("stats.lockTitulo")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("stats.lockSub")}
              </p>
              <Link to="/pro" className="btn-primary mt-4 w-full">
                {p.pro_trial_usado ? t("stats.verPlanes") : t("stats.activar3")}
              </Link>
            </div>
          </div>
        )}

        <div className={!pro ? "blur-sm select-none pointer-events-none opacity-80" : ""} aria-hidden={!pro}>
          {statsQ.isLoading ? (
            <div className="py-16 text-center"><Loader2 className="size-5 mx-auto animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Tile icon={CheckCircle2} label={t("stats.serviciosCompletados")} value={String(s?.servicios_completados ?? 0)} />
                <Tile icon={DollarSign} label={t("stats.ingresosTotales")} value={formatCLP(s?.ingresos_total ?? 0)} dark />
                <Tile icon={CalendarDays} label={t("stats.ingresosMes")} value={formatCLP(s?.ingresos_mes ?? 0)} dark />
                <Tile icon={CalendarCheck} label={t("stats.reservasMes")} value={String(s?.reservas_mes ?? 0)} />
                <Tile icon={ThumbsUp} label={t("stats.tasaAceptacion")} value={s?.tasa_aceptacion != null ? `${Math.round(Number(s.tasa_aceptacion))}%` : "—"} sub={t("stats.noRechazadas")} />
                <Tile icon={Star} label={t("stats.calificacion")} value={s ? Number(s.calificacion).toFixed(1) : "—"} sub={t("stats.resenas", { n: s?.resenas ?? 0 })} />
                <Tile icon={MessageSquareQuote} label={t("stats.cotizaciones")} value={`${s?.cotizaciones_ganadas ?? 0} / ${s?.cotizaciones_enviadas ?? 0}`} sub={tasaCot != null ? t("stats.ganadasPct", { n: tasaCot }) : t("stats.ganadasEnviadas")} />
                <Tile icon={Eye} label={t("stats.vistasPerfil")} value={String(s?.vistas_perfil ?? 0)} />
              </div>

              <section className="mt-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("stats.ultimos6")}</h2>
                <div className="card p-4">
                  <div className="flex items-end gap-2 h-40">
                    {meses.map((m) => {
                      const hTotal = Math.round((m.total / maxMes) * 100);
                      const hComp = Math.round((m.completadas / maxMes) * 100);
                      return (
                        <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                          <span className="text-[11px] font-semibold text-[#111827]">{m.total}</span>
                          <div className="w-full relative flex-1 flex items-end">
                            <div className="w-full rounded-t-lg bg-[#E5E7EB]" style={{ height: `${hTotal}%` }} title={t("stats.nReservas", { n: m.total })} />
                            <div className="absolute bottom-0 w-full rounded-t-lg bg-[#EF9F27]" style={{ height: `${hComp}%` }} title={t("stats.nCompletadas", { n: m.completadas })} />
                          </div>
                          <span className="text-[11px] text-muted-foreground uppercase">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#EF9F27]" /> {t("stats.completadas")}</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#E5E7EB]" /> {t("stats.todas")}</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {pro && (
          <p className="mt-6 text-xs text-muted-foreground">
            {t("stats.nota")}
          </p>
        )}
      </div>
    </AppShell>
  );
}

function Tile({ icon: Icon, label, value, sub, dark }: { icon: typeof Star; label: string; value: string; sub?: string; dark?: boolean }) {
  return (
    <div className="p-4 rounded-2xl bg-[#F5F5F0] border border-border">
      <div className="inline-flex size-9 items-center justify-center rounded-xl bg-white">
        <Icon className="size-4 text-[#EF9F27]" />
      </div>
      <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-0.5 truncate ${dark ? "text-[#111827]" : "text-[#EF9F27]"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
