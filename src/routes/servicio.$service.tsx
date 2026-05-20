import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Star, MapPin, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { getCategoryByService, useProvidersForService, formatCLP, type ProviderListItem } from "@/data/services";

export const Route = createFileRoute("/servicio/$service")({
  component: ServicePage,
});

type SortKey = "rating" | "distance" | "price" | "availability";

function ServicePage() {
  const { service: raw } = Route.useParams();
  const service = decodeURIComponent(raw);
  const navigate = useNavigate();
  const cat = getCategoryByService(service);
  const { data: providers = [], isLoading } = useProvidersForService(service);
  const [sort, setSort] = useState<SortKey>("rating");

  const sorted = useMemo(() => {
    const list: ProviderListItem[] = [...providers];
    switch (sort) {
      case "rating": return list.sort((a, b) => b.rating - a.rating);
      case "price": return list.sort((a, b) => a.pricePerHour - b.pricePerHour);
      case "distance": return list.sort((a, b) => a.distanceKm - b.distanceKm);
      case "availability": return list.sort((a, b) => Number(b.disponibleAhora) - Number(a.disponibleAhora));
    }
  }, [providers, sort]);

  const filters: { key: SortKey; label: string }[] = [
    { key: "rating", label: "Mejor calificación" },
    { key: "distance", label: "Más cercano" },
    { key: "price", label: "Precio: menor a mayor" },
    { key: "availability", label: "Disponible ahora" },
  ];

  const catColor = cat?.bg ?? "#111827";
  const CatIcon = cat?.icon;

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-6 text-white" style={{ backgroundColor: catColor }}>
        <button
          onClick={() => navigate({ to: "/" })}
          className="p-2 -ml-2 rounded-full hover:bg-white/15 text-white"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="mt-3 flex items-center gap-3">
          {CatIcon && (
            <div className="size-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <CatIcon className="size-6 text-white" />
            </div>
          )}
          <div>
            <div className="text-xs text-white/80 font-medium">{cat?.name}</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{service}</h1>
          </div>
        </div>
        <p className="text-sm text-white/80 mt-2">
          {isLoading ? "Cargando prestadores..." : `${providers.length} prestadores disponibles`}
        </p>
      </header>

      <div className="px-5 pt-4 pb-3 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {filters.map((f) => {
            const isActive = sort === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setSort(f.key)}
                className="px-4 py-2 rounded-full text-sm font-medium border transition whitespace-nowrap"
                style={
                  isActive
                    ? { backgroundColor: catColor, borderColor: catColor, color: "#fff" }
                    : { backgroundColor: "#fff", borderColor: "#E5E7EB", color: "#111827" }
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-2 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-3xl bg-white border border-border animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No hay prestadores para este servicio aún.</p>
          </div>
        ) : (
          sorted.map((p) => (
            <div key={p.id} className="p-4 rounded-3xl bg-white border border-border relative">
              {p.disponibleAhora && (
                <span
                  className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: "#FAC77540", color: "#854F0B" }}
                >
                  Disponible
                </span>
              )}
              <div className="flex items-start gap-3">
                <div
                  className="rounded-full p-[2px] shrink-0"
                  style={{ backgroundColor: catColor }}
                >
                  <div className="rounded-full bg-white p-[2px]">
                    <ProviderAvatar url={p.avatarUrl} name={p.name} size={56} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-bold truncate text-[#111827]">{p.name}</h3>
                  <div className="text-xs text-gray-500">{service}</div>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <Star className="size-4" style={{ fill: "#EF9F27", color: "#EF9F27" }} />
                    <span className="font-semibold text-[#111827]">{p.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({p.reviewsCount} reseñas)</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-bold text-[#111827]">
                      {formatCLP(p.pricePerHour)}<span className="text-xs font-normal text-gray-500">/h</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="size-3.5" />{p.distanceKm} km
                    </span>
                  </div>
                </div>
              </div>
              <Link
                to="/prestador/$id"
                params={{ id: p.id }}
                search={{ service }}
                className="mt-3 block text-center py-2.5 rounded-2xl text-sm font-semibold transition"
                style={{
                  border: `1.5px solid ${catColor}`,
                  color: catColor,
                  backgroundColor: "transparent",
                }}
              >
                Ver perfil
              </Link>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
