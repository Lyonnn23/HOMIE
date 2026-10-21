import { Link } from "@tanstack/react-router";
import { HomieIcon, HomieWordmark } from "./Logo";

const COLUMNS: { title: string; links: { label: string; to: string; search?: Record<string, string> }[] }[] = [
  {
    title: "Homie",
    links: [
      { label: "Cómo funciona", to: "/como-funciona" },
      { label: "Guía de precios", to: "/precios" },
      { label: "Gas de emergencia", to: "/gas" },
      { label: "Seguridad", to: "/seguridad" },
    ],
  },
  {
    title: "Clientes",
    links: [
      { label: "Buscar un servicio", to: "/buscar" },
      { label: "Pedir cotizaciones", to: "/solicitar" },
      { label: "Centro de ayuda", to: "/ayuda" },
      { label: "Reclamos", to: "/reclamos" },
    ],
  },
  {
    title: "Profesionales",
    links: [
      { label: "Ofrecer mis servicios", to: "/registro", search: { tipo: "prestador" } },
      { label: "Requisitos y verificación", to: "/como-funciona" },
      { label: "Comisión y pagos", to: "/como-funciona" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos y condiciones", to: "/terminos" },
      { label: "Privacidad", to: "/privacidad" },
    ],
  },
];

function StoreBadge({ label, hint }: { label: string; hint: string }) {
  return (
    <a
      href="#"
      aria-label={`${label} (próximamente)`}
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
  const year = new Date().getFullYear();
  return (
    <footer className={`bg-[#111827] text-white ${className}`} aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Pie de página</h2>
      <div className="container-landing py-12 md:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 rounded-md">
              <HomieIcon size={32} />
              <HomieWordmark inverted className="text-lg" />
            </Link>
            <p className="mt-4 text-sm text-white/70 max-w-[32ch] leading-relaxed">
              Profesionales verificados a domicilio, con precio acordado antes y pago protegido.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StoreBadge hint="Descárgala en" label="App Store" />
              <StoreBadge hint="Disponible en" label="Google Play" />
            </div>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-bold text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      search={l.search as never}
                      className="text-sm text-white/70 hover:text-white transition-colors rounded-sm"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/60">
          <span>© {year} Homie SpA · Chile</span>
          <span>Pagos procesados por Mercado Pago. Homie actúa como intermediario entre clientes y profesionales.</span>
        </div>
      </div>
    </footer>
  );
}
