import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_260)]">
      <main className="mx-auto max-w-2xl pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
