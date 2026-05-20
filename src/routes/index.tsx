import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ChevronRight, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { categories, type CategoryId } from "@/data/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manitos — Servicios a domicilio" },
      { name: "description", content: "Encuentra prestadores de servicios a domicilio: belleza, limpieza, técnicos, salud, mascotas y más." },
      { property: "og:title", content: "Manitos — Servicios a domicilio" },
      { property: "og:description", content: "Encuentra prestadores a domicilio en minutos." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openCat, setOpenCat] = useState<CategoryId | null>(null);

  const allServices = useMemo(
    () => categories.flatMap((c) => c.services.map((s) => ({ service: s, cat: c }))),
    [],
  );
  const matches = query.trim().length > 0
    ? allServices.filter((x) => x.service.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const active = openCat ? categories.find((c) => c.id === openCat) : null;

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <p className="text-sm text-muted-foreground">Hola 👋</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">¿Qué necesitas hoy?</h1>
      </header>

      <div className="px-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué servicio necesitas?"
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border border-border text-base outline-none focus:border-foreground/30 transition"
          />
        </div>
        {matches.length > 0 && (
          <div className="mt-2 rounded-2xl bg-white border border-border overflow-hidden">
            {matches.map((m) => (
              <button
                key={m.service}
                onClick={() => navigate({ to: "/servicio/$service", params: { service: encodeURIComponent(m.service) } })}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/60 text-left"
              >
                <div>
                  <div className="text-sm font-medium">{m.service}</div>
                  <div className="text-xs text-muted-foreground">{m.cat.name}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="px-5 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Categorías</h2>
          <span className="text-xs text-muted-foreground">{categories.length} disponibles</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => {
            const Icon = c.icon;
            const isOpen = openCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setOpenCat(isOpen ? null : c.id)}
                className={`relative text-left p-4 rounded-3xl transition-transform active:scale-[0.98] ${isOpen ? "ring-2 ring-foreground/20" : ""}`}
                style={{ backgroundColor: c.bg }}
              >
                <div className="size-10 rounded-2xl bg-white/70 flex items-center justify-center mb-6">
                  <Icon className="size-5 text-foreground/80" />
                </div>
                <div className="font-semibold text-sm leading-tight">{c.name}</div>
                <div className="text-xs text-foreground/60 mt-1">{c.services.length} servicios</div>
              </button>
            );
          })}
        </div>
      </section>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setOpenCat(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: active.bg }}>
                  {active.services.length} servicios
                </div>
                <h3 className="mt-2 text-2xl font-bold">{active.name}</h3>
              </div>
              <button onClick={() => setOpenCat(null)} className="p-2 rounded-full hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {active.services.map((s) => (
                <Link
                  key={s}
                  to="/servicio/$service"
                  params={{ service: encodeURIComponent(s) }}
                  className="px-4 py-2.5 rounded-full text-sm font-medium border border-border hover:bg-muted transition"
                  style={{ backgroundColor: active.bg + "80" }}
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
