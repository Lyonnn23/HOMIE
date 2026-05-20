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

// Servicios más solicitados (chips horizontales del hero)
const TOP_REQUESTED: { service: string; catId: CategoryId }[] = [
  { service: "Aseo del hogar", catId: "home" },
  { service: "Gasfíter", catId: "tech-fix" },
  { service: "Manicure y pedicure", catId: "beauty" },
  { service: "Paseo de perros", catId: "pets" },
  { service: "Electricista", catId: "tech-fix" },
  { service: "Peluquería", catId: "beauty" },
  { service: "Kinesiólogo", catId: "health" },
  { service: "Fotógrafo", catId: "events" },
];

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
      {/* HERO */}
      <section className="relative bg-[#111827] text-white px-5 pt-8 pb-8 -mt-px overflow-hidden">
        <div className="absolute inset-0 bg-dots-soft pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {firstName ? `¡Hola, ${firstName}!` : "¡Hola!"} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-[#FAC775]">¿Qué necesitas hoy?</p>

          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5" style={{ color: "#EF9F27" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar servicio..."
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-[#111827] placeholder:text-[#9CA3AF] text-base outline-none shadow-[0_4px_18px_-6px_rgba(0,0,0,0.45)] border border-transparent focus:border-[#EF9F27] transition"
              style={{ borderRadius: 16 }}
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

          {/* Más solicitados — scroll horizontal de chips */}
          {matches.length === 0 && (
            <div className="mt-6 -mx-5 px-5 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 w-max pb-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-white/60 pr-1">
                  Más solicitados
                </span>
                {TOP_REQUESTED.map(({ service, catId }) => {
                  const c = categories.find((x) => x.id === catId)!;
                  const Icon = c.icon;
                  return (
                    <button
                      key={service}
                      onClick={() => navigate({ to: "/servicio/$service", params: { service: encodeURIComponent(service) } })}
                      className="shrink-0 inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: c.bg }}
                    >
                      <span className="size-5 rounded-full bg-white/20 flex items-center justify-center">
                        <Icon className="size-3" />
                      </span>
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="px-5 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Categorías</h2>
          <span className="text-xs text-[#6B7280]">{categories.length} disponibles</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((c) => {
            const Icon = c.icon;
            const isOpen = openCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setOpenCat(isOpen ? null : c.id)}
                className={`group relative text-left rounded-2xl border border-[#E5E7EB] transition-transform active:scale-[0.98] overflow-hidden min-h-[160px] flex flex-col ${
                  isOpen ? "ring-2 ring-[#EF9F27]/40" : ""
                }`}
                style={{ backgroundColor: `${c.bg}0F` }}
              >
                {/* Franja superior sólida */}
                <div className="h-2 w-full" style={{ backgroundColor: c.bg }} />
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="size-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      <Icon className="size-6 text-white" />
                    </div>
                    <ChevronRight className="size-5" style={{ color: c.bg }} />
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="text-[15px] font-bold leading-tight text-[#111827]">{c.name}</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">{c.services.length} servicios</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* MODAL servicios */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in"
          onClick={() => setOpenCat(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${active.bg}26`, color: active.bg }}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: active.bg }} />
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
                  className="px-4 py-2.5 rounded-full text-sm font-medium transition"
                  style={{
                    backgroundColor: `${active.bg}14`,
                    color: active.bg,
                    border: `1.5px solid ${active.bg}`,
                  }}
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
