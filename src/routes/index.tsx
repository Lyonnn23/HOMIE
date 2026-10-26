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
import { StatsSkeleton, TextoSkeleton } from "@/components/Skeletons";
import { TicketPrecio } from "@/components/TicketPrecio";
import { Faq } from "@/components/Faq";
import { supabase } from "@/integrations/supabase/client";
import { FAQ_CLIENTES_BY_LANG } from "@/data/faq";
import { useT } from "@/i18n";
import {
  categories,
  groups,
  categoriesOfGroup,
  formatCLP,
  nombreGrupo,
  taglineGrupo,
  nombreCategoria,
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
  { n: 1, t: "home.paso1t", d: "home.paso1d" },
  { n: 2, t: "home.paso2t", d: "home.paso2d" },
  { n: 3, t: "home.paso3t", d: "home.paso3d" },
];

const DIFERENCIADORES = [
  { icon: FileCheck2, color: "var(--bosque)", t: "home.dif1t", d: "home.dif1d" },
  { icon: Wallet, color: "var(--ambar)", t: "home.dif2t", d: "home.dif2d" },
  { icon: Lock, color: "var(--pacifico)", t: "home.dif3t", d: "home.dif3d" },
  { icon: Scale, color: "var(--pizarra)", t: "home.dif4t", d: "home.dif4d" },
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
  return {
    stats: stats.data,
    testimonios: testimonios.data ?? [],
    guia: guia.data ?? [],
    cargandoStats: enabled && stats.isLoading,
    cargandoTestimonios: enabled && testimonios.isLoading,
  };
}

