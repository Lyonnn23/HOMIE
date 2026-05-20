import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, MapPin, SlidersHorizontal, X, Zap } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { categories, formatCLP, type CategoryId } from "@/data/services";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
  rating: fallback(z.number(), 0).default(0),
  now: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Buscar servicios — Manitos" }] }),
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
  matchedService?: string;
  bio: string;
  distanceKm: number;
}

function useSearchProviders(params: { q: string; cat: string; min: number; max: number; rating: number; now: boolean }) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: async (): Promise<ResultRow[]> => {
      let query = supabase
        .from("prestadores")
        .select(`
          id, categoria_id, bio, calificacion_promedio, resenas_count,
          precio_desde, disponible_ahora, distancia_km,
          usuarios!inner ( nombre, foto_url ),
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
        calificacion_promedio: number; resenas_count: number;
        precio_desde: number; disponible_ahora: boolean; distancia_km: number | null;
        usuarios: { nombre: string; foto_url: string | null };
        prestador_servicios: { servicios: { nombre: string } | null }[] | null;
      };

      const rows = (data ?? []) as unknown as Row[];
      const qLower = params.q.trim().toLowerCase();

      const mapped: (ResultRow & { score: number })[] = rows.map((r) => {
        const services = (r.prestador_servicios ?? [])
          .map((ps) => ps.servicios?.nombre)
          .filter((x): x is string => !!x);

        let matchedService: string | undefined;
        let score = 0;

        if (qLower) {
          const nameLower = r.usuarios.nombre.toLowerCase();
          const bioLower = (r.bio ?? "").toLowerCase();

          // Exact service match (highest)
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

          // No match at all → exclude
          if (score === 0) return null as unknown as ResultRow & { score: number };
        }

        return {
          id: r.id,
          name: r.usuarios.nombre,
          avatarUrl: r.usuarios.foto_url,
          categoryId: r.categoria_id as CategoryId,
          rating: Number(r.calificacion_promedio),
          reviewsCount: r.resenas_count,
          pricePerHour: r.precio_desde,
          disponibleAhora: r.disponible_ahora,
          matchedService: matchedService ?? services[0],
          bio: r.bio ?? "",
          distanceKm: Number(r.distancia_km ?? 0),
          score,
        };
      }).filter(Boolean) as (ResultRow & { score: number })[];

      // Relevance + rating sort
      mapped.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.reviewsCount - a.reviewsCount;
      });

      return mapped;
    },
  });
}

function Buscar() {
  const { q, cat, min, max, rating, now } = Route.useSearch();
  const navigate = useNavigate({ from: "/buscar" });
  const [showFilters, setShowFilters] = useState(false);

  // Debounce text input locally for nicer UX
  const [localQ, setLocalQ] = useState(q);
  useEffect(() => { setLocalQ(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (localQ !== q) navigate({ search: (prev: typeof Route.types.fullSearchSchema) => ({ ...prev, q: localQ }) });
    }, 250);
    return () => clearTimeout(t);
  }, [localQ, q, navigate]);

  const { data: results = [], isLoading } = useSearchProviders({ q, cat, min, max, rating, now });

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
    navigate({ search: { q: "", cat: "", min: 0, max: 0, rating: 0, now: false } });
    setLocalQ("");
  }

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-3xl font-bold tracking-tight">Buscar</h1>
      </header>

      <div className="px-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            autoFocus
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Servicio o nombre del prestador..."
            className="w-full h-14 pl-12 pr-12 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
          />
          {localQ && (
            <button
              onClick={() => setLocalQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted"
              aria-label="Limpiar"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition ${
              showFilters || activeCount > 0 ? "bg-foreground text-background border-foreground" : "bg-white border-border"
            }`}
          >
            <SlidersHorizontal className="size-3.5" /> Filtros
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-background text-foreground text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate({ search: (p: typeof Route.types.fullSearchSchema) => ({ ...p, now: !p.now }) })}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition ${
              now ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-border"
            }`}
          >
            <Zap className="size-3.5" /> Disponible ahora
          </button>
          {[4.5, 4.0, 3.5].map((r) => (
            <button
              key={r}
              onClick={() => navigate({ search: (p: typeof Route.types.fullSearchSchema) => ({ ...p, rating: p.rating === r ? 0 : r }) })}
              className={`shrink-0 inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-sm border transition ${
                rating === r ? "bg-foreground text-background border-foreground" : "bg-white border-border"
              }`}
            >
              <Star className="size-3.5 fill-yellow-400 text-yellow-400" /> {r.toFixed(1)}+
            </button>
          ))}
          {activeCount > 0 && (
            <button onClick={clearAll} className="shrink-0 px-3 py-2 text-sm text-muted-foreground underline">
              Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 p-4 rounded-2xl bg-white border border-border space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Categoría</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate({ search: (p: typeof Route.types.fullSearchSchema) => ({ ...p, cat: "" }) })}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    !cat ? "bg-foreground text-background border-foreground" : "bg-white border-border"
                  }`}
                >Todas</button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate({ search: (p: typeof Route.types.fullSearchSchema) => ({ ...p, cat: p.cat === c.id ? "" : c.id }) })}
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      cat === c.id ? "bg-foreground text-background border-foreground" : "bg-white border-border"
                    }`}
                  >{c.name}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Precio mín.</label>
                <input
                  type="number" min={0} step={1000}
                  value={min || ""}
                  placeholder="$0"
                  onChange={(e) => navigate({ search: (p: typeof Route.types.fullSearchSchema) => ({ ...p, min: Number(e.target.value) || 0 }) })}
                  className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Precio máx.</label>
                <input
                  type="number" min={0} step={1000}
                  value={max || ""}
                  placeholder="Sin límite"
                  onChange={(e) => navigate({ search: (p: typeof Route.types.fullSearchSchema) => ({ ...p, max: Number(e.target.value) || 0 }) })}
                  className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 mt-5">
        <p className="text-xs text-muted-foreground mb-3">
          {isLoading ? "Buscando..." : `${results.length} resultado${results.length === 1 ? "" : "s"}`}
        </p>

        {!isLoading && results.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base">Sin resultados</p>
            <p className="text-sm mt-1">Prueba con otra palabra o ajusta los filtros</p>
          </div>
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
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border hover:bg-muted/40 transition"
                >
                  <ProviderAvatar url={r.avatarUrl} name={r.name} size={52} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm truncate">{r.name}</div>
                      {r.disponibleAhora && (
                        <span className="shrink-0 size-1.5 rounded-full bg-emerald-500" aria-label="Disponible" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.matchedService ?? c?.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3 fill-yellow-400 text-yellow-400" />
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
    </AppShell>
  );
}
