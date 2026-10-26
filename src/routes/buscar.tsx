import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, MapPin, SlidersHorizontal, X, Zap, Home as HomeIcon, Map as MapIcon } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { AppShell } from "@/components/AppShell";
import { EstadoVacio } from "@/components/EstadoVacio";
import { ListaSkeleton } from "@/components/Skeletons";
import { PullRefresh } from "@/components/PullRefresh";
import { MapaPrestadores } from "@/components/MapaPrestadores";
import { HomieYaBanner } from "@/components/HomieYaBanner";
import { ProviderAvatar } from "@/components/Avatar";
import { Slider } from "@/components/ui/slider";
import { categories, groups, categoriesOfGroup, formatCLP, esPro, rankingScore, ratingBayesiano, premiumDestaca, type CategoryId } from "@/data/services";
import { supabase } from "@/integrations/supabase/client";
import { distanciaKm, type GeoPoint } from "@/lib/geocode";

/** Pide la ubicación del navegador una sola vez (no bloquea; null si no hay permiso). */
function useGeolocation(): GeoPoint | null {
  const [pos, setPos] = useState<GeoPoint | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);
  return pos;
}

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
  rating: fallback(z.number(), 0).default(0),
  now: fallback(z.boolean(), false).default(false),
  sort: fallback(z.enum(["relevance", "rating", "price", "distance"]), "relevance").default("relevance"),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [
    { name: "description", content: "Encuentra profesionales de Homie por servicio, ubicación y disponibilidad." },
    { property: "og:title", content: "Buscar servicios — Homie" },
    { property: "og:description", content: "Encuentra profesionales de Homie por servicio, ubicación y disponibilidad." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Buscar servicios — Homie" }] }),
  component: Buscar,
});

interface ResultRow {
  id: string;
  name: string;
  avatarUrl: string | null;
  categoryId: CategoryId;
  rating: number;
  reviewsCount: number;
  pricePerHour: number;
  disponibleAhora: boolean;
  lat: number | null;
  lng: number | null;
  matchedService?: string;
  bio: string;
  distanceKm: number;
  pro: boolean;
  /** Premium con buena reputación (badge y empuje en el ranking). */
  premiumDestacado: boolean;
  availability: string | null;
}

const PRICE_MIN = 0;
const PRICE_MAX = 50000;

type SortKey = "relevance" | "rating" | "price" | "distance";

