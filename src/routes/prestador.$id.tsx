import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Star, MapPin, Clock } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { getProvider, getCategory, formatCLP } from "@/data/services";

export const Route = createFileRoute("/prestador/$id")({
  validateSearch: z.object({ service: z.string().optional() }),
  component: ProviderPage,
});

function ProviderPage() {
  const { id } = Route.useParams();
  const { service } = Route.useSearch();
  const navigate = useNavigate();
  const p = getProvider(id);

  if (!p) {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Prestador no encontrado</p>
          <Link to="/" className="inline-block mt-4 underline">Volver al inicio</Link>
        </div>
      </AppShell>
    );
  }

  const cat = getCategory(p.category)!;
  const selectedService = service && p.services.some((s) => s.name === service)
    ? service
    : p.services[0]?.name;

  return (
    <AppShell>
      <div className="relative">
        <div className="h-48" style={{ backgroundColor: cat.bg }} />
        <button
          onClick={() => navigate({ to: -1 as never } as never).catch(() => navigate({ to: "/" }))}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/80 backdrop-blur hover:bg-white"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="absolute -bottom-10 left-5">
          <div className="ring-4 ring-white rounded-full">
            <ProviderAvatar seed={p.avatarSeed} name={p.name} size={96} />
          </div>
        </div>
      </div>

      <div className="px-5 pt-14">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <Star className="size-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{p.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({p.reviewsCount} reseñas)</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{p.distanceKm} km</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{p.availability}</span>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sobre mí</h2>
          <p className="mt-2 text-sm leading-relaxed">{p.bio}</p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Servicios</h2>
          <div className="mt-2 divide-y divide-border rounded-2xl bg-white border border-border">
            {p.services.map((s) => (
              <div key={s.name} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{s.name}</span>
                <span className="text-sm font-medium">{formatCLP(s.price)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Galería</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {p.gallery.map((src, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reseñas</h2>
          <div className="mt-2 space-y-2">
            {p.reviews.map((r, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.author}</span>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`size-3.5 ${j < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
                <p className="text-sm mt-2 text-foreground/80">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Desde</div>
            <div className="font-semibold">{formatCLP(p.pricePerHour)}/h</div>
          </div>
          <Link
            to="/reservar/$id"
            params={{ id: p.id }}
            search={{ service: selectedService }}
            className="px-6 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm"
          >
            Contratar
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
