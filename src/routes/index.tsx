import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronRight,
  X,
  BadgeCheck,
  ShieldCheck,
  Wallet,
  Star,
  Flame,
  FileCheck2,
  Scale,
  Lock,
  MessageSquareQuote,
  Quote,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { TicketPrecio } from "@/components/TicketPrecio";
import { Faq } from "@/components/Faq";
import { supabase } from "@/integrations/supabase/client";
import { FAQ_CLIENTES } from "@/data/faq";
import {
  categories,
  groups,
  categoriesOfGroup,
  formatCLP,
  type CategoryId,
  type GroupId,
} from "@/data/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    
      { title: "Homie — Profesionales verificados a domicilio con precio garantizado" },
      {
        name: "description",
        content:
          "Encuentra profesionales verificados a domicilio en Chile: gasfíter, electricista, aseo, belleza, mascotas y más. Precio acordado antes y pago protegido con Mercado Pago.",
      },
      { property: "og:title", content: "Homie — Profesionales verificados a domicilio" },
      {
        property: "og:description",
        content: "Precio acordado antes, pago protegido y profesionales con certificado del rubro.",
      },
    ],
  }),
  component: Home,
});

// Servicios más solicitados (chips del hero)
const TOP_REQUESTED: { service: string; catId: CategoryId }[] = [
  { service: "Aseo del hogar", catId: "home" },
  { service: "Gasfíter", catId: "tech-fix" },
  { service: "Manicure y pedicure", catId: "beauty" },
  { service: "Paseo de perros", catId: "pets" },
  { service: "Electricista", catId: "tech-fix" },
  { service: "Peluquería", catId: "beauty" },
  { service: "Kinesiólogo", catId: "health" },
  { service: "Fotógrafo", catId: "events" },
  { service: "Mecánico a domicilio", catId: "auto" },
  { service: "Limpieza de piscinas", catId: "garden" },
  { service: "Desayunos sorpresa", catId: "gifts" },
  { service: "Juegos inflables", catId: "party" },
];

const PASOS = [
  {
    n: 1,
    t: "Busca y compara",
    d: "Escribe lo que necesitas y revisa profesionales cerca de ti, con reseñas reales y su rango de precio publicado.",
  },
  {
    n: 2,
    t: "Reserva y paga protegido",
    d: "Eliges fecha y hora y pagas el precio desde con Mercado Pago. El dinero queda retenido, no en manos del profesional.",
  },
  {
    n: 3,
    t: "Confirma y califica",
    d: "Cuando el trabajo está listo, confirmas en la app y se libera el pago. Tu reseña ayuda a los que vienen después.",
  },
];

const DIFERENCIADORES = [
  {
    icon: FileCheck2,
    color: "var(--bosque)",
    t: "Verificados con certificado",
    d: "Revisamos cédula, antecedentes y un certificado o título del rubro antes de publicar cada perfil.",
  },
  {
    icon: Wallet,
    color: "var(--ambar)",
    t: "Rango de precio garantizado",
    d: "Pagas el precio desde. Si el trabajo requiere más, lo sabes antes de empezar y nunca supera el hasta.",
  },
  {
    icon: Lock,
    color: "var(--pacifico)",
    t: "Pago protegido",
    d: "Mercado Pago retiene tu dinero y lo libera al profesional solo cuando confirmas que terminó.",
  },
  {
    icon: Scale,
    color: "var(--pizarra)",
    t: "Mediación de Homie",
    d: "Si algo sale mal, abres un reclamo y nuestro equipo resuelve en máximo 5 días hábiles.",
  },
];

interface Stats {
  profesionales: number;
  servicios_completados: number;
  calificacion: number;
  resenas: number;
}
interface Testimonio {
  id: string;
  calificacion: number;
  comentario: string | null;
  cliente_nombre: string | null;
  created_at: string;
  prestadores: { nombre: string | null; categoria_id: string } | null;
}
interface GuiaRow {
  servicio: string;
  categoria_id: string;
  profesionales: number;
  precio_min: number;
  precio_mediana: number;
  precio_max: number;
}

