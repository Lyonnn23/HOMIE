import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TicketPrecio } from "@/components/TicketPrecio";
import { supabase } from "@/integrations/supabase/client";
import { categories, groups, categoriesOfGroup, formatCLP } from "@/data/services";

export const Route = createFileRoute("/precios")({
  head: () => ({
    meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    
      { title: "Guía de precios de servicios a domicilio en Chile — Homie" },
      { name: "description", content: "Cuánto cuesta un gasfíter, electricista, aseo del hogar, manicure o paseo de perros a domicilio. Rangos reales publicados por profesionales verificados en Homie." },
      { property: "og:title", content: "Guía de precios — Homie" },
      { property: "og:description", content: "Rangos de precio reales de servicios a domicilio, publicados por profesionales verificados." },
    ],
  }),
  component: PreciosPage,
});

interface GuiaRow { servicio_id: string; servicio: string; categoria_id: string; profesionales: number; precio_min: number; precio_mediana: number; precio_max: number }

function PreciosPage() {
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["guia_precios"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("guia_precios")
        .select("servicio_id, servicio, categoria_id, profesionales, precio_min, precio_mediana, precio_max")
        .order("profesionales", { ascending: false });
      return (data ?? []) as GuiaRow[];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const cat = categories.find((c) => c.id === r.categoria_id);
      return r.servicio.toLowerCase().includes(t) || (cat?.name.toLowerCase().includes(t) ?? false);
    });
  }, [rows, q]);

  // Agrupado por grupo → categoría, respetando el orden del catálogo.
  const secciones = useMemo(() => {
    return groups
      .map((g) => ({
        group: g,
        cats: categoriesOfGroup(g.id)
          .map((c) => ({ cat: c, rows: filtered.filter((r) => r.categoria_id === c.id).sort((a, b) => a.servicio.localeCompare(b.servicio, "es")) }))
          .filter((x) => x.rows.length > 0),
      }))
      .filter((s) => s.cats.length > 0);
  }, [filtered]);

  return (
    <AppShell wide>
      <section className="bg-[#111827] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-dots-soft pointer-events-none" aria-hidden />
        <div className="container-landing relative py-12 md:py-16 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-center">
          <div>
            <h1 className="title-1 text-white max-w-[22ch]">Guía de precios de servicios a domicilio</h1>
            <p className="mt-3 text-white/75 leading-relaxed max-w-[52ch]">
              Rangos reales, calculados con los precios que publican los profesionales verificados de Homie. Sin estimaciones ni promedios inventados.
            </p>
            <div className="relative mt-6 max-w-[520px]">
              <label htmlFor="buscar-precio" className="sr-only">Buscar en la guía</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#6B7280]" aria-hidden />
              <input
                id="buscar-precio"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filtra por servicio o categoría"
                className="w-full h-13 pl-12 pr-4 rounded-[10px] bg-white text-[#111827] placeholder:text-[#9CA3AF] text-base outline-none border-2 border-transparent focus:border-[#EF9F27] transition-colors"
              />
            </div>
          </div>
          <div className="md:justify-self-end w-full max-w-[380px]">
            <TicketPrecio compact servicio="Aseo del hogar" detalle="Departamento, 3 horas" desde="$30.000" hasta="$40.000" />
          </div>
        </div>
      </section>

      <section className="bg-[#F3F4F6]">
        <div className="container-landing py-6 md:py-8">
          <div className="card p-4 md:p-5 flex items-start gap-3 text-sm text-[#4B5563] leading-relaxed">
            <Info className="size-5 shrink-0 mt-0.5" style={{ color: "var(--pacifico)" }} aria-hidden />
            <p className="max-w-[80ch]">
              <strong className="text-[#111827]">Cómo leer la guía.</strong> El precio desde es lo que pagas al reservar. El precio hasta es el máximo posible si el trabajo requiere más: se acuerda antes de empezar y nunca se supera. Para ti no hay costo extra; Homie cobra al profesional una comisión del 15% solo por servicios completados.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white" aria-live="polite">
        <div className="container-landing py-10 md:py-14">
          {isLoading ? (
            <div className="space-y-3" aria-label="Cargando">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-[10px]" />)}
            </div>
          ) : secciones.length === 0 ? (
            <div className="max-w-[60ch]">
              <h2 className="title-3 text-[#111827]">{rows.length === 0 ? "La guía se está construyendo" : "Sin resultados"}</h2>
              <p className="mt-2 text-[#4B5563] leading-relaxed">
                {rows.length === 0
                  ? "Los rangos aparecen a medida que los profesionales verificados publican sus precios. Mientras tanto, busca el servicio y revisa el rango en cada perfil."
                  : "Prueba con otro nombre, por ejemplo “gasfíter” o “mascotas”."}
              </p>
              <Link to="/buscar" className="btn-secondary btn-sm mt-5">Buscar profesionales</Link>
            </div>
          ) : (
            <div className="space-y-12">
              {secciones.map(({ group, cats }) => (
                <section key={group.id} aria-labelledby={`g-${group.id}`}>
                  <h2 id={`g-${group.id}`} className="title-2 text-[#111827]">{group.name}</h2>
                  <div className="mt-5 space-y-6">
                    {cats.map(({ cat, rows }) => (
                      <div key={cat.id}>
                        <h3 className="text-sm font-semibold text-[#6B7280] mb-2">{cat.name}</h3>
                        <div className="card overflow-hidden">
                          <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 px-4 py-2.5 text-xs font-semibold text-[#6B7280] bg-[#F3F4F6]">
                            <span>Servicio</span><span>Rango (desde – hasta)</span><span>Mediana</span><span>Profesionales</span><span className="sr-only">Acción</span>
                          </div>
                          <ul className="divide-y divide-[#E5E7EB]">
                            {rows.map((r) => (
                              <li key={r.servicio_id} className="grid gap-x-4 gap-y-1 px-4 py-3.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                                <span className="text-[15px] font-semibold text-[#111827]">{r.servicio}</span>
                                <span className="text-sm text-[#111827] tabular-nums">
                                  <span className="md:hidden text-[#6B7280]">Rango: </span>{formatCLP(r.precio_min)} – {formatCLP(r.precio_max)}
                                </span>
                                <span className="text-sm text-[#4B5563] tabular-nums"><span className="md:hidden">Mediana: </span>{formatCLP(r.precio_mediana)}</span>
                                <span className="text-sm text-[#4B5563]">{r.profesionales} {r.profesionales === 1 ? "profesional" : "profesionales"}</span>
                                <Link
                                  to="/servicio/$service"
                                  params={{ service: encodeURIComponent(r.servicio) }}
                                  className="btn-secondary btn-sm mt-2 md:mt-0 justify-self-start md:justify-self-end"
                                >
                                  Ver profesionales
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
