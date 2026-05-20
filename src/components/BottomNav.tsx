import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, CalendarCheck, User, Briefcase } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const { usuario } = useAuth();
  const loc = useLocation();
  const isPrestador = usuario?.tipo === "prestador";

  const items = isPrestador
    ? [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/panel", label: "Panel", icon: Briefcase },
        { to: "/reservas", label: "Reservas", icon: CalendarCheck },
        { to: "/cuenta", label: "Perfil", icon: User },
      ] as const
    : [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/buscar", label: "Buscar", icon: Search },
        { to: "/reservas", label: "Reservas", icon: CalendarCheck },
        { to: "/cuenta", label: "Perfil", icon: User },
      ] as const;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-2xl grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 transition-colors ${
                active ? "text-[#EF9F27]" : "text-[#9CA3AF] hover:text-[#111827]"
              }`}
            >
              <Icon className={`size-[22px] ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] leading-none ${active ? "font-bold text-[#EF9F27]" : "font-medium text-[#9CA3AF]"}`}>
                {label}
              </span>
              {active && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#EF9F27]" />
              )}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

