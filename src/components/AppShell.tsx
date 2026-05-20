import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/hooks/use-auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, user } = useAuth();
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_260)]">
      <div className="sticky top-0 z-30 bg-[oklch(0.985_0.003_260)]/90 backdrop-blur border-b border-border/60">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-5 h-12">
          <Link to="/" className="text-sm font-bold tracking-tight">Manitos</Link>
          {user ? (
            <Link to="/cuenta" className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hola,</span>
              <span className="font-semibold">{usuario?.nombre?.split(" ")[0] ?? "tú"}</span>
              <span className="size-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                {(usuario?.nombre ?? "U").charAt(0).toUpperCase()}
              </span>
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium underline underline-offset-4">
              Ingresar
            </Link>
          )}
        </div>
      </div>
      <main className="mx-auto max-w-2xl pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
