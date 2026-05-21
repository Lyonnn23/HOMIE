import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Star, MapPin, Clock, ShieldCheck, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { FavoriteButton } from "@/components/FavoriteButton";
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
        <div className="absolute top-5 right-5">
          <FavoriteButton prestadorId={p.id} size="lg" />
        </div>
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
          <ReviewsSummary reviews={p.reviews} rating={p.rating} count={p.reviewsCount} />
          <div className="mt-4 space-y-2">
            {p.reviews.length === 0 && (
              <p className="text-sm text-[#9CA3AF]">Aún no hay reseñas.</p>
            )}
            {p.reviews.map((r) => (
              <ReviewCard key={r.id} r={r} prestadorUsuarioId={p.usuarioId} />
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

function ReviewsSummary({ reviews, rating, count }: { reviews: ProviderReview[]; rating: number; count: number }) {
  const total = Math.max(reviews.length, 1);
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    n: reviews.filter((r) => r.rating === s).length,
  }));
  return (
    <div className="mt-3 grid grid-cols-[auto_1fr] gap-4 items-center p-4 rounded-2xl bg-[#F5F5F0]">
      <div className="text-center">
        <div className="text-3xl font-bold text-[#111827] leading-none">{rating.toFixed(1)}</div>
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`size-3.5 ${i < Math.round(rating) ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
          ))}
        </div>
        <div className="text-[11px] text-[#6B7280] mt-1">{count} reseñas</div>
      </div>
      <div className="space-y-1">
        {dist.map((d) => (
          <div key={d.stars} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-[#6B7280]">{d.stars}</span>
            <Star className="size-3 fill-[#EF9F27] text-[#EF9F27]" />
            <div className="flex-1 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
              <div className="h-full bg-[#EF9F27]" style={{ width: `${(d.n / total) * 100}%` }} />
            </div>
            <span className="w-5 text-right text-[#6B7280]">{d.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ r, prestadorUsuarioId }: { r: ProviderReview; prestadorUsuarioId: string | null }) {
  const { usuario } = useAuth();
  const isOwner = !!usuario && !!prestadorUsuarioId && usuario.id === prestadorUsuarioId;

  const initial = (r.author || "?").trim().charAt(0).toUpperCase();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(r.respuesta ?? "");
  const reply = useReplyReview();

  async function submit() {
    if (!text.trim()) return;
    await reply.mutateAsync({ resenaId: r.id, respuesta: text.trim() });
    setReplying(false);
  }

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB]">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-full bg-[#111827] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-[#111827] truncate">{r.author}</span>
              {r.verificada && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#00C28820] text-[#00754F] text-[10px] font-semibold">
                  <BadgeCheck className="size-3" /> Verificada
                </span>
              )}
            </div>
            <span className="text-xs text-[#9CA3AF] shrink-0">{r.date}</span>
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star key={j} className={`size-3.5 ${j < r.rating ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
            ))}
          </div>
          {r.text && <p className="text-sm mt-2 text-[#111827]/80">{r.text}</p>}
          {r.fotoUrl && (
            <img src={r.fotoUrl} alt="Foto del trabajo" loading="lazy" className="mt-3 w-full max-w-xs h-40 object-cover rounded-xl" />
          )}

          {r.respuesta && (
            <div className="mt-3 p-3 rounded-xl bg-[#F5F5F0] border-l-2 border-[#EF9F27]">
              <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Respuesta del prestador</div>
              <p className="text-sm mt-1 text-[#111827]/85">{r.respuesta}</p>
            </div>
          )}

          {isOwner && !r.respuesta && !replying && (
            <button
              onClick={() => setReplying(true)}
              className="mt-3 text-xs font-semibold text-[#EF9F27]"
            >
              Responder
            </button>
          )}
          {isOwner && replying && (
            <div className="mt-3 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Escribe tu respuesta..."
                className="w-full px-3 py-2 rounded-xl bg-[#F5F5F0] border border-[#E5E7EB] outline-none focus:border-[#EF9F27] resize-none text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setReplying(false)} className="px-3 py-1.5 text-xs font-semibold text-[#6B7280]">
                  Cancelar
                </button>
                <button
                  disabled={reply.isPending || !text.trim()}
                  onClick={submit}
                  className="px-3 py-1.5 rounded-lg bg-[#EF9F27] text-[#111827] text-xs font-bold disabled:opacity-50"
                >
                  {reply.isPending ? "Enviando..." : "Publicar respuesta"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