function useSearchProviders(params: { q: string; cat: string; min: number; max: number; rating: number; now: boolean; sort: SortKey }, origen: GeoPoint | null) {
  return useQuery({
    queryKey: ["search", params, origen],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<ResultRow[]> => {
      let query = supabase
        .from("prestadores")
        .select(`
          id, categoria_id, nombre, foto_url, bio, calificacion_promedio, resenas_count,
          precio_desde, disponible_ahora, disponibilidad_texto, distancia_km, lat, lng, pro_hasta,
          prestador_servicios ( servicios ( nombre ) )
        `);

      if (params.cat) query = query.eq("categoria_id", params.cat);
      if (params.min > 0) query = query.gte("precio_desde", params.min);
      if (params.max > 0) query = query.lte("precio_desde", params.max);
      if (params.rating > 0) query = query.gte("calificacion_promedio", params.rating);
      if (params.now) query = query.eq("disponible_ahora", true);

      const { data, error } = await query.limit(200);
      if (error) throw error;

      type Row = {
        id: string; categoria_id: string; bio: string | null;
        nombre: string | null; foto_url: string | null;
        calificacion_promedio: number; resenas_count: number;
        precio_desde: number; disponible_ahora: boolean; disponibilidad_texto: string | null; distancia_km: number | null;
        lat: number | null; lng: number | null; pro_hasta: string | null;
        prestador_servicios: { servicios: { nombre: string } | null }[] | null;
      };

      const rows = (data ?? []) as unknown as Row[];
      const qLower = params.q.trim().toLowerCase();

      const mapped: (ResultRow & { score: number; ranking: number })[] = rows.map((r) => {
        const services = (r.prestador_servicios ?? [])
          .map((ps) => ps.servicios?.nombre)
          .filter((x): x is string => !!x);

        let matchedService: string | undefined;
        let score = 0;

        if (qLower) {
          const nameLower = (r.nombre ?? "").toLowerCase();
          const bioLower = (r.bio ?? "").toLowerCase();
          const exact = services.find((s) => s.toLowerCase() === qLower);
          if (exact) { matchedService = exact; score += 100; }
          else {
            const starts = services.find((s) => s.toLowerCase().startsWith(qLower));
            if (starts) { matchedService = starts; score += 60; }
            else {
              const includes = services.find((s) => s.toLowerCase().includes(qLower));
              if (includes) { matchedService = includes; score += 40; }
            }
          }
          if (nameLower.includes(qLower)) score += nameLower.startsWith(qLower) ? 50 : 25;
          if (bioLower.includes(qLower)) score += 10;
          if (score === 0) return null as unknown as ResultRow & { score: number; ranking: number };
        }

        const lat = r.lat == null ? null : Number(r.lat);
        const lng = r.lng == null ? null : Number(r.lng);
        // Distancia real desde la ubicación del navegador si el prestador tiene coordenadas; si no, la columna distancia_km.
        const distanceKm = origen && lat != null && lng != null
          ? Math.round(distanciaKm(origen, { lat, lng }) * 10) / 10
          : Number(r.distancia_km ?? 0);

        const rating = Number(r.calificacion_promedio);
        const premium = esPro(r.pro_hasta);
        const rep = { rating, reviewsCount: r.resenas_count, disponibleAhora: r.disponible_ahora, availability: r.disponibilidad_texto, premium };
        return {
          id: r.id,
          name: r.nombre ?? "Prestador",
          avatarUrl: r.foto_url,
          categoryId: r.categoria_id as CategoryId,
          rating,
          reviewsCount: r.resenas_count,
          pricePerHour: r.precio_desde,
          disponibleAhora: r.disponible_ahora,
          matchedService: matchedService ?? services[0],
          bio: r.bio ?? "",
          distanceKm,
          lat,
          lng,
          pro: premium,
          premiumDestacado: premiumDestaca(rep),
          availability: r.disponibilidad_texto,
          score,
          ranking: rankingScore(rep),
        };
      }).filter(Boolean) as (ResultRow & { score: number; ranking: number })[];

      mapped.sort((a, b) => {
        switch (params.sort) {
          case "rating": {
            // Calificación ponderada: pocas reseñas no superan a muchas buenas
            const rb = ratingBayesiano(b.rating, b.reviewsCount) - ratingBayesiano(a.rating, a.reviewsCount);
            if (rb !== 0) return rb;
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviewsCount - a.reviewsCount;
          }
          case "price":
            return a.pricePerHour - b.pricePerHour;
          case "distance":
            return (a.distanceKm || 999) - (b.distanceKm || 999);
          case "relevance":
          default:
            // Coincidencia con la búsqueda, luego reputación (calificaciones, disponibilidad; Premium solo si es bueno)
            if (b.score !== a.score) return b.score - a.score;
            if (b.ranking !== a.ranking) return b.ranking - a.ranking;
            return b.reviewsCount - a.reviewsCount;
        }
      });

      return mapped;
    },
  });
}

