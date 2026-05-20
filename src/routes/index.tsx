import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { categories, type CategoryId } from "@/data/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homie — Servicios a domicilio" },
      { name: "description", content: "Encuentra prestadores de servicios a domicilio: belleza, limpieza, técnicos, salud, mascotas y más." },
      { property: "og:title", content: "Homie — Servicios a domicilio" },
      { property: "og:description", content: "Encuentra prestadores a domicilio en minutos." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
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
  const firstName = usuario?.nombre?.split(" ")[0];

  return (
    <AppShell>
      <section className="bg-[#111827] text-white px-5 pt-8 pb-10 -mt-px">
        <p className="text-sm text-white/70">
          {firstName ? `¡Hola, ${firstName}!` : "¡Hola!"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">¿Qué necesitas hoy?</h1>
        <p className="mt-1 text-sm text-[#EF9F27]">Tu hogar, en buenas manos.</p>

        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5" style={{ color: "#EF9F27" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué servicio necesitas?"
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-[#111827] placeholder:text-gray-400 border border-transparent text-base outline-none focus:border-[#EF9F27] transition"
          />
        </div>
        {matches.length > 0 && (
          <div className="mt-2 rounded-2xl bg-white border border-border overflow-hidden text-[#111827]">
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
                <ChevronRight className="size-4" style={{ color: m.cat.bg }} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="px-5 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Categorías</h2>
          <span className="text-xs text-muted-foreground">{categories.length} disponibles</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((c) => {
            const Icon = c.icon;
            const isOpen = openCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setOpenCat(isOpen ? null : c.id)}
                className={`relative text-left p-4 rounded-2xl border border-border transition-transform active:scale-[0.98] overflow-hidden ${isOpen ? "ring-2 ring-[#EF9F27]/40" : ""}`}
                style={{
                  backgroundColor: `${c.bg}1F`,
                  borderLeft: `3px solid ${c.bg}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: c.bg }}
                  >
                    <Icon className="size-5 text-white" />
                  </div>
                  <ChevronRight className="size-5" style={{ color: c.bg }} />
                </div>
                <div className="font-bold text-sm leading-tight mt-4 text-[#111827]">{c.name}</div>
                <div className="text-xs text-gray-500 mt-1">{c.services.length} servicios</div>
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
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${active.bg}26`, color: active.bg }}>
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
                  style={{ backgroundColor: `${active.bg}1A`, color: "#111827" }}
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
