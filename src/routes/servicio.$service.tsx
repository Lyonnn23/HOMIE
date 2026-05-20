import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Star, MapPin, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { getCategoryByService, getProvidersForService, formatCLP } from "@/data/services";

export const Route = createFileRoute("/servicio/$service")({
  component: ServicePage,
});

type SortKey = "rating" | "price" | "distance" | "availability";

function ServicePage() {
  const { service: raw } = Route.useParams();
  const service = decodeURIComponent(raw);
  const navigate = useNavigate();
  const cat = getCategoryByService(service);
  const providers = useMemo(() => getProvidersForService(service), [service]);
  const [sort, setSort] = useState<SortKey>("rating");

  const sorted = useMemo(() => {
    const list = [...providers];
    switch (sort) {
      case "rating": return list.sort((a, b) => b.rating - a.rating);
      case "price": return list.sort((a, b) => a.pricePerHour - b.pricePerHour);
      case "distance": return list.sort((a, b) => a.distanceKm - b.distanceKm);
      case "availability": return list.sort((a, b) => a.availability.localeCompare(b.availability));
    }
  }, [providers, sort]);

  const filters: { key: SortKey; label: string }[] = [
    { key: "rating", label: "Mejor calificados" },
    { key: "price", label: "Precio" },
    { key: "distance", label: "Distancia" },
    { key: "availability", label: "Disponibilidad" },
  ];

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4">
        <button onClick={() => navigate({ to: "/" })} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </button>
        <div className="mt-3">
          {cat && (
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: cat.bg }}>
              {cat.name}
            </div>
          )}
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{service}</h1>
          <p className="text-sm text-muted-foreground mt-1">{providers.length} prestadores disponibles</p>
        </div>
      </header>

      <div className="px-5 pb-3 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setSort(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                sort === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-white border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-2 space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No hay prestadores para este servicio aún.</p>
          </div>
        ) : (
          sorted.map((p) => (
            <div key={p.id} className="p-4 rounded-3xl bg-white border border-border">
              <div className="flex items-start gap-3">
                <ProviderAvatar seed={p.avatarSeed} name={p.name} size={56} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="size-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{p.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Desde <span className="font-medium text-foreground">{formatCLP(p.pricePerHour)}</span>/hora
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{p.distanceKm} km</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{p.availability}</span>
                  </div>
                </div>
              </div>
              <Link
                to="/prestador/$id"
                params={{ id: p.id }}
                search={{ service }}
                className="mt-3 block text-center py-2.5 rounded-2xl bg-muted hover:bg-muted/70 text-sm font-medium transition"
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
