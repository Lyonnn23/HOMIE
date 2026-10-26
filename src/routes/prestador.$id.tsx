import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Star, Clock, ShieldCheck, BadgeCheck, ChevronRight, ChevronDown, Crown, Car, Wrench, Receipt, MapPin, Languages, Timer, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { EstadoVacio } from "@/components/EstadoVacio";
import { PerfilSkeleton } from "@/components/Skeletons";
import { ProviderAvatar } from "@/components/Avatar";
import { FavoriteButton } from "@/components/FavoriteButton";
import {
  getCategory, useProvider, formatCLP, DIAS, esPro, nombreCategoria,
  type ProviderReview, type ProviderService,
} from "@/data/services";
import { useT } from "@/i18n";
import { TextoNegrita } from "@/components/TextoNegrita";

type T = (clave: string, vars?: Record<string, string | number>) => string;
/** Duración estimada traducida (espejo de duracionLabel en services.ts). */
function duracionTxt(min: number | null | undefined, t: T): string {
  if (min === null || min === undefined) return t("duracion.variosDias");
  if (min === 240) return t("duracion.medioDia");
  if (min === 480) return t("duracion.diaCompleto");
  if (min < 60) return t("duracion.min", { n: min });
  const h = Math.floor(min / 60), m = min % 60;
  return m ? t("duracion.hm", { h, m }) : t("duracion.h", { n: h });
}
function garantiaTxt(dias: number, t: T): string {
  return dias === 365 ? t("garantia.anio") : t("garantia.dias", { n: dias });
}
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useReplyReview } from "@/store/bookings";