function useLandingData(enabled: boolean) {
  const stats = useQuery({
    queryKey: ["stats_publicas"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("stats_publicas");
      return (data?.[0] ?? null) as Stats | null;
    },
  });
  const testimonios = useQuery({
    queryKey: ["testimonios_portada"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("resenas")
        .select(
          "id, calificacion, comentario, cliente_nombre, created_at, prestadores(nombre, categoria_id)",
        )
        .gte("calificacion", 4)
        .not("comentario", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);
      return ((data ?? []) as unknown as Testimonio[]).filter(
        (t) => (t.comentario ?? "").trim().length > 12,
      );
    },
  });
  const guia = useQuery({
    queryKey: ["guia_precios_portada"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("guia_precios")
        .select("servicio, categoria_id, profesionales, precio_min, precio_mediana, precio_max")
        .order("profesionales", { ascending: false })
        .limit(6);
      return (data ?? []) as GuiaRow[];
    },
  });
  return { stats: stats.data, testimonios: testimonios.data ?? [], guia: guia.data ?? [] };
}

function Home() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);
  const [openCat, setOpenCat] = useState<CategoryId | null>(null);
  const visitante = !usuario;
  const { stats, testimonios, guia } = useLandingData(visitante);

  const allServices = useMemo(
    () => categories.flatMap((c) => c.services.map((s) => ({ service: s, cat: c }))),
    [],
  );
  const matches =
    query.trim().length > 0
      ? allServices
          .filter((x) => x.service.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 8)
      : [];

  const active = openCat ? categories.find((c) => c.id === openCat) : null;
  const activeGroup = openGroup ? groups.find((g) => g.id === openGroup) : null;
  const groupCats = openGroup ? categoriesOfGroup(openGroup) : [];
  const firstName = usuario?.nombre?.split(" ")[0];
  const wrap = visitante ? "container-landing" : "px-5";

  const goSearch = () => {
    const q = query.trim();
    if (!q) return;
    const exact =
      allServices.find((x) => x.service.toLowerCase() === q.toLowerCase()) ?? matches[0];
    if (exact)
      navigate({
        to: "/servicio/$service",
        params: { service: encodeURIComponent(exact.service) },
      });
    else navigate({ to: "/buscar" });
  };

  return (
    <AppShell wide={visitante}>
      {/* HERO */}
      <section
        className="relative bg-[#111827] text-white overflow-hidden"
        aria-labelledby="hero-title"
      >
        <div className="absolute inset-0 bg-dots-soft pointer-events-none" aria-hidden />
        <div
          className={`relative ${wrap} ${visitante ? "pt-10 pb-12 md:pt-20 md:pb-20" : "pt-7 pb-8"}`}
        >
          <div
            className={
              visitante
                ? "grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-center lg:gap-16"
                : ""
            }
          >
            <div className="min-w-0">
              {visitante ? (
                <>
                  <h1 id="hero-title" className="h-display reveal reveal-1 text-white max-w-[20ch]">
                    Un profesional verificado en tu puerta, con precio acordado antes.
                  </h1>
                  <p className="lead reveal reveal-2 mt-4 text-white/75 max-w-[48ch]">
                    Compara precios reales, reserva en minutos y paga protegido. El dinero se libera
                    solo cuando confirmas.
                  </p>
                </>
              ) : (
                <>
                  <h1 id="hero-title" className="title-1 reveal reveal-1 text-white">
                    Hola, {firstName ?? "tú"}
                  </h1>
                  <p className="reveal reveal-2 mt-1 text-base font-medium text-white/75">
                    ¿Qué necesitas hoy?
                  </p>
                </>
              )}

              {/* Buscador */}
              <form
                role="search"
                className="relative mt-7 reveal reveal-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  goSearch();
                }}
              >
                <label htmlFor="buscar-servicio" className="sr-only">
                  Busca lo que necesitas
                </label>
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#6B7280]"
                  aria-hidden
                />
                <input
                  id="buscar-servicio"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca lo que necesitas: gasfíter, aseo, manicure…"
                  autoComplete="off"
                  className="w-full h-14 md:h-16 pl-12 pr-4 md:pr-36 rounded-[10px] bg-white text-[#111827] placeholder:text-[#9CA3AF] text-base outline-none border-2 border-transparent focus:border-[#EF9F27] transition-colors shadow-float"
                />
                <button
                  type="submit"
                  className="btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex"
                >
                  Buscar
                </button>

                {matches.length > 0 && (
                  <ul
                    className="absolute left-0 right-0 top-full mt-2 z-20 rounded-[14px] bg-white border border-[#E5E7EB] overflow-hidden text-[#111827] shadow-float"
                    aria-label="Sugerencias"
                  >
                    {matches.map((m) => (
                      <li key={m.service}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: "/servicio/$service",
                              params: { service: encodeURIComponent(m.service) },
                            })
                          }
                          className="flex items-center justify-between w-full px-4 py-3 hover:bg-[#F3F4F6] text-left"
                        >
                          <span>
                            <span className="block text-sm font-semibold">{m.service}</span>
                            <span className="block text-xs text-[#6B7280]">{m.cat.name}</span>
                          </span>
                          <ChevronRight className="size-4 text-[#9CA3AF]" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </form>

              {/* Más solicitados */}
              <div className="mt-5 reveal reveal-3">
                <div className="text-sm font-medium text-white/60 mb-2">Más solicitados</div>
                <div
                  className={`${visitante ? "-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto md:overflow-visible" : "-mx-5 px-5 overflow-x-auto"} no-scrollbar`}
                >
                  <div
                    className={`flex items-center gap-2 pb-1 ${visitante ? "w-max md:w-auto md:flex-wrap" : "w-max"}`}
                  >
                    {TOP_REQUESTED.map(({ service, catId }) => {
                      const c = categories.find((x) => x.id === catId)!;
                      const Icon = c.icon;
                      return (
                        <button
                          key={service}
                          onClick={() =>
                            navigate({
                              to: "/servicio/$service",
                              params: { service: encodeURIComponent(service) },
                            })
                          }
                          className="shrink-0 inline-flex items-center gap-1.5 pl-2 pr-3 h-9 rounded-full text-[13px] font-medium text-white bg-white/10 border border-white/10 hover:border-white/50 transition-colors"
                        >
                          <span
                            className="size-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: c.bg }}
                            aria-hidden
                          >
                            <Icon className="size-3 text-white" />
                          </span>
                          {service}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {visitante && (
                <ul
                  className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70 reveal reveal-4"
                  aria-label="Garantías"
                >
                  <li className="inline-flex items-center gap-2">
                    <BadgeCheck className="size-4" style={{ color: "#34D399" }} aria-hidden />{" "}
                    Verificados con certificado
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4" style={{ color: "#67E8F9" }} aria-hidden /> Pago
                    protegido con Mercado Pago
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <Scale className="size-4 text-[#EF9F27]" aria-hidden /> Mediación si algo sale
                    mal
                  </li>
                </ul>
              )}
            </div>

            {visitante && (
              <div className="reveal reveal-3 min-w-0 md:justify-self-end w-full max-w-[420px]">
                <TicketPrecio />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* GRUPOS */}
      <section
        className={`${wrap} ${visitante ? "py-14 md:py-20" : "mt-8"}`}
        aria-labelledby="grupos-title"
      >
        <div className="flex items-end justify-between gap-4 mb-5 md:mb-8">
          <div>
            <h2 id="grupos-title" className={visitante ? "title-2 text-[#111827]" : "section-title"}>
              ¿Qué tipo de servicio buscas?
            </h2>
            {visitante && (
              <p className="mt-2 text-[#6B7280]">
                {categories.length} categorías y más de 150 servicios a domicilio.
              </p>
            )}
          </div>
          {!visitante && (
            <span className="text-xs text-[#6B7280] shrink-0">{categories.length} categorías</span>
          )}
        </div>

        <div
          className={`grid grid-cols-2 gap-3 ${visitante ? "sm:grid-cols-3 lg:grid-cols-4 md:gap-4" : ""}`}
        >
          {groups.map((g) => {
            const Icon = g.icon;
            const cats = categoriesOfGroup(g.id);
            const n = cats.reduce((a, c) => a + c.services.length, 0);
            return (
              <button
                key={g.id}
                onClick={() => setOpenGroup(g.id)}
                className="card card-link text-left p-4 md:p-5 min-h-[150px] flex flex-col active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="size-11 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: g.bg }}
                    aria-hidden
                  >
                    <Icon className="size-5 text-white" />
                  </span>
                  <ChevronRight className="size-5 text-[#9CA3AF]" aria-hidden />
                </div>
                <div className="mt-auto pt-5">
                  <div className="text-[15px] md:text-base font-bold leading-tight text-[#111827]">
                    {g.name}
                  </div>
                  <div className="text-xs md:text-[13px] text-[#6B7280] mt-1 line-clamp-2">
                    {g.tagline}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] mt-1.5">
                    {cats.length} categorías · {n} servicios
                  </div>
                </div>
              </button>
            );
          })}
          {visitante && (
            <Link
              to="/solicitar"
              className="card card-link p-4 md:p-5 min-h-[150px] flex flex-col bg-[#F3F4F6]"
            >
              <span
                className="size-11 rounded-[10px] flex items-center justify-center shrink-0 bg-white border border-[#E5E7EB]"
                aria-hidden
              >
                <MessageSquareQuote className="size-5" style={{ color: "var(--pacifico)" }} />
              </span>
              <span className="mt-auto pt-5 block">
                <span className="block text-[15px] md:text-base font-bold leading-tight text-[#111827]">
                  ¿No sabes qué pedir?
                </span>
                <span className="block text-xs md:text-[13px] text-[#6B7280] mt-1">
                  Describe el problema y recibe cotizaciones de varios profesionales.
                </span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* HOMIE YA + GAS (app) */}
      {!visitante && (
        <section className="px-5 mt-6 space-y-3">
          {usuario?.tipo === "prestador" ? (
            <Link to="/pro" className="card card-link flex items-center gap-4 p-4 md:p-5 bg-[#111827] text-white border-transparent">
              <span className="size-11 rounded-full bg-[#EF9F27] flex items-center justify-center shrink-0"><Star className="size-5 text-[#111827]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-sm">Homie Pro: 30 días gratis</span>
                <span className="block text-xs text-white/70">Comisión 12%, perfil destacado y estadísticas de tu negocio.</span>
              </span>
              <ChevronRight className="size-5 text-[#EF9F27]" />
            </Link>
          ) : (
            <Link to="/ya" className="card card-link flex items-center gap-4 p-4 md:p-5 bg-[#FF3B6B] text-white border-transparent">
              <span className="size-11 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Zap className="size-5 text-white" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-sm">¿Es urgente? Homie Ya</span>
                <span className="block text-xs text-white/85">Cerrajero, fuga de agua, corte de luz: un profesional disponible acepta en minutos.</span>
              </span>
              <ChevronRight className="size-5 text-white" />
            </Link>
          )}
          <GasCard />
        </section>
      )}

      {visitante && (
        <>
          {/* CÓMO FUNCIONA */}
          <section className="bg-[#F3F4F6]" aria-labelledby="como-title">
            <div className="container-landing py-14 md:py-20">
              <div className="md:flex md:items-end md:justify-between gap-6">
                <div>
                  <h2 id="como-title" className="title-2 text-[#111827]">
                    Cómo funciona
                  </h2>
                  <p className="mt-2 text-[#6B7280] max-w-[52ch]">
                    Tres pasos. Sin llamadas, sin regateos y sin sorpresas al final.
                  </p>
                </div>
                <Link to="/como-funciona" className="btn-secondary btn-sm mt-4 md:mt-0 shrink-0">
                  Ver el detalle
                </Link>
              </div>
              <ol className="mt-8 md:mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
                {PASOS.map((p) => (
                  <li key={p.n} className="card p-5 md:p-6">
                    <span
                      className="inline-flex size-9 items-center justify-center rounded-full bg-[#111827] text-white text-sm font-bold"
                      aria-hidden
                    >
                      {p.n}
                    </span>
                    <h3 className="title-3 mt-4 text-[#111827]">{p.t}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{p.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* POR QUÉ HOMIE */}
          <section className="bg-white" aria-labelledby="porque-title">
            <div className="container-landing py-14 md:py-20">
              <h2 id="porque-title" className="title-2 text-[#111827]">
                Por qué Homie
              </h2>
              <p className="mt-2 text-[#6B7280] max-w-[52ch]">
                Lo que no encuentras en un directorio ni en un grupo de WhatsApp.
              </p>
              <div className="mt-8 md:mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {DIFERENCIADORES.map(({ icon: Icon, color, t, d }) => (
                  <article key={t} className="card p-5 md:p-6">
                    <span
                      className="inline-flex size-11 items-center justify-center rounded-[10px] bg-[#F3F4F6]"
                      aria-hidden
                    >
                      <Icon className="size-5" style={{ color }} />
                    </span>
                    <h3 className="title-3 mt-4 text-[#111827]">{t}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{d}</p>
                  </article>
                ))}
              </div>

              {/* Cifras */}
              <StatsRow stats={stats} />
            </div>
          </section>

          {/* TESTIMONIOS */}
          {testimonios.length > 0 && (
            <section className="bg-[#F3F4F6]" aria-labelledby="testimonios-title">
              <div className="container-landing py-14 md:py-20">
                <h2 id="testimonios-title" className="title-2 text-[#111827]">
                  Lo que dicen los clientes
                </h2>
                <p className="mt-2 text-[#6B7280]">
                  Reseñas reales, escritas después de un servicio completado.
                </p>
                <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                  {testimonios.map((t) => {
                    const cat = categories.find((c) => c.id === t.prestadores?.categoria_id);
                    return (
                      <li key={t.id} className="card p-5 md:p-6 flex flex-col">
                        <Quote className="size-5 text-[#EF9F27]" aria-hidden />
                        <p className="mt-3 text-[15px] text-[#111827] leading-relaxed flex-1">
                          “{t.comentario}”
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#111827] truncate">
                              {t.cliente_nombre ?? "Cliente de Homie"}
                            </div>
                            <div className="text-xs text-[#6B7280] truncate">
                              {t.prestadores?.nombre
                                ? `Sobre ${t.prestadores.nombre}`
                                : "Servicio completado"}
                              {cat ? ` · ${cat.name}` : ""}
                            </div>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#111827] shrink-0"
                            aria-label={`${t.calificacion} de 5`}
                          >
                            <Star className="size-4 fill-[#EF9F27] text-[#EF9F27]" aria-hidden />{" "}
                            {t.calificacion}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* GUÍA DE PRECIOS */}
          <section className="bg-white" aria-labelledby="precios-title">
            <div className="container-landing py-14 md:py-20 grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-14 md:items-start">
              <div>
                <h2 id="precios-title" className="title-2 text-[#111827]">
                  Precios claros antes de reservar
                </h2>
                <p className="mt-3 text-[#4B5563] leading-relaxed max-w-[48ch]">
                  Cada profesional publica un precio desde y un precio hasta. Pagas el desde al
                  reservar. Si el trabajo requiere más, lo sabes antes de empezar y el total nunca
                  supera el hasta.
                </p>
                <div className="mt-6 max-w-[380px]">
                  <TicketPrecio
                    compact
                    flat
                    servicio="Electricista"
                    detalle="Cambio de enchufe"
                    desde="$18.000"
                    hasta="$24.000"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="title-3 text-[#111827]">Guía de precios</h3>
                  <Link
                    to="/precios"
                    className="text-sm font-semibold text-[#0E7490] hover:underline underline-offset-4"
                  >
                    Ver la guía completa
                  </Link>
                </div>
                {guia.length > 0 ? (
                  <ul className="mt-4 card divide-y divide-[#E5E7EB] overflow-hidden">
                    {guia.map((r) => {
                      const cat = categories.find((c) => c.id === r.categoria_id);
                      return (
                        <li key={r.servicio}>
                          <Link
                            to="/servicio/$service"
                            params={{ service: encodeURIComponent(r.servicio) }}
                            className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[#F3F4F6] transition-colors"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-[#111827] truncate">
                                {r.servicio}
                              </span>
                              <span className="block text-xs text-[#6B7280]">
                                {cat?.name ?? "Servicio"} · {r.profesionales}{" "}
                                {r.profesionales === 1 ? "profesional" : "profesionales"}
                              </span>
                            </span>
                            <span className="text-sm font-semibold text-[#111827] shrink-0 tabular-nums">
                              {formatCLP(r.precio_min)}{" "}
                              <span className="text-[#9CA3AF] font-normal">–</span>{" "}
                              {formatCLP(r.precio_max)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-4 card p-5 text-sm text-[#4B5563] leading-relaxed">
                    La guía se construye con los precios reales que publican los profesionales
                    verificados. Revisa cualquier servicio para ver su rango.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* COTIZACIONES */}
          <section className="bg-[#F3F4F6]" aria-labelledby="cotiza-title">
            <div className="container-landing py-14 md:py-20">
              <div className="rounded-[24px] bg-white border border-[#E5E7EB] p-6 md:p-10 md:flex md:items-center md:justify-between gap-10">
                <div className="max-w-[56ch]">
                  <h2 id="cotiza-title" className="title-2 text-[#111827]">
                    ¿Un trabajo más grande? Pide cotizaciones
                  </h2>
                  <p className="mt-3 text-[#4B5563] leading-relaxed">
                    Describe lo que necesitas, sube fotos y recibe propuestas de varios
                    profesionales verificados. Comparas, eliges y reservas con el mismo pago
                    protegido.
                  </p>
                </div>
                <Link
                  to="/solicitar"
                  className="btn-primary mt-6 md:mt-0 shrink-0 w-full sm:w-auto"
                >
                  Pedir cotizaciones
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-white" aria-labelledby="faq-title">
            <div className="container-landing py-14 md:py-20 grid gap-8 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-14">
              <div>
                <h2 id="faq-title" className="title-2 text-[#111827]">
                  Preguntas frecuentes
                </h2>
                <p className="mt-2 text-[#6B7280]">
                  Si no encuentras tu respuesta, escríbenos desde el centro de ayuda.
                </p>
              </div>
              <Faq items={FAQ_CLIENTES} />
            </div>
          </section>

          {/* CTA PROFESIONALES */}
          <section className="bg-[#F3F4F6]" aria-labelledby="pro-title">
            <div className="container-landing py-14 md:py-20">
              <div className="rounded-[24px] bg-[#111827] text-white p-6 md:p-10 overflow-hidden relative">
                <div className="absolute inset-0 bg-dots-soft pointer-events-none" aria-hidden />
                <div className="relative md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-10 md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[#EF9F27]">Para profesionales</p>
                    <h2 id="pro-title" className="title-2 mt-2 text-white">
                      ¿Ofreces un servicio? Trabaja con Homie
                    </h2>
                    <p className="mt-3 text-white/75 leading-relaxed max-w-[52ch]">
                      Recibe clientes cerca de ti, cobra seguro con Mercado Pago y construye tu
                      reputación con reseñas reales.
                    </p>
                    <Link
                      to="/registro"
                      search={{ tipo: "prestador" }}
                      className="btn-primary mt-6 w-full sm:w-auto"
                    >
                      Quiero ofrecer mis servicios
                    </Link>
                  </div>
                  <ul className="mt-8 md:mt-0 space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <ShieldCheck className="size-5 mt-0.5 text-[#EF9F27] shrink-0" aria-hidden />
                      <span>
                        Solo profesionales verificados: cédula, antecedentes y certificado o
                        estudios del rubro.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Wallet className="size-5 mt-0.5 text-[#EF9F27] shrink-0" aria-hidden />
                      <span>
                        Tú defines tu rango de precios. Homie cobra 15% solo por servicio
                        completado.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Star className="size-5 mt-0.5 text-[#EF9F27] shrink-0" aria-hidden />
                      <span>Los mejor calificados aparecen primero.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* GAS (visitante) */}
          <section className="bg-white">
            <div className="container-landing py-10 md:py-14">
              <GasCard />
            </div>
          </section>
        </>
      )}

      {/* ÚNETE COMO PROFESIONAL (app, usuario cliente) */}
      {!visitante && usuario?.tipo !== "prestador" && (
        <section className="px-5 mt-8">
          <div className="rounded-[24px] bg-[#111827] text-white p-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-dots-soft pointer-events-none" aria-hidden />
            <div className="relative">
              <p className="text-sm font-semibold text-[#EF9F27]">Para profesionales</p>
              <h2 className="title-2 mt-2 text-white">¿Ofreces un servicio? Trabaja con Homie</h2>
              <p className="mt-2 text-sm text-white/75 leading-relaxed">
                Recibe clientes cerca de ti, cobra seguro con Mercado Pago y construye tu reputación
                con reseñas reales.
              </p>
              <Link
                to="/registro"
                search={{ tipo: "prestador" }}
                className="btn-primary mt-5 w-full sm:w-auto"
              >
                Quiero ofrecer mis servicios
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* MODAL grupo → categorías */}
      {activeGroup && !active && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in"
          onClick={() => setOpenGroup(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeGroup.name}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-[24px] sm:rounded-[24px] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${activeGroup.bg}1F`, color: activeGroup.bg }}
                >
                  <activeGroup.icon className="size-3.5" aria-hidden /> {activeGroup.name}
                </div>
                <h3 className="title-2 mt-2 text-[#111827]">{activeGroup.tagline}</h3>
              </div>
              <button
                onClick={() => setOpenGroup(null)}
                className="p-2 rounded-full hover:bg-[#F3F4F6]"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-2">
              {groupCats.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setOpenCat(c.id)}
                    className="card card-link w-full flex items-center gap-3 p-3 text-left"
                  >
                    <span
                      className="size-11 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c.bg }}
                      aria-hidden
                    >
                      <Icon className="size-5 text-white" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-sm text-[#111827]">{c.name}</span>
                      <span className="block text-xs text-[#6B7280] truncate">
                        {c.services.slice(0, 4).join(" · ")}
                        {c.services.length > 4 ? " …" : ""}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#9CA3AF] shrink-0">{c.services.length}</span>
                    <ChevronRight className="size-4 text-[#9CA3AF]" aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL servicios */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in"
          onClick={() => setOpenCat(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-[24px] sm:rounded-[24px] p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${active.bg}1F`, color: active.bg }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: active.bg }}
                    aria-hidden
                  />
                  {active.services.length} servicios
                </div>
                <h3 className="title-2 mt-2 text-[#111827]">{active.name}</h3>
              </div>
              <button
                onClick={() => setOpenCat(null)}
                className="p-2 rounded-full hover:bg-[#F3F4F6]"
                aria-label="Volver"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {active.services.map((s) => (
                <Link
                  key={s}
                  to="/servicio/$service"
                  params={{ service: encodeURIComponent(s) }}
                  className="px-4 py-2.5 rounded-full text-sm font-medium transition-colors border border-[#E5E7EB] text-[#111827] hover:border-[#111827]"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function GasCard() {
  return (
    <Link to="/gas" className="card card-link flex items-center gap-4 p-4 md:p-5">
      <span
        className="size-12 rounded-[10px] bg-[#FF6B00] flex items-center justify-center shrink-0"
        aria-hidden
      >
        <Flame className="size-5 text-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-[15px] text-[#111827]">¿Te quedaste sin gas?</span>
        <span className="block text-sm text-[#6B7280] mt-0.5">
          Distribuidoras abiertas cerca de ti, incluso de noche. Llama o pide cómo llegar.
        </span>
      </span>
      <ChevronRight className="size-5 text-[#9CA3AF] shrink-0" aria-hidden />
    </Link>
  );
}

function StatsRow({ stats }: { stats: Stats | null | undefined }) {
  const pocos = !stats || stats.profesionales < 10;
  if (pocos) {
    return (
      <p className="mt-10 md:mt-12 inline-flex items-center gap-2 text-sm font-medium text-[#111827] bg-[#F3F4F6] rounded-full px-4 py-2">
        <BadgeCheck className="size-4" style={{ color: "var(--bosque)" }} aria-hidden />
        Nuevos profesionales verificados cada semana
      </p>
    );
  }
  const items = [
    { v: stats.profesionales.toLocaleString("es-CL"), l: "profesionales verificados" },
    { v: stats.servicios_completados.toLocaleString("es-CL"), l: "servicios completados" },
    { v: Number(stats.calificacion).toFixed(1).replace(".", ","), l: "calificación promedio" },
    { v: stats.resenas.toLocaleString("es-CL"), l: "reseñas reales" },
  ].filter((x) => x.v !== "0");
  return (
    <dl className="mt-10 md:mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 border-t border-[#E5E7EB] pt-8">
      {items.map((it) => (
        <div key={it.l}>
          <dd className="title-1 text-[#111827] tabular-nums">{it.v}</dd>
          <dt className="mt-1 text-sm text-[#6B7280]">{it.l}</dt>
        </div>
      ))}
    </dl>
  );
}
