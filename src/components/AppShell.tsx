import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { AccesibilidadBoton } from "./AccesibilidadBoton";
import { NotificationsBell } from "./NotificationsBell";
import { SiteFooter } from "./SiteFooter";
import { HomieIcon, HomieWordmark } from "./Logo";
import { useAuth } from "@/hooks/use-auth";

const NAV: { label: string; to: string; search?: Record<string, string> }[] = [
  { label: "Buscar", to: "/buscar" },
  { label: "Cómo funciona", to: "/como-funciona" },
  { label: "Precios", to: "/precios" },
  { label: "Gas", to: "/gas" },
  { label: "Para profesionales", to: "/registro", search: { tipo: "prestador" } },
];

interface Props {
  children: ReactNode;
  /** Usa el contenedor ancho (1120px) para portada y páginas públicas. */
  wide?: boolean;
}

export function AppShell({ children, wide = false }: Props) {
  const { usuario, user } = useAuth();
  const loc = useLocation();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-30 bg-[#111827] text-white">
        <div className="container-landing flex items-center justify-between gap-4 h-14 md:h-16">
          <Link to="/" className="flex items-center gap-2 rounded-md" aria-label="Homie, inicio">
            <HomieIcon size={32} />
            <HomieWordmark inverted className="text-base" />
          </Link>

          <nav aria-label="Principal" className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => {
              const active = loc.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  search={item.search as never}
                  className={`px-3 py-2 rounded-[10px] text-sm font-medium whitespace-nowrap transition-colors ${
                    active ? "text-white bg-white/10" : "text-white/75 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="flex items-center gap-1">
              <NotificationsBell />
              <Link to="/cuenta" className="flex items-center gap-2 text-sm ml-1 text-white rounded-md">
                <span className="text-white/60 hidden sm:inline">Hola,</span>
                <span className="font-semibold">{usuario?.nombre?.split(" ")[0] ?? "tú"}</span>
                <span className="size-7 rounded-full bg-[#EF9F27] text-[#111827] flex items-center justify-center text-xs font-bold">
                  {(usuario?.nombre ?? "U").charAt(0).toUpperCase()}
                </span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-sm font-semibold text-white/85 hover:text-white px-2 py-2 rounded-md">
                Ingresar
              </Link>
              <Link to="/registro" className="btn-primary btn-sm hidden sm:inline-flex">
                Crear cuenta
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className={`flex-1 ${wide ? "w-full pb-24 md:pb-0" : "mx-auto w-full max-w-2xl pb-28 md:pb-16"}`}>
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