export const Route = createFileRoute("/prestador/$id")({
  validateSearch: z.object({ service: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Perfil del profesional — Homie" },
    { name: "description", content: "Perfil, servicios, horarios y reseñas de un profesional de Homie." },
    { property: "og:title", content: "Perfil del profesional — Homie" },
    { property: "og:description", content: "Perfil, servicios, horarios y reseñas de un profesional de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProviderPage,
});


function ProviderPage() {
  const { id } = Route.useParams();
  const { service } = Route.useSearch();
  const router = useRouter();
  const { t, idioma } = useT();
  const { usuario, loading: authLoading } = useAuth();
  const { data: p, isLoading } = useProvider(id);

  // Cuenta una vista del perfil (una vez por montaje; no cuenta las visitas del dueño).
  const ownerId = p?.usuarioId ?? null;
  useEffect(() => {
    if (!p || authLoading) return;
    if (usuario && ownerId && usuario.id === ownerId) return;
    const key = `homie-vista-${p.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* sin storage: igual contamos */ }
    supabase.rpc("registrar_vista", { _prestador_id: p.id }).then(() => {}, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, authLoading, ownerId]);

  if (isLoading) {
    return (
      <AppShell>
        <PerfilSkeleton />
      </AppShell>
    );
  }

  if (!p) {
    return (
      <AppShell>
        <EstadoVacio
          icon={UserX}
          titulo={t("prestador.noEncontrado")}
          descripcion={t("prestador.noEncontradoSub")}
          accion={{ label: t("prestador.buscarOtros"), to: "/buscar" }}
        />
      </AppShell>
    );
  }

  const cat = getCategory(p.categoryId)!;
  const color = p.colorPerfil || cat.bg;
  const isOwner = !!usuario && !!p.usuarioId && usuario.id === p.usuarioId;
  const pro = esPro(p.proHasta);
  const selectedService = service && p.services.some((s) => s.name === service)
    ? service
    : p.services[0]?.name;
  const diasActivos = DIAS.filter((d) => p.horario[d.key]?.activo);
  const catNombre = nombreCategoria(cat.id, idioma);

  return (
    <AppShell>
      {/* BANNER */}
      <div className="relative">
        <div
          className="h-56 bg-cover bg-center"
          style={{
            backgroundImage: p.bannerUrl ? `url(${p.bannerUrl})` : undefined,
            background: p.bannerUrl ? undefined
              : pro ? "linear-gradient(135deg, #EF9F27 0%, #F5C56B 55%, #111827 150%)"
              : `linear-gradient(135deg, ${color} 0%, ${color}99 60%, #111827 140%)`,
          }}
        />
        {p.bannerUrl && <div className="absolute inset-0 h-56 bg-gradient-to-t from-black/50 to-transparent" />}
        <button
          onClick={() => router.history.back()}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/90 backdrop-blur hover:bg-white shadow-sm"
          aria-label={t("comun.volver")}
        >
          <ArrowLeft className="size-5 text-[#111827]" />
        </button>
        <div className="absolute top-5 right-5 flex items-center gap-2">
          {isOwner && (
            <Link to="/panel" className="px-3 py-2 rounded-full bg-white/90 text-xs font-semibold text-[#111827] shadow-sm">
              {t("prestador.editarPerfil")}
            </Link>
          )}
          <FavoriteButton prestadorId={p.id} size="lg" />
        </div>
        <div className="absolute -bottom-12 left-5">
          <div className={`relative rounded-full ring-[3px] shadow-md ${pro ? "ring-[#EF9F27]" : "ring-white"}`}>
            <ProviderAvatar url={p.avatarUrl} name={p.name} size={96} />
            <span
              className={`absolute bottom-1 right-1 size-5 rounded-full ring-2 ring-white ${p.disponibleAhora ? "bg-[#00C288]" : "bg-[#FF3B6B]"}`}
              title={p.disponibleAhora ? t("prestador.disponibleAhora") : t("prestador.noDisponible")}
            />
          </div>
        </div>
      </div>

      <div className="px-5 pt-16">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#111827] leading-tight">{p.name}</h1>
              {pro && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#EF9F27] to-[#F5C56B] text-[#111827] text-[11px] font-bold" title={t("buscar.premiumTitle")}>
                  <Crown className="size-3" /> Premium
                </span>
              )}
            </div>
            <div className="text-sm font-medium mt-0.5" style={{ color }}>{p.tituloProfesional || catNombre}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">
              {catNombre}{p.comuna ? ` · ${p.comuna}` : ""}{p.anosExperiencia ? ` · ${t("prestador.anosExp", { n: p.anosExperiencia })}` : ""}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white ${p.disponibleAhora ? "bg-[#00C288]" : "bg-[#FF3B6B]"}`}
            >
              <span className="size-1.5 rounded-full bg-white" />
              {p.disponibleAhora ? t("prestador.disponible") : t("prestador.noDisponible")}
            </span>
            {p.availability && !/^(disponible ahora|no disponible|disponible)$/i.test(p.availability.trim()) && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#6B7280]">
                <Clock className="size-3" /> {p.availability}
              </span>
            )}
          </div>
        </div>

        {/* RATING */}
        <div className="mt-3 flex items-end gap-2">
          <span className="text-[28px] font-bold leading-none text-[#111827]">{p.rating.toFixed(1)}</span>
          <div className="flex items-center gap-0.5 pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`size-4 ${i < Math.round(p.rating) ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
            ))}
          </div>
          <span className="pb-1 text-xs text-[#6B7280]">({t("prestador.resenasCount", { n: p.reviewsCount })})</span>
        </div>

        {/* CONFIANZA */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <TrustChip ok={p.verificadoIdentidad || p.verificado} label={t("prestador.identidad")} sub={t("prestador.identidadSub")} pendiente={t("prestador.pendiente")} />
          <TrustChip ok={p.antecedentesOk || p.verificado} label={t("prestador.antecedentes")} sub={t("prestador.antecedentesSub")} pendiente={t("prestador.pendiente")} />
          <TrustChip ok={p.verificado} label={t("prestador.certificado")} sub={t("prestador.certificadoSub")} pendiente={t("prestador.pendiente")} />
        </div>

        <section className="mt-6">
          <h2 className="section-title">{t("prestador.sobreMi")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#111827]/80 whitespace-pre-line">{p.bio}</p>
          {p.especialidades.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.especialidades.map((e) => (
                <span key={e} className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: color }}>
                  {e}
                </span>
              ))}
            </div>
          )}
          {p.idiomas.length > 0 && (
            <div className="mt-3 flex items-center flex-wrap gap-1.5">
              <Languages className="size-3.5 text-[#6B7280]" />
              {p.idiomas.map((i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-[#F5F5F0] border border-[#E5E7EB] text-[11px] font-medium text-[#374151]">{i}</span>
              ))}
            </div>
          )}
          <div className="mt-3 p-3 rounded-2xl bg-[#F5F5F0] grid grid-cols-2 sm:grid-cols-4 gap-2">
            <DatoPractico icon={Car} ok={p.tieneVehiculo} label={t("prestador.vehiculo")} />
            <DatoPractico icon={Wrench} ok={p.herramientasPropias} label={t("prestador.herramientas")} />
            <DatoPractico icon={Receipt} ok={p.emiteBoleta} label={t("prestador.boleta")} />
            <div className="flex items-start gap-1.5 col-span-2 sm:col-span-1 min-w-0">
              <MapPin className="size-4 shrink-0 mt-0.5" style={{ color }} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-[#111827]">{t("prestador.cobertura")}</div>
                <div className="text-[11px] text-[#6B7280] leading-snug">
                  {p.comunasCobertura.length > 0
                    ? p.comunasCobertura.join(", ")
                    : p.comuna ? t("prestador.radioDesde", { km: p.radioKm, comuna: p.comuna }) : t("prestador.radio", { km: p.radioKm })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICIOS Y PRECIOS */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title">{t("prestador.servicios")}</h2>
            <span className="text-[11px] text-[#6B7280]">{t("prestador.rangoGarantizado")}</span>
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">
            <TextoNegrita texto={t("prestador.rangoNota")} />
          </p>
          <div className="mt-3 space-y-2">
            {p.services.map((s) => (
              <ServiceCard key={s.id} s={s} providerId={p.id} color={color} icon={cat.icon} />
            ))}
          </div>
        </section>

        {/* HORARIO */}
        <section className="mt-6">
          <h2 className="section-title">{t("prestador.horario")}</h2>
          <div className="mt-3 p-4 rounded-2xl bg-[#F5F5F0]">
            <div className="flex gap-1.5">
              {DIAS.map((d) => {
                const on = p.horario[d.key]?.activo;
                return (
                  <span
                    key={d.key}
                    title={t(`dia.${d.key}`)}
                    className={`flex-1 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${on ? "text-white" : "bg-white text-[#9CA3AF] border border-[#E5E7EB]"}`}
                    style={on ? { backgroundColor: color } : undefined}
                  >
                    {t(`diaCorto.${d.key}`)}
                  </span>
                );
              })}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-[#374151]">
              {diasActivos.length === 0 && <li className="text-[#9CA3AF]">{t("prestador.sinHorario")}</li>}
              {diasActivos.map((d) => (
                <li key={d.key} className="flex justify-between">
                  <span>{t(`dia.${d.key}`)}</span>
                  <span className="font-medium">{p.horario[d.key].desde} – {p.horario[d.key].hasta}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {p.gallery.length > 0 && (
          <section className="mt-6">
            <h2 className="section-title">{t("prestador.galeria")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {p.gallery.map((src: string, i: number) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-muted">
                  <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <h2 className="section-title">{t("prestador.resenas")}</h2>
          <ReviewsSummary reviews={p.reviews} rating={p.rating} count={p.reviewsCount} />
          <div className="mt-4 space-y-2">
            {p.reviews.length === 0 && (
              <p className="text-sm text-[#9CA3AF]">{t("prestador.sinResenas")}</p>
            )}
            {p.reviews.map((r) => (
              <ReviewCard key={r.id} r={r} prestadorUsuarioId={p.usuarioId} />
            ))}
          </div>
        </section>
      </div>

      {!isOwner && (
        <div className="fixed inset-x-0 z-30 border-t border-[#E5E7EB] bg-white/95 backdrop-blur bottom-[calc(56px+env(safe-area-inset-bottom,0px))]">
          <div className="mx-auto max-w-2xl px-5 py-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-[#9CA3AF]">{t("prestador.estimado")}</div>
              <div className="text-lg font-bold text-[#111827]">
                {formatCLP(p.pricePerHour)}
                {p.priceTo > p.pricePerHour && <span className="text-sm font-medium text-[#6B7280]"> – {formatCLP(p.priceTo)}</span>}
              </div>
            </div>
            <Link
              to="/reservar/$id"
              params={{ id: p.id }}
              search={{ service: selectedService }}
              className={`h-12 inline-flex items-center px-6 rounded-2xl font-semibold text-sm ${p.disponibleAhora ? "bg-foreground text-background" : "bg-[#6B7280] text-white"}`}
            >
              {p.disponibleAhora ? t("prestador.contratar") : t("prestador.agendar")}
            </Link>
          </div>
          <div className="mx-auto max-w-2xl px-5 -mt-1 pb-2 text-right">
            <Link to="/solicitar" className="text-xs font-semibold text-[#6B7280] underline underline-offset-2 hover:text-[#111827]">
              {t("prestador.pedirCotizacion")}
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function DatoPractico({ icon: Icon, ok, label }: { icon: typeof Car; ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${ok ? "" : "opacity-50"}`}>
      <Icon className={`size-4 shrink-0 ${ok ? "text-[#00754F]" : "text-[#9CA3AF]"}`} />
      <span className={`text-[11px] font-medium truncate ${ok ? "text-[#111827]" : "text-[#6B7280] line-through"}`}>{label}</span>
    </div>
  );
}

function ServiceCard({
  s, providerId, color, icon: Icon,
}: { s: ProviderService; providerId: string; color: string; icon: typeof Car }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const tieneDetalle = !!(s.incluye || s.noIncluye);
  return (
    <div className="rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#111827]/30 transition overflow-hidden">
      <Link
        to="/reservar/$id"
        params={{ id: providerId }}
        search={{ service: s.name }}
        className="flex gap-3 p-3"
      >
        {s.photoUrl ? (
          <img src={s.photoUrl} alt={s.name} loading="lazy" className="size-20 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="size-20 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
            <Icon className="size-7" style={{ color }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm text-[#111827]">{s.name}</div>
            <ChevronRight className="size-4 text-[#9CA3AF] shrink-0" />
          </div>
          {s.description && (
            <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{s.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {s.modalidades.map((m) => (
              <span key={m} className="px-1.5 py-0.5 rounded-full bg-[#F5F5F0] border border-[#E5E7EB] text-[10px] font-medium text-[#374151]">
                {["domicilio", "online", "local"].includes(m) ? t(`modalidad.${m}`) : m}
              </span>
            ))}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F5F5F0] border border-[#E5E7EB] text-[10px] font-medium text-[#374151]">
              <Timer className="size-3" /> {duracionTxt(s.duracionMin, t)}
            </span>
            {s.garantiaDias > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#00C28820] text-[#00754F] text-[10px] font-semibold">
                <ShieldCheck className="size-3" /> {garantiaTxt(s.garantiaDias, t)}
              </span>
            )}
            {s.materialesIncluidos && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F5F5F0] border border-[#E5E7EB] text-[10px] font-medium text-[#374151]">
                {t("prestador.materialesIncl")}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold text-[#111827]">{formatCLP(s.price)}</span>
            {s.priceTo > s.price && (
              <span className="text-xs text-[#6B7280]">– {formatCLP(s.priceTo)}</span>
            )}
            <span className="text-[11px] text-[#6B7280]">{t(`unidad.${s.unidad}`)}</span>
          </div>
        </div>
      </Link>
      {tieneDetalle && (
        <div className="border-t border-[#F3F4F6]">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            <span>{t("prestador.queIncluye")}</span>
            <ChevronDown className={`size-4 text-[#9CA3AF] transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="px-3 pb-3 space-y-2">
              {s.incluye && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#00754F]">{t("prestador.incluye")}</div>
                  <p className="text-xs text-[#111827]/80 whitespace-pre-line mt-0.5">{s.incluye}</p>
                </div>
              )}
              {s.noIncluye && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#FF3B6B]">{t("prestador.noIncluye")}</div>
                  <p className="text-xs text-[#111827]/80 whitespace-pre-line mt-0.5">{s.noIncluye}</p>
                </div>
              )}
              {!s.materialesIncluidos && (
                <p className="text-[11px] text-[#6B7280]">{t("prestador.materialesAparte")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrustChip({ ok, label, sub, pendiente }: { ok: boolean; label: string; sub: string; pendiente: string }) {
  return (
    <div className={`p-2.5 rounded-2xl border ${ok ? "bg-[#00C28812] border-[#00C28840]" : "bg-white border-[#E5E7EB]"}`}>
      <div className="flex items-center gap-1">
        {ok ? <ShieldCheck className="size-4 text-[#00754F]" /> : <Clock className="size-4 text-[#9CA3AF]" />}
        <span className={`text-xs font-semibold ${ok ? "text-[#00754F]" : "text-[#6B7280]"}`}>{label}</span>
      </div>
      <div className="text-[10px] text-[#6B7280] mt-0.5">{ok ? sub : pendiente}</div>
    </div>
  );
}

function ReviewsSummary({ reviews, rating, count }: { reviews: ProviderReview[]; rating: number; count: number }) {
  const { t } = useT();
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
        <div className="text-[11px] text-[#6B7280] mt-1">{t("prestador.resenasCount", { n: count })}</div>
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
  const { t } = useT();
  const isOwner = !!usuario && !!prestadorUsuarioId && usuario.id === prestadorUsuarioId;
  const semanas = Math.max(1, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7)));

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
                  <BadgeCheck className="size-3" /> {t("prestador.verificada")}
                </span>
              )}
            </div>
            <span className="text-xs text-[#9CA3AF] shrink-0">{t("prestador.semAtras", { n: semanas })}</span>
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star key={j} className={`size-3.5 ${j < r.rating ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
            ))}
          </div>
          {r.text && <p className="text-sm mt-2 text-[#111827]/80">{r.text}</p>}
          {r.fotoUrl && (
            <img src={r.fotoUrl} alt={t("prestador.fotoTrabajo")} loading="lazy" className="mt-3 w-full max-w-xs h-40 object-cover rounded-xl" />
          )}

          {r.respuesta && (
            <div className="mt-3 p-3 rounded-xl bg-[#F5F5F0] border-l-2 border-[#EF9F27]">
              <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">{t("prestador.respuestaPrestador")}</div>
              <p className="text-sm mt-1 text-[#111827]/85">{r.respuesta}</p>
            </div>
          )}

          {isOwner && !r.respuesta && !replying && (
            <button
              onClick={() => setReplying(true)}
              className="mt-3 text-xs font-semibold text-[#EF9F27]"
            >
              {t("prestador.responder")}
            </button>
          )}
          {isOwner && replying && (
            <div className="mt-3 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder={t("prestador.respuestaPlaceholder")}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F5F0] border border-[#E5E7EB] outline-none focus:border-[#EF9F27] resize-none text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setReplying(false)} className="px-3 py-1.5 text-xs font-semibold text-[#6B7280]">
                  {t("comun.cancelar")}
                </button>
                <button
                  disabled={reply.isPending || !text.trim()}
                  onClick={submit}
                  className="px-3 py-1.5 rounded-lg bg-[#EF9F27] text-[#111827] text-xs font-bold disabled:opacity-50"
                >
                  {reply.isPending ? t("prestador.enviando") : t("prestador.publicarRespuesta")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
