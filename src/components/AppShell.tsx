import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { NotificationsBell } from "./NotificationsBell";
import { HomieIcon, HomieWordmark } from "./Logo";
import { useAuth } from "@/hooks/use-auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, user } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 bg-[#111827] text-white border-b border-black/20">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-5 h-14">
          <Link to="/" className="flex items-center gap-2">
            <HomieIcon size={32} />
            <HomieWordmark inverted className="text-base" />
          </Link>
          {user ? (
            <div className="flex items-center gap-1">
              <NotificationsBell />
              <Link to="/cuenta" className="flex items-center gap-2 text-sm ml-1 text-white">
                <span className="text-white/60 hidden sm:inline">Hola,</span>
                <span className="font-semibold">{usuario?.nombre?.split(" ")[0] ?? "tú"}</span>
                <span className="size-7 rounded-full bg-[#EF9F27] text-[#111827] flex items-center justify-center text-xs font-bold">
                  {(usuario?.nombre ?? "U").charAt(0).toUpperCase()}
                </span>
              </Link>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-[#EF9F27]">
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
