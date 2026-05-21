import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Star, MapPin, Clock, ShieldCheck, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { getCategory, useProvider, formatCLP, type ProviderReview } from "@/data/services";
import { useAuth } from "@/hooks/use-auth";
import { useReplyReview } from "@/store/bookings";

export const Route = createFileRoute("/prestador/$id")({
  validateSearch: z.object({ service: z.string().optional() }),
  component: ProviderPage,
});


function ProviderPage() {
  const { id } = Route.useParams();
  const { service } = Route.useSearch();
  const router = useRouter();
  const { data: p, isLoading } = useProvider(id);

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 text-center text-muted-foreground">Cargando perfil...</div>
      </AppShell>
    );
  }

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

  const cat = getCategory(p.categoryId)!;
  const selectedService = service && p.services.some((s) => s.name === service)
    ? service
    : p.services[0]?.name;

  return (
    <AppShell>
      <div className="relative">
        <div
          className="h-52"
          style={{
            background: `linear-gradient(180deg, ${cat.bg}33 0%, ${cat.bg}0D 100%)`,
          }}
        />
        <button
          onClick={() => router.history.back()}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/90 backdrop-blur hover:bg-white shadow-sm"
        >
          <ArrowLeft className="size-5 text-[#111827]" />
        </button>
        <div className="absolute -bottom-12 left-5">
          <div className="rounded-full ring-[3px] ring-white shadow-md">
            <ProviderAvatar url={p.avatarUrl} name={p.name} size={90} />
          </div>
        </div>
      </div>

      <div className="px-5 pt-16">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#111827] truncate">{p.name}</h1>
            <div className="text-xs text-[#6B7280] mt-0.5">{cat.name}</div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111827] text-white text-[11px] font-semibold">
            <ShieldCheck className="size-3.5 text-[#EF9F27]" />
            Verificado
          </span>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="text-[28px] font-bold leading-none text-[#111827]">{p.rating.toFixed(1)}</span>
          <div className="flex items-center gap-0.5 pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`size-4 ${i < Math.round(p.rating) ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
            ))}
          </div>
          <span className="pb-1 text-xs text-[#6B7280]">({p.reviewsCount} reseñas)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#9CA3AF]">
          <span className="inline-flex items-center gap-1"><MapPin className="size-[14px]" />{p.distanceKm} km</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-[14px]" />{p.availability}</span>
        </div>

        <section className="mt-6">
          <h2 className="section-title">Sobre mí</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#111827]/80">{p.bio}</p>
        </section>

        <section className="mt-6">
          <h2 className="section-title">Servicios</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.services.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold"
                style={{
                  border: `1.5px solid ${cat.bg}`,
                  backgroundColor: `${cat.bg}14`,
                  color: cat.bg,
                }}
              >
                {s.name}
                <span className="text-[#111827] font-bold">{formatCLP(s.price)}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="section-title">Galería</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {p.gallery.map((src: string, i: number) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="section-title">Reseñas</h2>
          <div className="mt-3 space-y-2">
            {p.reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-white border border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#111827]">{r.author}</span>
                  <span className="text-xs text-[#9CA3AF]">{r.date}</span>
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`size-3.5 ${j < r.rating ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
                  ))}
                </div>
                <p className="text-sm mt-2 text-[#111827]/80">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-[#9CA3AF]">Desde</div>
            <div className="text-lg font-bold text-[#111827]">{formatCLP(p.pricePerHour)}<span className="text-xs font-medium text-[#6B7280]">/hr</span></div>
          </div>
          <Link
            to="/reservar/$id"
            params={{ id: p.id }}
            search={{ service: selectedService }}
            className="px-6 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm"
          >
            Contratar
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
