import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BellRing, X } from "lucide-react";
import { estadoPush, pedirPermisoPush, pushDisponible } from "@/lib/push";
import { BottomNav } from "./BottomNav";
import { AccesibilidadBoton } from "./AccesibilidadBoton";
import { NotificationsBell } from "./NotificationsBell";
import { SiteFooter } from "./SiteFooter";
import { SelectorIdioma } from "./SelectorIdioma";
import { HomieIcon, HomieWordmark } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { TemaProvider, useTema } from "@/hooks/use-tema";
import { useT } from "@/i18n";

// Carga perezosa: el banner de "sin conexión" vive en su propio chunk.
const OfflineBanner = lazy(() =>
  import("./OfflineBanner").then((m) => ({ default: m.OfflineBanner })).catch(() => ({ default: () => null })),
);

const NAV: { key: string; to: string; search?: Record<string, string> }[] = [
  { key: "nav.buscar", to: "/buscar" },
  { key: "nav.comoFunciona", to: "/como-funciona" },
  { key: "nav.precios", to: "/precios" },
  { key: "nav.gas", to: "/gas" },
  { key: "nav.paraProfesionales", to: "/registro", search: { tipo: "prestador" } },
];

interface Props {
  children: ReactNode;
  /** Usa el contenedor ancho (1120px) para portada y páginas públicas. */
  wide?: boolean;
}

export function AppShell(props: Props) {
  return (
    <TemaProvider>
      <AppShellInner {...props} />
    </TemaProvider>
  );
}

function AppShellInner({ children, wide = false }: Props) {
  const { usuario, user } = useAuth();
  const { t } = useT();
  const loc = useLocation();
  // Asegura que el atributo data-theme se aplique en todas las pantallas.
  useTema();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-30 bg-[#111827] text-white">
        <div className="container-landing flex items-center justify-between gap-4 h-14 md:h-16">
          <Link to="/" className="flex items-center gap-2 rounded-md" aria-label={t("shell.inicioAria")}>
            <HomieIcon size={32} />
            <HomieWordmark inverted className="text-base" />
          </Link>

          <nav aria-label={t("shell.navPrincipal")} className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => {
              const active = loc.pathname === item.to;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  search={item.search as never}
                  className={`px-3 py-2 rounded-[10px] text-sm font-medium whitespace-nowrap transition-colors ${
                    active ? "text-white bg-white/10" : "text-white/75 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="flex items-center gap-1">
              <SelectorIdioma compacto />
              <NotificationsBell />
              <Link to="/cuenta" className="flex items-center gap-2 text-sm ml-1 text-white rounded-md">
                <span className="text-white/60 hidden sm:inline">{t("shell.hola")}</span>
                <span className="font-semibold">{usuario?.nombre?.split(" ")[0] ?? t("shell.tu")}</span>
                <span className="size-7 rounded-full bg-[#EF9F27] text-[#111827] flex items-center justify-center text-xs font-bold">
                  {(usuario?.nombre ?? "U").charAt(0).toUpperCase()}
                </span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SelectorIdioma compacto />
              <Link to="/login" className="text-sm font-semibold text-white/85 hover:text-white px-2 py-2 rounded-md">
                {t("nav.ingresar")}
              </Link>
              <Link to="/registro" className="btn-primary btn-sm hidden sm:inline-flex">
                {t("nav.crearCuenta")}
              </Link>
            </div>
          )}
        </div>
      </header>

      <Suspense fallback={null}>
        <OfflineBanner />
      </Suspense>

      {user && loc.pathname !== "/notif-config" && <PushBanner />}

      <main
        key={loc.pathname}
        className={`flex-1 page-enter ${wide ? "w-full pb-nav md:pb-0" : "mx-auto w-full max-w-2xl pb-nav md:pb-16"}`}
      >
        {children}
      </main>

      {/* El BottomNav es fijo en todas las pantallas: dejamos espacio bajo el footer. */}
      <SiteFooter className={wide ? "mb-[64px] lg:mb-0" : "hidden md:block mb-[64px]"} />
      {/* En la web de escritorio (visitantes) la navegación va en el header; el BottomNav es para la app. */}
      <div className={wide ? "lg:hidden" : ""}><BottomNav /></div>
      <AccesibilidadBoton />
    </div>
  );
}

const PUSH_BANNER_KEY = "homie_push_banner_ocultado";

/** Línea discreta para pedir permiso de push; se oculta al activar o al cerrar (localStorage). */
function PushBanner() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(PUSH_BANNER_KEY)) return;
    } catch { /* sin storage */ }
    if (pushDisponible() && estadoPush() === "default") setVisible(true);
  }, []);

  function cerrar() {
    setVisible(false);
    try { localStorage.setItem(PUSH_BANNER_KEY, "1"); } catch { /* ignorar */ }
  }

  async function activar() {
    const res = await pedirPermisoPush();
    if (res !== "default") cerrar();
  }

  if (!visible) return null;
  return (
    <div className="bg-[#FFF6E5] border-b border-[#EF9F27]/40 text-[#111827]">
      <div className="mx-auto max-w-5xl px-4 py-1.5 flex items-center gap-2 text-xs">
        <BellRing className="size-3.5 text-[#B45309] shrink-0" />
        <span className="flex-1 min-w-0 truncate">{t("shell.pushTexto")}</span>
        <button onClick={activar} className="shrink-0 px-2.5 py-1 rounded-lg bg-[#111827] text-white font-semibold">{t("shell.pushActivar")}</button>
        <button onClick={cerrar} aria-label={t("comun.cerrar")} className="shrink-0 p-1 rounded-md hover:bg-black/5"><X className="size-3.5" /></button>
      </div>
    </div>
  );
}
