import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, CalendarCheck, User, Briefcase, Zap, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const { usuario } = useAuth();
  const loc = useLocation();
  const isPrestador = usuario?.tipo === "prestador";

  const items: { to: string; label: string; icon: LucideIcon; accent?: boolean }[] = isPrestador
    ? [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/panel", label: "Panel", icon: Briefcase },
        { to: "/reservas", label: "Reservas", icon: CalendarCheck },
        { to: "/cuenta", label: "Perfil", icon: User },
      ]
    : [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/buscar", label: "Buscar", icon: Search },
        { to: "/ya", label: "Ya", icon: Zap, accent: true },
        { to: "/reservas", label: "Reservas", icon: CalendarCheck },
        { to: "/cuenta", label: "Perfil", icon: User },
      ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[#E5E7EB] bg-white">
      <div className={`mx-auto max-w-2xl grid ${items.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {items.map(({ to, label, icon: Icon, accent }) => {
          const active = to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 min-h-[52px] transition-colors select-none ${
                accent ? "text-[#FF3B6B]" : active ? "text-[#EF9F27]" : "text-[#9CA3AF] hover:text-[#111827]"
              }`}
            >
              {accent ? (
                <span className={`flex size-[26px] -mt-0.5 items-center justify-center rounded-full ${active ? "bg-[#FF3B6B] text-white" : "bg-[#FF3B6B]/15 text-[#FF3B6B]"}`}>
                  <Icon className="size-4 fill-current" />
                </span>
              ) : (
                <Icon className={`size-[22px] ${active ? "stroke-[2.5]" : ""}`} />
              )}
              <span className={`text-[10px] leading-none ${
                accent ? "font-bold text-[#FF3B6B]" : active ? "font-bold text-[#EF9F27]" : "font-medium text-[#9CA3AF]"
              }`}>
                {label}
              </span>
              {active && (
                <span className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full ${accent ? "bg-[#FF3B6B]" : "bg-[#EF9F27]"}`} />
              )}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}

