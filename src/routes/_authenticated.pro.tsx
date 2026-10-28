import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Crown, Percent, Sparkles, BadgeCheck, BarChart3, FileText, Gift, Loader2, Check, ShieldAlert, Calculator, History,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCLP, esPro } from "@/data/services";
import { createProPreference } from "@/lib/mercadopago.functions";
import { evento } from "@/lib/analitica";
import { useT } from "@/i18n";
import { localeDe } from "@/i18n/estados";
import { useCobrosConfig, valorCobro } from "@/lib/cobros-config";

export const Route = createFileRoute("/_authenticated/pro")({
  validateSearch: z.object({ pago: z.enum(["exito", "pendiente", "error"]).optional() }),
  head: () => ({ meta: [
    { name: "description", content: "Planes Homie Premium, 3 meses gratis incluidos y estado de tu membresía profesional." },
    { property: "og:title", content: "Homie Premium — Homie" },
    { property: "og:description", content: "Planes Homie Premium, 3 meses gratis incluidos y estado de tu membresía profesional." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Homie Premium — Homie" }] }),
  component: ProPage,
});

type PlanId = "mensual" | "anual";

const DIAS_TRIAL = 90;

function fechaCL(iso: string, locale = "es-CL") {
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function usePrestadorPro() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["prestador-pro", usuario?.id],
    enabled: !!usuario?.id,
    queryFn: async () => {
      if (!usuario?.id) return null;
      const { data, error } = await supabase
        .from("prestadores")
        .select("id, verificado, pro_hasta, pro_trial_usado, nombre, comision_gratis_hasta")
        .eq("usuario_id", usuario.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function usePlanes() {
  return useQuery({
    queryKey: ["planes-pro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planes_pro").select("*").eq("activo", true).order("precio");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useSuscripciones(prestadorId: string | undefined) {
  return useQuery({
    queryKey: ["suscripciones-pro", prestadorId],
    enabled: !!prestadorId,
    queryFn: async () => {
      if (!prestadorId) return [];
      const { data, error } = await supabase
        .from("suscripciones_pro")
        .select("id, plan_id, monto, estado, periodo_desde, periodo_hasta, created_at")
        .eq("prestador_id", prestadorId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** title/sub: claves i18n "premium.*" */
const BENEFICIOS: { icon: typeof Percent; title: string; sub: string }[] = [
  { icon: Percent, title: "premium.b1", sub: "premium.b1s" },
  { icon: Sparkles, title: "premium.b2", sub: "premium.b2s" },
  { icon: BadgeCheck, title: "premium.b3", sub: "premium.b3s" },
  { icon: BarChart3, title: "premium.b4", sub: "premium.b4s" },
  { icon: FileText, title: "premium.b5", sub: "premium.b5s" },
  { icon: Gift, title: "premium.b6", sub: "premium.b6s" },
];

function ProPage() {
  const { t, idioma } = useT();
  const locale = localeDe(idioma);
  const { pago } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const prestadorQ = usePrestadorPro();
  const planesQ = usePlanes();
  const createPreference = useServerFn(createProPreference);
  const [activando, setActivando] = useState(false);
  const [pagando, setPagando] = useState<PlanId | null>(null);

  const p = prestadorQ.data;
  const susQ = useSuscripciones(p?.id);

  useEffect(() => {
    if (!pago) return;
    if (pago === "exito") toast.success(t("premium.pagoExito"));
    else if (pago === "pendiente") toast.info(t("premium.pagoPendiente"));
    else toast.error(t("premium.pagoError"));
    qc.invalidateQueries({ queryKey: ["prestador-pro"] });
    qc.invalidateQueries({ queryKey: ["suscripciones-pro"] });
    navigate({ to: "/pro", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pago]);

  const proActivo = esPro(p?.pro_hasta);
  const expirado = !!p?.pro_hasta && !proActivo;
  // Trial incluido: Premium vigente, la prueba está usada y no hay suscripción pagada activa.
  const enTrial = proActivo && !!p?.pro_trial_usado
    && !(susQ.data ?? []).some((s) => s.estado === "pagada" && s.periodo_hasta && new Date(s.periodo_hasta).getTime() > Date.now());

  async function activarPrueba() {
    setActivando(true);
    try {
      const { data, error } = await supabase.rpc("activar_prueba_pro");
      if (error) throw error;
      evento("premium_trial_activado", { hasta: String(data) });
      toast.success(t("premium.activadoHasta", { fecha: fechaCL(String(data), locale) }));
      qc.invalidateQueries({ queryKey: ["prestador-pro"] });
      qc.invalidateQueries({ queryKey: ["prestador-row"] });
      qc.invalidateQueries({ queryKey: ["suscripciones-pro"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("premium.errPrueba"));
    } finally {
      setActivando(false);
    }
  }

  async function suscribir(planId: PlanId) {
    setPagando(planId);
    try {
      const { initPoint } = await createPreference({ data: { planId } });
      evento("premium_pago_iniciado", { plan: planId });
      window.location.href = initPoint;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("premium.errPago"));
      setPagando(null);
    }
  }

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">{t("premium.soloPros")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("premium.soloProsSub")}</p>
          <Link to="/" className="inline-block mt-6 btn-primary">{t("premium.irInicio")}</Link>
        </div>
      </AppShell>
    );
  }

  const planes = planesQ.data ?? [];
  const mensual = planes.find((x) => x.id === "mensual");
  const anual = planes.find((x) => x.id === "anual");

  return (
    <AppShell>
      {/* HERO */}
      <header className="bg-[#111827] text-white px-5 pt-8 pb-8 -mt-px">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#EF9F27] to-[#F5C56B] text-[#111827] text-xs font-bold uppercase tracking-wide">
          <Crown className="size-3.5" /> Homie Premium
        </div>
        <h1 className="mt-4 title-1">{t("premium.heroTitulo")}</h1>
        <p className="mt-2 text-sm text-white/75 max-w-lg">
          {t("premium.heroSub")}
        </p>

        {prestadorQ.isLoading ? (
          <div className="mt-6"><Loader2 className="size-5 animate-spin text-white/70" /></div>
        ) : !p ? (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 text-sm">
            {t("premium.completaPerfil")}{" "}
            <Link to="/onboarding-prestador" className="underline font-semibold">{t("premium.completarPerfil")}</Link>
          </div>
        ) : proActivo ? (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 flex items-center gap-3">
            <span className="inline-flex size-10 rounded-full bg-[#EF9F27] items-center justify-center shrink-0">
              <Check className="size-5 text-[#111827]" />
            </span>
            <div>
              <div className="font-bold">{enTrial ? t("premium.incluidoHasta", { fecha: fechaCL(p.pro_hasta!, locale) }) : t("premium.premiumHasta", { fecha: fechaCL(p.pro_hasta!, locale) })}</div>
              <div className="text-xs text-white/70">
                {enTrial ? t("premium.trialSub") : t("premium.renovarSub")}
              </div>
            </div>
            <Link to="/estadisticas" className="ml-auto shrink-0 px-3 py-2 rounded-xl bg-white text-[#111827] text-xs font-bold">
              {t("premium.verEstadisticas")}
            </Link>
          </div>
        ) : !p.verificado ? (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 flex items-start gap-3">
            <ShieldAlert className="size-5 text-[#EF9F27] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">{t("premium.activaVerificado")}</div>
              <p className="text-white/70 text-xs mt-1">
                {t("premium.activaVerificadoSub")}
              </p>
              <Link to="/verificar-identidad" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-bold">
                {t("premium.verificarme")}
              </Link>
            </div>
          </div>
        ) : !p.pro_trial_usado ? (
          <button
            type="button" onClick={activarPrueba} disabled={activando}
            className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#EF9F27] text-[#111827] text-base font-bold hover:bg-[#E08F17] disabled:opacity-60"
          >
            {activando ? <Loader2 className="size-5 animate-spin" /> : <Gift className="size-5" />}
            {t("premium.activar3")}
          </button>
        ) : (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 text-sm">
            <div className="font-semibold">{expirado ? t("premium.vencio", { fecha: fechaCL(p.pro_hasta!, locale) }) : t("premium.yaUsaste")}</div>
            <div className="text-xs text-white/70 mt-0.5">{expirado ? t("premium.eligeVolver") : t("premium.eligeSer")}</div>
          </div>
        )}
      </header>

      <div className="px-5 mt-6 space-y-8 pb-10">
        {/* BENEFICIOS */}
        <section>
          <h2 className="title-3">{t("premium.loQueIncluye")}</h2>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {BENEFICIOS.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="card p-4 flex gap-3">
                <span className="inline-flex size-10 rounded-xl bg-[#FAC77540] items-center justify-center shrink-0">
                  <Icon className="size-5 text-[#854F0B]" />
                </span>
                <div>
                  <div className="font-semibold text-sm">{t(title)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t(sub)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PLANES */}
        <section>
          <h2 className="title-3">{proActivo ? t("premium.renuevaPlan") : t("premium.planes")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("premium.planesSub")}</p>
          {planesQ.isLoading ? (
            <div className="mt-3"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              {mensual && (
                <PlanCard
                  nombre={t("premium.mensual")} precio={mensual.precio} dias={mensual.dias} sub={t("premium.cada30", { monto: formatCLP(mensual.precio) })}
                  cta={proActivo ? t("premium.renovar30") : t("premium.suscribirme")}
                  disabled={!p || !p.verificado || pagando !== null}
                  loading={pagando === "mensual"}
                  onClick={() => suscribir("mensual")}
                />
              )}
              {anual && (
                <PlanCard
                  destacado nombre={t("premium.anual")} precio={anual.precio} dias={anual.dias}
                  sub={mensual ? t("premium.equivaleMes", { monto: formatCLP(Math.round(anual.precio / 12)) }) : t("premium.nDias", { n: anual.dias })}
                  badge={t("premium.dosMesesGratis")}
                  cta={proActivo ? t("premium.renovar1Anio") : t("premium.suscribirme")}
                  disabled={!p || !p.verificado || pagando !== null}
                  loading={pagando === "anual"}
                  onClick={() => suscribir("anual")}
                />
              )}
            </div>
          )}
          {p && !p.verificado && (
            <p className="mt-2 text-xs text-muted-foreground">{t("premium.planesVerificado")}</p>
          )}
        </section>

        {/* CALCULADORA */}
        <Calculadora precioMensual={mensual?.precio ?? 7990} precioAnual={anual?.precio ?? 69990} />

        {/* HISTORIAL */}
        {p && (
          <section>
            <h2 className="title-3 flex items-center gap-2"><History className="size-4" /> {t("premium.historial")}</h2>
            <div className="card mt-3 overflow-hidden">
              {susQ.isLoading ? (
                <div className="p-6 text-center"><Loader2 className="size-4 mx-auto animate-spin" /></div>
              ) : (susQ.data?.length ?? 0) === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t("premium.sinSuscripciones")}</div>
              ) : (
                <ul className="divide-y divide-border">
                  {susQ.data!.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {s.estado === "prueba" ? t("premium.gratisDias", { n: s.periodo_desde && s.periodo_hasta ? Math.round((new Date(s.periodo_hasta).getTime() - new Date(s.periodo_desde).getTime()) / 86400000) : DIAS_TRIAL }) : s.plan_id === "anual" ? t("premium.anualNombre") : t("premium.mensualNombre")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.periodo_desde && s.periodo_hasta
                            ? `${fechaCL(s.periodo_desde, locale)} → ${fechaCL(s.periodo_hasta, locale)}`
                            : fechaCL(s.created_at, locale)}
                        </div>
                      </div>
                      <EstadoPill estado={s.estado} />
                      <div className="font-semibold whitespace-nowrap w-20 text-right">{s.monto === 0 ? t("premium.gratis") : formatCLP(s.monto)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  const { t } = useT();
  const cls: Record<string, string> = {
    pagada: "bg-[#00C28820] text-[#00754F]",
    prueba: "bg-[#FAC77540] text-[#854F0B]",
    pendiente: "bg-[#E5E7EB] text-[#374151]",
    rechazada: "bg-[#FF3B6B20] text-[#FF3B6B]",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls[estado] ?? cls.pendiente}`}>{cls[estado] ? t(`premium.e.${estado}`) : estado}</span>;
}

function PlanCard({
  nombre, precio, dias, sub, badge, cta, destacado, disabled, loading, onClick,
}: {
  nombre: string; precio: number; dias: number; sub: string; badge?: string; cta: string;
  destacado?: boolean; disabled: boolean; loading: boolean; onClick: () => void;
}) {
  const { t } = useT();
  return (
    <div className={`relative rounded-2xl p-5 border ${destacado ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-border"}`}>
      {badge && (
        <span className="absolute -top-3 left-5 px-2.5 py-1 rounded-full bg-[#EF9F27] text-[#111827] text-[11px] font-bold uppercase tracking-wide">
          {badge}
        </span>
      )}
      <div className={`text-xs font-semibold uppercase tracking-wide ${destacado ? "text-white/70" : "text-muted-foreground"}`}>{nombre}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold tracking-tight">{formatCLP(precio)}</span>
        <span className={`text-xs ${destacado ? "text-white/70" : "text-muted-foreground"}`}>{t("premium.porDias", { n: dias })}</span>
      </div>
      <div className={`text-xs mt-1 ${destacado ? "text-white/70" : "text-muted-foreground"}`}>{sub}</div>
      <button
        type="button" onClick={onClick} disabled={disabled}
        className={`mt-4 w-full h-11 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 ${
          destacado ? "bg-[#EF9F27] text-[#111827] hover:bg-[#E08F17]" : "bg-[#111827] text-white hover:bg-[#1F2937]"
        }`}
      >
        {loading && <Loader2 className="size-4 animate-spin" />} {cta}
      </button>
    </div>
  );
}

function Calculadora({ precioMensual, precioAnual }: { precioMensual: number; precioAnual: number }) {
  const { t } = useT();
  const configQ = useCobrosConfig();
  const tasaNormal = valorCobro(configQ.data, "comision_normal", 0.15);
  const tasaPremium = valorCobro(configQ.data, "comision_premium", 0.12);
  const [facturacion, setFacturacion] = useState(600000);
  const r = useMemo(() => {
    const ahorroMes = Math.round(facturacion * (tasaNormal - tasaPremium));
    return {
      ahorroMes,
      netoMensual: ahorroMes - precioMensual,
      netoAnual: ahorroMes * 12 - precioAnual,
    };
  }, [facturacion, precioMensual, precioAnual, tasaNormal, tasaPremium]);

  return (
    <section>
      <h2 className="title-3 flex items-center gap-2"><Calculator className="size-4" /> {t("premium.ahorroEstimado")}</h2>
      <p className="text-xs text-muted-foreground mt-1">
        {t("premium.ahorroSub")}
      </p>
      <div className="card mt-3 p-4 space-y-4">
        <label className="block">
          <span className="block text-xs font-medium mb-1">{t("premium.cuantoFacturas")}</span>
          <input
            type="number" min={0} step={10000} value={facturacion || ""}
            onChange={(e) => setFacturacion(Math.max(0, Number(e.target.value) || 0))}
            className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
          />
          <input
            type="range" min={0} max={3000000} step={50000} value={facturacion}
            onChange={(e) => setFacturacion(Number(e.target.value))}
            className="mt-3 w-full accent-[#EF9F27]"
            aria-label={t("premium.facturacionMensual")}
          />
        </label>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-[#F5F5F0]">
            <div className="text-[11px] text-muted-foreground">{t("premium.ahorroMes")}</div>
            <div className="mt-1 font-bold text-[#111827]">{formatCLP(r.ahorroMes)}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F5F0]">
            <div className="text-[11px] text-muted-foreground">{t("premium.netoMensual")}</div>
            <div className={`mt-1 font-bold ${r.netoMensual >= 0 ? "text-[#00754F]" : "text-[#B3123F]"}`}>
              {r.netoMensual >= 0 ? "+" : "−"}{formatCLP(Math.abs(r.netoMensual))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F5F0]">
            <div className="text-[11px] text-muted-foreground">{t("premium.netoAnual")}</div>
            <div className={`mt-1 font-bold ${r.netoAnual >= 0 ? "text-[#00754F]" : "text-[#B3123F]"}`}>
              {r.netoAnual >= 0 ? "+" : "−"}{formatCLP(Math.abs(r.netoAnual))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("premium.calculoRef")}
        </p>
      </div>
    </section>
  );
}
