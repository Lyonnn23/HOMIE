import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/admin/metricas")({
  head: () => ({ meta: [
    { name: "description", content: "Embudo de conversión y series diarias de Homie." },
    { property: "og:title", content: "Métricas — Admin Homie" },
    { property: "og:description", content: "Embudo de conversión y series diarias de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Métricas — Admin Homie" }] }),
  component: AdminMetricas,
});

type Dias = 7 | 30 | 90;

interface Embudo {
  registros: number; clientes: number; prestadores_registrados: number; prestadores_con_perfil: number; prestadores_verificados: number;
  reservas_creadas: number; reservas_pagadas: number; reservas_completadas: number; reservas_canceladas: number;
  solicitudes: number; cotizaciones: number; urgencias: number; urgencias_asignadas: number;
  ingresos: number; comisiones: number; ticket_promedio: number; pro_activos: number;
}
interface Punto { dia: string; registros: number; reservas: number; pagos: number; ingresos: number }

function pct(n: number, d: number) {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function AdminMetricas() {
  const { user } = useAuth();
  const [dias, setDias] = useState<Dias>(30);

  const isAdminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).in("role", ["admin", "superadmin"]);
      return (data ?? []).length > 0;
    },
  });

  const embudoQ = useQuery({
    queryKey: ["admin-embudo", dias],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<Embudo | null> => {
      const { data, error } = await supabase.rpc("admin_embudo", { _dias: dias });
      if (error) throw error;
      return (data?.[0] as Embudo | undefined) ?? null;
    },
  });

  const serieQ = useQuery({
    queryKey: ["admin-serie", dias],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<Punto[]> => {
      const { data, error } = await supabase.rpc("admin_serie_diaria", { _dias: dias });
      if (error) throw error;
      return (data ?? []) as Punto[];
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

  const e = embudoQ.data;
  const serie = serieQ.data ?? [];

  const tiles: { label: string; value: string; accent?: string }[] = e
    ? [
        { label: "Registros", value: String(e.registros) },
        { label: "Clientes nuevos", value: String(e.clientes) },
        { label: "Profesionales nuevos", value: String(e.prestadores_registrados) },
        { label: "Reservas creadas", value: String(e.reservas_creadas) },
        { label: "Reservas pagadas", value: String(e.reservas_pagadas), accent: "#0E7490" },
        { label: "Completadas", value: String(e.reservas_completadas), accent: "#00754F" },
        { label: "Canceladas", value: String(e.reservas_canceladas), accent: e.reservas_canceladas > 0 ? "#FF3B6B" : undefined },
        { label: "Ingresos", value: formatCLP(e.ingresos) },
        { label: "Comisión Homie", value: formatCLP(e.comisiones), accent: "#00754F" },
        { label: "Ticket promedio", value: formatCLP(e.ticket_promedio) },
        { label: "Solicitudes / cotizaciones", value: `${e.solicitudes} / ${e.cotizaciones}` },
        { label: "Urgencias asignadas", value: `${e.urgencias_asignadas} / ${e.urgencias}` },
        { label: "PRO activos", value: String(e.pro_activos), accent: "#EF9F27" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-[#111827] text-white px-5 py-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"><ArrowLeft className="size-3.5" /> Panel</Link>
        <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="size-6 text-[#EF9F27]" /> Métricas de embudo</h1>
            <p className="text-sm text-white/70 mt-1">Conversión de registros y reservas en el período.</p>
          </div>
          <div className="flex gap-1 bg-white/10 rounded-xl p-1" role="tablist" aria-label="Período">
            {([7, 30, 90] as Dias[]).map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={dias === d}
                onClick={() => setDias(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${dias === d ? "bg-[#EF9F27] text-[#111827]" : "text-white/80 hover:text-white"}`}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-5xl mx-auto space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Indicadores · últimos {dias} días</h2>
          {embudoQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
          {embudoQ.error && <div className="card p-4 text-sm text-[#FF3B6B]">No se pudo cargar: {(embudoQ.error as Error).message}</div>}
          {e && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tiles.map((t) => (
                <div key={t.label} className="card p-4">
                  <div className="text-xl font-bold tracking-tight" style={t.accent ? { color: t.accent } : undefined}>{t.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-snug">{t.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {e && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Funnel
              titulo="Profesionales"
              pasos={[
                { label: "Registros (profesional)", n: e.prestadores_registrados },
                { label: "Con perfil creado", n: e.prestadores_con_perfil },
                { label: "Verificados", n: e.prestadores_verificados },
              ]}
            />
            <Funnel
              titulo="Reservas"
              pasos={[
                { label: "Creadas", n: e.reservas_creadas },
                { label: "Pagadas", n: e.reservas_pagadas },
                { label: "Completadas", n: e.reservas_completadas },
              ]}
            />
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Serie diaria</h2>
          {serieQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
          {serieQ.error && <div className="card p-4 text-sm text-[#FF3B6B]">No se pudo cargar: {(serieQ.error as Error).message}</div>}
          {serie.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Chart titulo="Registros por día" color="#111827" puntos={serie.map((p) => ({ x: p.dia, y: p.registros }))} tipo="bar" />
              <Chart titulo="Reservas por día" color="#0E7490" puntos={serie.map((p) => ({ x: p.dia, y: p.reservas }))} tipo="bar" />
              <Chart titulo="Ingresos por día (CLP)" color="#EF9F27" puntos={serie.map((p) => ({ x: p.dia, y: p.ingresos }))} tipo="line" fmt={formatCLP} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Funnel({ titulo, pasos }: { titulo: string; pasos: { label: string; n: number }[] }) {
  const max = Math.max(1, ...pasos.map((p) => p.n));
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm mb-3">{titulo}</h3>
      <div className="space-y-3">
        {pasos.map((p, i) => {
          const prev = i > 0 ? pasos[i - 1].n : null;
          const w = Math.max(4, Math.round((p.n / max) * 100));
          return (
            <div key={p.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#374151]">{p.label}</span>
                <span className="font-semibold text-[#111827]">
                  {p.n}
                  {prev !== null && <span className="ml-2 text-muted-foreground font-normal">{pct(p.n, prev)} del paso anterior</span>}
                </span>
              </div>
              <div className="h-6 rounded-lg bg-[#F3F4F6] overflow-hidden">
                <div className="h-full rounded-lg bg-[#111827]" style={{ width: `${w}%`, opacity: 1 - i * 0.25 }} />
              </div>
            </div>
          );
        })}
        {pasos.length > 1 && (
          <p className="text-[11px] text-muted-foreground pt-1">
            Conversión total: <span className="font-semibold text-[#111827]">{pct(pasos[pasos.length - 1].n, pasos[0].n)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Chart({
  titulo, puntos, color, tipo, fmt = (n) => String(n),
}: { titulo: string; puntos: { x: string; y: number }[]; color: string; tipo: "bar" | "line"; fmt?: (n: number) => string }) {
  const W = 320, H = 140, padL = 8, padR = 8, padT = 10, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...puntos.map((p) => p.y));
  const n = puntos.length;
  const total = puntos.reduce((a, p) => a + p.y, 0);
  const [hover, setHover] = useState<number | null>(null);

  const xOf = (i: number) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yOf = (v: number) => padT + innerH - (v / max) * innerH;
  const barW = Math.max(2, innerW / n - 2);

  const etiqueta = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
  };
  const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm">{titulo}</h3>
        <span className="text-xs text-muted-foreground">Total: <span className="font-semibold text-[#111827]">{fmt(total)}</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${titulo}, total ${fmt(total)}`} onMouseLeave={() => setHover(null)}>
        {/* línea base y de máximo */}
        <line x1={padL} x2={W - padR} y1={yOf(0)} y2={yOf(0)} stroke="#E5E7EB" strokeWidth={1} />
        <line x1={padL} x2={W - padR} y1={yOf(max)} y2={yOf(max)} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="3 3" />
        <text x={padL} y={yOf(max) - 2} fontSize={9} fill="#9CA3AF">{fmt(max)}</text>

        {tipo === "bar"
          ? puntos.map((p, i) => {
              const x = padL + (i / n) * innerW + 1;
              const y = yOf(p.y);
              return (
                <rect
                  key={p.x}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(0, yOf(0) - y)}
                  rx={1.5}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  onMouseEnter={() => setHover(i)}
                />
              );
            })
          : (
            <>
              <polyline
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={puntos.map((p, i) => `${xOf(i)},${yOf(p.y)}`).join(" ")}
              />
              <polygon
                fill={color}
                opacity={0.12}
                points={`${xOf(0)},${yOf(0)} ${puntos.map((p, i) => `${xOf(i)},${yOf(p.y)}`).join(" ")} ${xOf(n - 1)},${yOf(0)}`}
              />
              {puntos.map((p, i) => (
                <circle
                  key={p.x}
                  cx={xOf(i)}
                  cy={yOf(p.y)}
                  r={hover === i ? 4 : 2}
                  fill={color}
                  onMouseEnter={() => setHover(i)}
                />
              ))}
              {/* zonas invisibles para hover */}
              {puntos.map((p, i) => (
                <rect key={`h-${p.x}`} x={padL + (i / n) * innerW} y={padT} width={innerW / n} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              ))}
            </>
          )}

        {ticks.map((i) => (
          <text key={i} x={tipo === "bar" ? padL + (i / n) * innerW + barW / 2 : xOf(i)} y={H - 6} fontSize={9} fill="#6B7280" textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
            {etiqueta(puntos[i].x)}
          </text>
        ))}

        {hover !== null && puntos[hover] && (
          <g>
            <rect x={Math.min(W - 110, Math.max(2, xOf(hover) - 50))} y={2} width={108} height={18} rx={4} fill="#111827" />
            <text x={Math.min(W - 110, Math.max(2, xOf(hover) - 50)) + 54} y={14} fontSize={9} fill="#fff" textAnchor="middle">
              {etiqueta(puntos[hover].x)} · {fmt(puntos[hover].y)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
