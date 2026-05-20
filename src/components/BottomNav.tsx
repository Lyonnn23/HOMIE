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
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-2xl grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`size-5 ${active ? "stroke-[2.4]" : ""}`} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