function Buscar() {
  const { q, cat, min, max, rating, now, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/buscar" });
  const [showFilters, setShowFilters] = useState(false);

  const [localQ, setLocalQ] = useState(q);
  useEffect(() => { setLocalQ(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (localQ !== q) navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, q: localQ }) });
    }, 250);
    return () => clearTimeout(t);
  }, [localQ, q, navigate]);

  const origen = useGeolocation();
  const { data: results = [], isLoading } = useSearchProviders({ q, cat, min, max, rating, now, sort }, origen);
  const [vista, setVista] = useState<"lista" | "mapa">("lista");

  const activeCount = useMemo(() => {
    let n = 0;
    if (cat) n++;
    if (min > 0) n++;
    if (max > 0) n++;
    if (rating > 0) n++;
    if (now) n++;
    return n;
  }, [cat, min, max, rating, now]);

  function clearAll() {
    navigate({ search: { q: "", cat: "", min: 0, max: 0, rating: 0, now: false, sort: "relevance" } });
    setLocalQ("");
  }

  // Local price range state synced with URL
  const [range, setRange] = useState<[number, number]>([min || PRICE_MIN, max || PRICE_MAX]);
  useEffect(() => { setRange([min || PRICE_MIN, max || PRICE_MAX]); }, [min, max]);

  return (
    <AppShell>
      <PullRefresh queryKey={["search"]} />
      {/* Sticky header con fondo #111827 */}
      <div className="sticky top-0 z-30 bg-[#111827] text-white px-5 pt-6 pb-4 -mt-px">
        <h1 className="title-2 text-white mb-3">Buscar</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#EF9F27]" />
          <input
            autoFocus
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Servicio o nombre del prestador..."
            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white text-[#111827] placeholder:text-[#9CA3AF] outline-none"
          />
          {localQ && (
            <button
              onClick={() => setLocalQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted"
              aria-label="Limpiar"
            >
              <X className="size-4 text-[#9CA3AF]" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mt-3">
        <HomieYaBanner />
      </div>

      <div className="px-5 mt-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition ${
              showFilters || activeCount > 0 ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-border"
            }`}
          >
            <SlidersHorizontal className="size-3.5" /> Filtros
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#EF9F27] text-[#111827] text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, now: !p.now }) })}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition ${
              now ? "bg-[#EF9F27] text-[#111827] border-[#EF9F27]" : "bg-white border-border"
            }`}
          >
            <Zap className="size-3.5" /> Disponible ahora
          </button>
          {activeCount > 0 && (
            <button onClick={clearAll} className="shrink-0 px-3 py-2 text-sm text-muted-foreground underline">
              Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 p-4 rounded-2xl bg-white border border-border space-y-5">
            {/* Categorías como chips con su color */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Categoría</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, cat: "" }) })}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    !cat ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-border"
                  }`}
                >Todas</button>
                {groups.map((g) => (
                  <span key={g.id} className="contents">
                    <span className="basis-full text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-1">{g.name}</span>
                {categoriesOfGroup(g.id).map((c) => {
                      const active = cat === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, cat: p.cat === c.id ? "" : c.id }) })}
                          className="px-3 py-1.5 rounded-full text-xs border transition"
                          style={{
                            backgroundColor: active ? c.bg : `${c.bg}1F`,
                            color: active ? "#fff" : c.bg,
                            borderColor: c.bg,
                          }}
                        >{c.name}</button>
                      );
                    })}
                  </span>
                ))}
              </div>
            </div>

            {/* Slider doble de precio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Precio por hora</label>
                <span className="text-xs text-[#111827] font-semibold">
                  {formatCLP(range[0])} – {range[1] >= PRICE_MAX ? `${formatCLP(PRICE_MAX)}+` : formatCLP(range[1])}
                </span>
              </div>
              <div className="slider-amber [&_[role=slider]]:!border-[#EF9F27] [&_[role=slider]]:!bg-[#EF9F27] [&_.bg-primary]:!bg-[#EF9F27]">
                <Slider
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={1000}
                  value={range}
                  onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
                  onValueCommit={(v) => navigate({ search: (p: z.infer<typeof searchSchema>) => ({
                    ...p,
                    min: v[0] > PRICE_MIN ? v[0] : 0,
                    max: v[1] < PRICE_MAX ? v[1] : 0,
                  }) })}
                />
              </div>
            </div>

            {/* Estrellas seleccionables */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Calificación mínima</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = rating >= n;
                  return (
                    <button
                      key={n}
                      onClick={() => navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, rating: p.rating === n ? 0 : n }) })}
                      className="p-1"
                      aria-label={`${n} estrellas mínimo`}
                    >
                      <Star className={`size-7 transition ${active ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
                    </button>
                  );
                })}
                {rating > 0 && <span className="ml-2 text-xs text-muted-foreground self-center">{rating}+ estrellas</span>}
              </div>
            </div>
          </div>
        )}

        {/* Resultados + Ordenar */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Buscando..." : `${results.length} resultado${results.length === 1 ? "" : "s"}`}
          </p>
          <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
            <button onClick={() => setVista("lista")} className={`px-2.5 py-1.5 ${vista === "lista" ? "bg-[#111827] text-white" : "bg-white"}`}>Lista</button>
            <button onClick={() => setVista("mapa")} className={`px-2.5 py-1.5 inline-flex items-center gap-1 ${vista === "mapa" ? "bg-[#111827] text-white" : "bg-white"}`}><MapIcon className="size-3.5" /> Mapa</button>
          </div>
          <select
            value={sort}
            onChange={(e) => navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, sort: e.target.value as SortKey }) })}
            className="text-xs bg-transparent border border-border rounded-lg px-2 py-1.5 outline-none focus:border-[#EF9F27]"
          >
            <option value="relevance">Relevancia</option>
            <option value="rating">Mejor calificados</option>
            <option value="price">Precio</option>
            <option value="distance">Distancia</option>
          </select>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Orden por reputación: calificaciones, servicios completados y respuesta. Premium destaca solo con buena reputación.
        </p>

        {vista === "mapa" && !isLoading && (
          <MapaPrestadores items={results} className="mt-3" />
        )}

        <div className={vista === "mapa" ? "hidden" : "mt-3"}>
          {isLoading ? (
            <ListaSkeleton items={5} />
          ) : results.length === 0 ? (
            <EstadoVacio
              icon={HomeIcon}
              titulo="No encontramos resultados"
              descripcion="Prueba con otra palabra clave o ajusta los filtros"
              accion={activeCount > 0 ? { label: "Limpiar filtros", onClick: clearAll } : undefined}
            />
          ) : (
            <div className="space-y-2">
              {results.map((r) => {
                const c = categories.find((c) => c.id === r.categoryId);
                return (
                  <Link
                    key={r.id}
                    to="/prestador/$id"
                    params={{ id: r.id }}
                    search={{ service: r.matchedService }}
                    className={`flex items-center gap-3 p-3 rounded-2xl bg-white border border-border hover:bg-muted/40 transition ${r.pro ? "border-l-4 border-l-[#EF9F27]" : ""}`}
                  >
                    <ProviderAvatar url={r.avatarUrl} name={r.name} size={52} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm truncate">{r.name}</div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${r.disponibleAhora ? "bg-[#00C28820] text-[#00754F]" : "bg-[#FF3B6B1A] text-[#B3123F]"}`}
                          aria-label={r.disponibleAhora ? "Disponible ahora" : "No disponible"}
                        >
                          <span className={`size-1.5 rounded-full ${r.disponibleAhora ? "bg-[#00C288]" : "bg-[#FF3B6B]"}`} />
                          {r.disponibleAhora ? "Disponible" : "Ocupado"}
                        </span>
                        {r.pro && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#EF9F27] to-[#F5C56B] text-[#111827] text-[10px] font-bold" title="Profesional Homie Premium">Premium</span>
                        )}
                        {r.rating >= 4.8 && r.reviewsCount >= 5 && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-[#EF9F27] text-[#111827] text-[10px] font-bold">TOP</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.matchedService ?? c?.name}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3 fill-[#EF9F27] text-[#EF9F27]" />
                          {r.rating.toFixed(1)} <span className="opacity-60">({r.reviewsCount})</span>
                        </span>
                        {r.distanceKm > 0 && (
                          <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{r.distanceKm} km</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground uppercase">Desde</div>
                      <div className="text-sm font-semibold">{formatCLP(r.pricePerHour)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
