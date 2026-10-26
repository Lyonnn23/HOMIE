import { Link } from "@tanstack/react-router";
import { HomieIcon, HomieWordmark } from "./Logo";
import { useT } from "@/i18n";

/** Columnas del pie. `title`/`label` son claves del diccionario, salvo los nombres de marca (`literal`). */
const COLUMNS: { title: string; literal?: boolean; links: { label: string; literal?: boolean; to: string; search?: Record<string, string> }[] }[] = [
  {
    title: "Homie",
    literal: true,
    links: [
      { label: "footer.comoFunciona", to: "/como-funciona" },
      { label: "footer.guiaPrecios", to: "/precios" },
      { label: "footer.gasEmergencia", to: "/gas" },
      { label: "footer.seguridad", to: "/seguridad" },
    ],
  },
  {
    title: "footer.clientes",
    links: [
      { label: "footer.buscarServicio", to: "/buscar" },
      { label: "footer.homieYa", to: "/ya" },
      { label: "footer.pedirCotizaciones", to: "/solicitar" },
      { label: "footer.centroAyuda", to: "/ayuda" },
      { label: "footer.reclamos", to: "/reclamos" },
    ],
  },
  {
    title: "footer.profesionales",
    links: [
      { label: "footer.ofrecerServicios", to: "/registro", search: { tipo: "prestador" } },
      { label: "footer.requisitos", to: "/como-funciona" },
      { label: "footer.comision", to: "/como-funciona" },
      { label: "Homie Premium", literal: true, to: "/pro" },
    ],
  },
  {
    title: "footer.legal",
    links: [
      { label: "footer.terminos", to: "/terminos" },
      { label: "footer.privacidad", to: "/privacidad" },
    ],
  },
];

function StoreBadge({ label, hint, soon }: { label: string; hint: string; soon: string }) {
  return (
    <a
      href="#"
      aria-label={`${label} (${soon})`}
      onClick={(e) => e.preventDefault()}
      className="inline-flex items-center gap-2.5 h-11 px-4 rounded-[10px] border border-white/20 text-white hover:border-white/60 transition-colors"
    >
      <span className="size-6 rounded-md bg-white/10 flex items-center justify-center" aria-hidden>
        <span className="size-2.5 rounded-sm bg-white/70" />
      </span>
      <span className="leading-tight text-left">
        <span className="block text-[10px] text-white/60">{hint}</span>
        <span className="block text-sm font-semibold">{label}</span>
      </span>
    </a>
  );
}

export function SiteFooter({ className = "" }: { className?: string }) {
  const { t } = useT();
  const year = new Date().getFullYear();
  return (
    <footer className={`bg-[#111827] text-white ${className}`} aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">{t("footer.pie")}</h2>
      <div className="container-landing py-12 md:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 rounded-md">
              <HomieIcon size={32} />
              <HomieWordmark inverted className="text-lg" />
            </Link>
            <p className="mt-4 text-sm text-white/70 max-w-[32ch] leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StoreBadge hint={t("footer.descargala")} label="App Store" soon={t("footer.proximamente")} />
              <StoreBadge hint={t("footer.disponibleEn")} label="Google Play" soon={t("footer.proximamente")} />
            </div>
          </div>
          {COLUMNS.map((col) => {
            const title = col.literal ? col.title : t(col.title);
            return (
              <nav key={col.title} aria-label={title}>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        search={l.search as never}
                        className="text-sm text-white/70 hover:text-white transition-colors rounded-sm"
                      >
                        {l.literal ? l.label : t(l.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/60">
          <span>{t("footer.copyright", { year })}</span>
          <span>{t("footer.aviso")}</span>
        </div>
      </div>
    </footer>
  );
}