function Home() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { t, idioma } = useT();
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);
  const [openCat, setOpenCat] = useState<CategoryId | null>(null);
  const visitante = !usuario;
  const { stats, testimonios, guia, cargandoStats, cargandoTestimonios } = useLandingData(visitante);

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
                    {t("home.titulo")}
                  </h1>
                  <p className="lead reveal reveal-2 mt-4 text-white/75 max-w-[48ch]">
                    {t("home.sub")}
                  </p>
                </>
              ) : (
                <>
                  <h1 id="hero-title" className="title-1 reveal reveal-1 text-white">
                    {firstName ? t("home.saludo", { nombre: firstName }) : t("home.hola")}
                  </h1>
                  <p className="reveal reveal-2 mt-1 text-base font-medium text-white/75">
                    {t("home.queNecesitas")}
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
                  {t("home.buscaLabel")}
                </label>
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#6B7280]"
                  aria-hidden
                />
                <input
                  id="buscar-servicio"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("home.buscarPlaceholder")}
                  autoComplete="off"
                  className="w-full h-14 md:h-16 pl-12 pr-4 md:pr-36 rounded-[10px] bg-white text-[#111827] placeholder:text-[#9CA3AF] text-base outline-none border-2 border-transparent focus:border-[#EF9F27] transition-colors shadow-float"
                />
                <button
                  type="submit"
                  className="btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex"
                >
                  {t("comun.buscar")}
                </button>

                {matches.length > 0 && (
                  <ul
                    className="absolute left-0 right-0 top-full mt-2 z-20 rounded-[14px] bg-white border border-[#E5E7EB] overflow-hidden text-[#111827] shadow-float"
                    aria-label={t("home.sugerencias")}
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
                            <span className="block text-xs text-[#6B7280]">{nombreCategoria(m.cat.id, idioma)}</span>
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
                <div className="text-sm font-medium text-white/60 mb-2">{t("home.masSolicitados")}</div>
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
                  aria-label={t("home.garantias")}
                >
                  <li className="inline-flex items-center gap-2">
                    <BadgeCheck className="size-4" style={{ color: "#34D399" }} aria-hidden />{" "}
                    {t("home.verificados")}
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4" style={{ color: "#67E8F9" }} aria-hidden />{" "}
                    {t("home.pagoProtegidoMP")}
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <Scale className="size-4 text-[#EF9F27]" aria-hidden /> {t("home.mediacion")}
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
              {t("home.queBuscas")}
            </h2>
            {visitante && (
              <p className="mt-2 text-[#6B7280]">
                {t("home.catsYServicios", { n: categories.length })}
              </p>
            )}
          </div>
          {!visitante && (
            <span className="text-xs text-[#6B7280] shrink-0">{t("home.categorias", { n: categories.length })}</span>
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
                    {nombreGrupo(g.id, idioma)}
                  </div>
                  <div className="text-xs md:text-[13px] text-[#6B7280] mt-1 line-clamp-2">
                    {taglineGrupo(g.id, idioma)}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] mt-1.5">
                    {t("home.catsServiciosCount", { c: cats.length, s: n })}
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
                  {t("home.noSabes")}
                </span>
                <span className="block text-xs md:text-[13px] text-[#6B7280] mt-1">
                  {t("home.noSabesSub")}
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
                <span className="block font-bold text-sm">{t("home.premium")}</span>
                <span className="block text-xs text-white/70">{t("home.premiumSub")}</span>
              </span>
              <ChevronRight className="size-5 text-[#EF9F27]" />
            </Link>
          ) : (
            <Link to="/ya" className="card card-link flex items-center gap-4 p-4 md:p-5 bg-[#FF3B6B] text-white border-transparent">
              <span className="size-11 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Zap className="size-5 text-white" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-sm">{t("home.urgente")}</span>
                <span className="block text-xs text-white/85">{t("home.urgenteSub")}</span>
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
                    {t("home.como")}
                  </h2>
                  <p className="mt-2 text-[#6B7280] max-w-[52ch]">
                    {t("home.comoSub")}
                  </p>
                </div>
                <Link to="/como-funciona" className="btn-secondary btn-sm mt-4 md:mt-0 shrink-0">
                  {t("home.verDetalle")}
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
                    <h3 className="title-3 mt-4 text-[#111827]">{t(p.t)}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{t(p.d)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* POR QUÉ HOMIE */}
          <section className="bg-white" aria-labelledby="porque-title">
            <div className="container-landing py-14 md:py-20">
              <h2 id="porque-title" className="title-2 text-[#111827]">
                {t("home.porque")}
              </h2>
              <p className="mt-2 text-[#6B7280] max-w-[52ch]">
                {t("home.porqueSub")}
              </p>
              <div className="mt-8 md:mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {DIFERENCIADORES.map(({ icon: Icon, color, t: tk, d }) => (
                  <article key={tk} className="card p-5 md:p-6">
                    <span
                      className="inline-flex size-11 items-center justify-center rounded-[10px] bg-[#F3F4F6]"
                      aria-hidden
                    >
                      <Icon className="size-5" style={{ color }} />
                    </span>
                    <h3 className="title-3 mt-4 text-[#111827]">{t(tk)}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{t(d)}</p>
                  </article>
                ))}
              </div>

              {/* Cifras */}
              {cargandoStats ? (
                <div className="mt-10 md:mt-12 border-t border-[#E5E7EB] pt-8"><StatsSkeleton items={4} /></div>
              ) : (
                <StatsRow stats={stats} />
              )}
            </div>
          </section>

          {/* TESTIMONIOS */}
          {cargandoTestimonios && (
            <section className="bg-[#F3F4F6]" aria-busy="true">
              <div className="container-landing py-14 md:py-20">
                <div className="skeleton h-7 w-64 rounded-lg" />
                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                  <TextoSkeleton lineas={4} />
                  <TextoSkeleton lineas={4} className="hidden md:block" />
                  <TextoSkeleton lineas={4} className="hidden lg:block" />
                </div>
              </div>
            </section>
          )}
          {testimonios.length > 0 && (
            <section className="bg-[#F3F4F6]" aria-labelledby="testimonios-title">
              <div className="container-landing py-14 md:py-20">
                <h2 id="testimonios-title" className="title-2 text-[#111827]">
                  {t("home.testimonios")}
                </h2>
                <p className="mt-2 text-[#6B7280]">
                  {t("home.testimoniosSub")}
                </p>
                <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                  {testimonios.map((ts) => {
                    const cat = categories.find((c) => c.id === ts.prestadores?.categoria_id);
                    return (
                      <li key={ts.id} className="card p-5 md:p-6 flex flex-col">
                        <Quote className="size-5 text-[#EF9F27]" aria-hidden />
                        <p className="mt-3 text-[15px] text-[#111827] leading-relaxed flex-1">
                          “{ts.comentario}”
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#111827] truncate">
                              {ts.cliente_nombre ?? t("home.clienteHomie")}
                            </div>
                            <div className="text-xs text-[#6B7280] truncate">
                              {ts.prestadores?.nombre
                                ? t("home.sobre", { nombre: ts.prestadores.nombre })
                                : t("home.servicioCompletado")}
                              {cat ? ` · ${nombreCategoria(cat.id, idioma)}` : ""}
                            </div>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#111827] shrink-0"
                            aria-label={t("home.deCinco", { n: ts.calificacion })}
                          >
                            <Star className="size-4 fill-[#EF9F27] text-[#EF9F27]" aria-hidden />{" "}
                            {ts.calificacion}
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
                  {t("home.preciosClaros")}
                </h2>
                <p className="mt-3 text-[#4B5563] leading-relaxed max-w-[48ch]">
                  {t("home.preciosClarosSub")}
                </p>
                <div className="mt-6 max-w-[380px]">
                  <TicketPrecio
                    compact
                    flat
                    servicio="Electricista"
                    detalle={t("home.detalleEnchufe")}
                    desde="$18.000"
                    hasta="$24.000"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="title-3 text-[#111827]">{t("home.guiaPrecios")}</h3>
                  <Link
                    to="/precios"
                    className="text-sm font-semibold text-[#0E7490] hover:underline underline-offset-4"
                  >
                    {t("home.verGuia")}
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
                                {cat ? nombreCategoria(cat.id, idioma) : t("home.servicio")} · {r.profesionales}{" "}
                                {r.profesionales === 1 ? t("comun.profesional") : t("comun.profesionales")}
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
                    {t("home.guiaVacia")}
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
                    {t("home.cotizaTitulo")}
                  </h2>
                  <p className="mt-3 text-[#4B5563] leading-relaxed">
                    {t("home.cotizaSub")}
                  </p>
                </div>
                <Link
                  to="/solicitar"
                  className="btn-primary mt-6 md:mt-0 shrink-0 w-full sm:w-auto"
                >
                  {t("home.pedirCotizaciones")}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-white" aria-labelledby="faq-title">
            <div className="container-landing py-14 md:py-20 grid gap-8 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-14">
              <div>
                <h2 id="faq-title" className="title-2 text-[#111827]">
                  {t("home.faq")}
                </h2>
                <p className="mt-2 text-[#6B7280]">
                  {t("home.faqSub")}
                </p>
              </div>
              <Faq items={FAQ_CLIENTES_BY_LANG[idioma]} />
            </div>
          </section>

          {/* CTA PROFESIONALES */}
          <section className="bg-[#F3F4F6]" aria-labelledby="pro-title">
            <div className="container-landing py-14 md:py-20">
              <div className="rounded-[24px] bg-[#111827] text-white p-6 md:p-10 overflow-hidden relative">
                <div className="absolute inset-0 bg-dots-soft pointer-events-none" aria-hidden />
                <div className="relative md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-10 md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[#EF9F27]">{t("home.paraPro")}</p>
                    <h2 id="pro-title" className="title-2 mt-2 text-white">
                      {t("home.proTitulo")}
                    </h2>
                    <p className="mt-3 text-white/75 leading-relaxed max-w-[52ch]">
                      {t("home.proSub")}
                    </p>
                    <Link
                      to="/registro"
                      search={{ tipo: "prestador" }}
                      className="btn-primary mt-6 w-full sm:w-auto"
                    >
                      {t("home.uneteBtn")}
                    </Link>
                  </div>
                  <ul className="mt-8 md:mt-0 space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <ShieldCheck className="size-5 mt-0.5 text-[#EF9F27] shrink-0" aria-hidden />
                      <span>{t("home.proLi1")}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Wallet className="size-5 mt-0.5 text-[#EF9F27] shrink-0" aria-hidden />
                      <span>{t("home.proLi2")}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Star className="size-5 mt-0.5 text-[#EF9F27] shrink-0" aria-hidden />
                      <span>{t("home.proLi3")}</span>
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
              <p className="text-sm font-semibold text-[#EF9F27]">{t("home.paraPro")}</p>
              <h2 className="title-2 mt-2 text-white">{t("home.proTitulo")}</h2>
              <p className="mt-2 text-sm text-white/75 leading-relaxed">
                {t("home.proSub")}
              </p>
              <Link
                to="/registro"
                search={{ tipo: "prestador" }}
                className="btn-primary mt-5 w-full sm:w-auto"
              >
                {t("home.uneteBtn")}
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
          aria-label={nombreGrupo(activeGroup.id, idioma)}
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
                  <activeGroup.icon className="size-3.5" aria-hidden /> {nombreGrupo(activeGroup.id, idioma)}
                </div>
                <h3 className="title-2 mt-2 text-[#111827]">{taglineGrupo(activeGroup.id, idioma)}</h3>
              </div>
              <button
                onClick={() => setOpenGroup(null)}
                className="p-2 rounded-full hover:bg-[#F3F4F6]"
                aria-label={t("comun.cerrar")}
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
                      <span className="block font-semibold text-sm text-[#111827]">{nombreCategoria(c.id, idioma)}</span>
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
          aria-label={nombreCategoria(active.id, idioma)}
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
                  {t("comun.nServicios", { n: active.services.length })}
                </div>
                <h3 className="title-2 mt-2 text-[#111827]">{nombreCategoria(active.id, idioma)}</h3>
              </div>
              <button
                onClick={() => setOpenCat(null)}
                className="p-2 rounded-full hover:bg-[#F3F4F6]"
                aria-label={t("comun.volver")}
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
  const { t } = useT();
  return (
    <Link to="/gas" className="card card-link flex items-center gap-4 p-4 md:p-5">
      <span
        className="size-12 rounded-[10px] bg-[#FF6B00] flex items-center justify-center shrink-0"
        aria-hidden
      >
        <Flame className="size-5 text-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-[15px] text-[#111827]">{t("home.sinGas")}</span>
        <span className="block text-sm text-[#6B7280] mt-0.5">
          {t("home.sinGasSub")}
        </span>
      </span>
      <ChevronRight className="size-5 text-[#9CA3AF] shrink-0" aria-hidden />
    </Link>
  );
}

function StatsRow({ stats }: { stats: Stats | null | undefined }) {
  const { t, idioma } = useT();
  const locale = idioma === "es" ? "es-CL" : idioma === "pt" ? "pt-BR" : idioma === "ht" ? "fr-HT" : "en-US";
  const pocos = !stats || stats.profesionales < 10;
  if (pocos) {
    return (
      <p className="mt-10 md:mt-12 inline-flex items-center gap-2 text-sm font-medium text-[#111827] bg-[#F3F4F6] rounded-full px-4 py-2">
        <BadgeCheck className="size-4" style={{ color: "var(--bosque)" }} aria-hidden />
        {t("home.nuevosPro")}
      </p>
    );
  }
  const items = [
    { v: stats.profesionales.toLocaleString(locale), l: t("home.statPro") },
    { v: stats.servicios_completados.toLocaleString(locale), l: t("home.statServicios") },
    { v: Number(stats.calificacion).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), l: t("home.statCalif") },
    { v: stats.resenas.toLocaleString(locale), l: t("home.statResenas") },
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
