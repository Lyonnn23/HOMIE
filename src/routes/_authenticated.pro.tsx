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

export const Route = createFileRoute("/_authenticated/pro")({
  validateSearch: z.object({ pago: z.enum(["exito", "pendiente", "error"]).optional() }),
  head: () => ({ meta: [
    { name: "description", content: "Planes Homie Pro, prueba gratuita y estado de tu suscripción profesional." },
    { property: "og:title", content: "Homie Pro — Homie" },
    { property: "og:description", content: "Planes Homie Pro, prueba gratuita y estado de tu suscripción profesional." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Homie Pro — Homie" }] }),
  component: ProPage,
});

type PlanId = "mensual" | "anual";

const TASA_NORMAL = 0.15;
const TASA_PRO = 0.12;

function fechaCL(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function usePrestadorPro() {
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
      const { data, error } = await supabase
        .from("suscripciones_pro")
        .select("id, plan_id, monto, estado, periodo_desde, periodo_hasta, created_at")
        .eq("prestador_id", prestadorId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const BENEFICIOS: { icon: typeof Percent; title: string; sub: string }[] = [
  { icon: Percent, title: "Comisión 12% en vez de 15%", sub: "El cliente paga menos tarifa por contratarte → más reservas para ti." },
  { icon: Sparkles, title: "Destacado y primero en tu rubro", sub: "Apareces antes que el resto en búsquedas y listados de tu categoría." },
  { icon: BadgeCheck, title: "Sello PRO en tu perfil", sub: "Una insignia visible que transmite seriedad y confianza." },
  { icon: BarChart3, title: "Estadísticas de tu negocio", sub: "Ingresos, reservas, aceptación, cotizaciones ganadas y vistas del perfil." },
  { icon: FileText, title: "Comprobante PDF por servicio", sub: "Un documento imprimible por cada trabajo completado." },
  { icon: Gift, title: "30 días gratis, sin tarjeta", sub: "Prueba todo Homie Pro sin compromiso. Se activa al instante." },
];

function ProPage() {
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
    if (pago === "exito") toast.success("¡Pago recibido! Tu plan Pro se activa en unos segundos.");
    else if (pago === "pendiente") toast.info("Tu pago está pendiente. Te avisaremos cuando se confirme.");
    else toast.error("El pago no se completó. Puedes intentarlo de nuevo.");
    qc.invalidateQueries({ queryKey: ["prestador-pro"] });
    qc.invalidateQueries({ queryKey: ["suscripciones-pro"] });
    navigate({ to: "/pro", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pago]);

  const proActivo = esPro(p?.pro_hasta);
  const expirado = !!p?.pro_hasta && !proActivo;

  async function activarPrueba() {
    setActivando(true);
    try {
      const { data, error } = await supabase.rpc("activar_prueba_pro");
      if (error) throw error;
      toast.success(`¡Homie Pro activado hasta el ${fechaCL(String(data))}!`);
      qc.invalidateQueries({ queryKey: ["prestador-pro"] });
      qc.invalidateQueries({ queryKey: ["prestador-row"] });
      qc.invalidateQueries({ queryKey: ["suscripciones-pro"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo activar la prueba");
    } finally {
      setActivando(false);
    }
  }

  async function suscribir(planId: PlanId) {
    setPagando(planId);
    try {
      const { initPoint } = await createPreference({ data: { planId } });
      window.location.href = initPoint;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar el pago");
      setPagando(null);
    }
  }

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Homie Pro es para profesionales</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta sección es para cuentas de tipo prestador.</p>
          <Link to="/" className="inline-block mt-6 btn-primary">Ir al inicio</Link>
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EF9F27] text-[#111827] text-xs font-bold uppercase tracking-wide">
          <Crown className="size-3.5" /> Homie Pro
        </div>
        <h1 className="mt-4 title-1">Cobra menos comisión. Consigue más clientes.</h1>
        <p className="mt-2 text-sm text-white/75 max-w-lg">
          Con Homie Pro tus clientes pagan 12% de tarifa en vez de 15%, apareces primero en tu rubro y tienes las
          herramientas de un negocio profesional.
        </p>

        {prestadorQ.isLoading ? (
          <div className="mt-6"><Loader2 className="size-5 animate-spin text-white/70" /></div>
        ) : !p ? (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 text-sm">
            Primero completa tu perfil de profesional.{" "}
            <Link to="/onboarding-prestador" className="underline font-semibold">Completar perfil</Link>
          </div>
        ) : proActivo ? (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 flex items-center gap-3">
            <span className="inline-flex size-10 rounded-full bg-[#EF9F27] items-center justify-center shrink-0">
              <Check className="size-5 text-[#111827]" />
            </span>
            <div>
              <div className="font-bold">Pro hasta {fechaCL(p.pro_hasta!)}</div>
              <div className="text-xs text-white/70">Puedes renovar antes y los días se suman a tu plan actual.</div>
            </div>
            <Link to="/estadisticas" className="ml-auto shrink-0 px-3 py-2 rounded-xl bg-white text-[#111827] text-xs font-bold">
              Ver estadísticas
            </Link>
          </div>
        ) : !p.verificado ? (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 flex items-start gap-3">
            <ShieldAlert className="size-5 text-[#EF9F27] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">Homie Pro se activa cuando tu perfil está verificado</div>
              <p className="text-white/70 text-xs mt-1">
                Verifica tu identidad y antecedentes para desbloquear la prueba gratis y los planes Pro.
              </p>
              <Link to="/verificar-identidad" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-bold">
                Verificarme ahora
              </Link>
            </div>
          </div>
        ) : !p.pro_trial_usado ? (
          <button
            type="button" onClick={activarPrueba} disabled={activando}
            className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#EF9F27] text-[#111827] text-base font-bold hover:bg-[#E08F17] disabled:opacity-60"
          >
            {activando ? <Loader2 className="size-5 animate-spin" /> : <Gift className="size-5" />}
            Activar 30 días gratis
          </button>
        ) : (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 text-sm">
            <div className="font-semibold">{expirado ? `Tu plan Pro venció el ${fechaCL(p.pro_hasta!)}` : "Ya usaste tu prueba gratis"}</div>
            <div className="text-xs text-white/70 mt-0.5">Elige un plan abajo para {expirado ? "volver a ser" : "ser"} Pro.</div>
          </div>
        )}
      </header>

      <div className="px-5 mt-6 space-y-8 pb-10">
        {/* BENEFICIOS */}
        <section>
          <h2 className="title-3">Lo que incluye</h2>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {BENEFICIOS.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="card p-4 flex gap-3">
                <span className="inline-flex size-10 rounded-xl bg-[#FAC77540] items-center justify-center shrink-0">
                  <Icon className="size-5 text-[#854F0B]" />
                </span>
                <div>
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PLANES */}
        <section>
          <h2 className="title-3">{proActivo ? "Renueva tu plan" : "Planes"}</h2>
          <p className="text-xs text-muted-foreground mt-1">Pago único por período, a través de Mercado Pago. Sin renovación automática.</p>
          {planesQ.isLoading ? (
            <div className="mt-3"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              {mensual && (
                <PlanCard
                  nombre="Mensual" precio={mensual.precio} dias={mensual.dias} sub={`${formatCLP(mensual.precio)} cada 30 días`}
                  cta={proActivo ? "Renovar 30 días" : "Suscribirme"}
                  disabled={!p || !p.verificado || pagando !== null}
                  loading={pagando === "mensual"}
                  onClick={() => suscribir("mensual")}
                />
              )}
              {anual && (
                <PlanCard
                  destacado nombre="Anual" precio={anual.precio} dias={anual.dias}
                  sub={mensual ? `Equivale a ${formatCLP(Math.round(anual.precio / 12))} al mes` : `${anual.dias} días`}
                  badge="2 meses gratis"
                  cta={proActivo ? "Renovar 1 año" : "Suscribirme"}
                  disabled={!p || !p.verificado || pagando !== null}
                  loading={pagando === "anual"}
                  onClick={() => suscribir("anual")}
                />
              )}
            </div>
          )}
          {p && !p.verificado && (
            <p className="mt-2 text-xs text-muted-foreground">Los planes se habilitan cuando tu perfil está verificado.</p>
          )}
        </section>

        {/* CALCULADORA */}
        <Calculadora precioMensual={mensual?.precio ?? 7990} precioAnual={anual?.precio ?? 69990} />

        {/* HISTORIAL */}
        {p && (
          <section>
            <h2 className="title-3 flex items-center gap-2"><History className="size-4" /> Historial</h2>
            <div className="card mt-3 overflow-hidden">
              {susQ.isLoading ? (
                <div className="p-6 text-center"><Loader2 className="size-4 mx-auto animate-spin" /></div>
              ) : (susQ.data?.length ?? 0) === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Aún no tienes suscripciones Pro.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {susQ.data!.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {s.estado === "prueba" ? "Prueba gratis 30 días" : s.plan_id === "anual" ? "Homie Pro anual" : "Homie Pro mensual"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.periodo_desde && s.periodo_hasta
                            ? `${fechaCL(s.periodo_desde)} → ${fechaCL(s.periodo_hasta)}`
                            : fechaCL(s.created_at)}
                        </div>
                      </div>
                      <EstadoPill estado={s.estado} />
                      <div className="font-semibold whitespace-nowrap w-20 text-right">{s.monto === 0 ? "Gratis" : formatCLP(s.monto)}</div>
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
  const cls: Record<string, string> = {
    pagada: "bg-[#00C28820] text-[#00754F]",
    prueba: "bg-[#FAC77540] text-[#854F0B]",
    pendiente: "bg-[#E5E7EB] text-[#374151]",
    rechazada: "bg-[#FF3B6B20] text-[#FF3B6B]",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls[estado] ?? cls.pendiente}`}>{estado}</span>;
}

function PlanCard({
  nombre, precio, dias, sub, badge, cta, destacado, disabled, loading, onClick,
}: {
  nombre: string; precio: number; dias: number; sub: string; badge?: string; cta: string;
  destacado?: boolean; disabled: boolean; loading: boolean; onClick: () => void;
}) {
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
        <span className={`text-xs ${destacado ? "text-white/70" : "text-muted-foreground"}`}>/ {dias} días</span>
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
  const [facturacion, setFacturacion] = useState(600000);
  const r = useMemo(() => {
    const ahorroMes = Math.round(facturacion * (TASA_NORMAL - TASA_PRO));
    return {
      ahorroMes,
      netoMensual: ahorroMes - precioMensual,
      netoAnual: ahorroMes * 12 - precioAnual,
    };
  }, [facturacion, precioMensual, precioAnual]);

  return (
    <section>
      <h2 className="title-3 flex items-center gap-2"><Calculator className="size-4" /> Ahorro estimado</h2>
      <p className="text-xs text-muted-foreground mt-1">
        Con Pro, tus clientes pagan 3% menos de tarifa (12% en vez de 15%). Ese ahorro vuelve a ti en precio competitivo y más reservas.
      </p>
      <div className="card mt-3 p-4 space-y-4">
        <label className="block">
          <span className="block text-xs font-medium mb-1">¿Cuánto facturas al mes en Homie? (CLP)</span>
          <input
            type="number" min={0} step={10000} value={facturacion || ""}
            onChange={(e) => setFacturacion(Math.max(0, Number(e.target.value) || 0))}
            className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
          />
          <input
            type="range" min={0} max={3000000} step={50000} value={facturacion}
            onChange={(e) => setFacturacion(Number(e.target.value))}
            className="mt-3 w-full accent-[#EF9F27]"
            aria-label="Facturación mensual"
          />
        </label>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-[#F5F5F0]">
            <div className="text-[11px] text-muted-foreground">Ahorro en tarifa / mes</div>
            <div className="mt-1 font-bold text-[#111827]">{formatCLP(r.ahorroMes)}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F5F0]">
            <div className="text-[11px] text-muted-foreground">Neto plan mensual</div>
            <div className={`mt-1 font-bold ${r.netoMensual >= 0 ? "text-[#00754F]" : "text-[#B3123F]"}`}>
              {r.netoMensual >= 0 ? "+" : "−"}{formatCLP(Math.abs(r.netoMensual))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F5F0]">
            <div className="text-[11px] text-muted-foreground">Neto plan anual</div>
            <div className={`mt-1 font-bold ${r.netoAnual >= 0 ? "text-[#00754F]" : "text-[#B3123F]"}`}>
              {r.netoAnual >= 0 ? "+" : "−"}{formatCLP(Math.abs(r.netoAnual))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cálculo referencial: 3% de tu facturación mensual menos el valor del plan. No incluye el efecto de aparecer primero en tu rubro.
        </p>
      </div>
    </section>
  );
}
