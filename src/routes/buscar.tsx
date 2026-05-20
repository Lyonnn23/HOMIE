import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { categories } from "@/data/services";

export const Route = createFileRoute("/buscar")({
  head: () => ({ meta: [{ title: "Buscar servicios — Manitos" }] }),
  component: Buscar,
});

function Buscar() {
  const [q, setQ] = useState("");
  const all = useMemo(
    () => categories.flatMap((c) => c.services.map((s) => ({ service: s, cat: c }))),
    [],
  );
  const filtered = q.trim()
    ? all.filter((x) => x.service.toLowerCase().includes(q.toLowerCase()))
    : all;

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Buscar</h1>
      </header>
      <div className="px-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar servicio..."
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
          />
        </div>
      </div>
      <div className="px-5 mt-6 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base">Sin resultados</p>
            <p className="text-sm mt-1">Prueba con otra palabra</p>
          </div>
        ) : (
          filtered.map(({ service, cat }) => (
            <Link
              key={service}
              to="/servicio/$service"
              params={{ service: encodeURIComponent(service) }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border hover:bg-muted/40 transition"
            >
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cat.bg }}
              >
                <cat.icon className="size-5 text-foreground/80" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{service}</div>
                <div className="text-xs text-muted-foreground">{cat.name}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
