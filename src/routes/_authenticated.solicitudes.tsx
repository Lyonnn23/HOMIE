import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, ChevronRight, Zap, MessageSquareQuote, Loader2, ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCategory, formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/solicitudes")({
  head: () => ({ meta: [
    { name: "description", content: "Tus solicitudes de servicios y cotizaciones en Homie." },
    { property: "og:title", content: "Mis solicitudes — Homie" },
    { property: "og:description", content: "Tus solicitudes de servicios y cotizaciones en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Mis solicitudes — Homie" }] }),
  component: SolicitudesPage,
});

const ESTADO_SOLICITUD: Record<string, { label: string; cls: string }> = {
  abierta: { label: "Abierta", cls: "bg-[#00C28820] text-[#00754F]" },
  adjudicada: { label: "Adjudicada", cls: "bg-[#EF9F27]/20 text-[#854F0B]" },
  cerrada: { label: "Cerrada", cls: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", cls: "bg-[#FF3B6B20] text-[#FF3B6B]" },
};

type Row = {
  id: string; titulo: string; categoria_id: string; estado: string; urgente: boolean;
  comuna: string | null; fecha_deseada: string | null; presupuesto_max: number | null;
  fotos: string[]; created_at: string; expira_at: string;
  cotizaciones: { count: number }[] | null;
};

function fmtFecha(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function SolicitudesPage() {
  const { usuario } = useAuth();
  const q = useQuery({
    queryKey: ["solicitudes", "mias", usuario?.id],
    enabled: !!usuario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitudes")
        .select("id, titulo, categoria_id, estado, urgente, comuna, fecha_deseada, presupuesto_max, fotos, created_at, expira_at, cotizaciones(count)")
        .eq("cliente_id", usuario!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
  const rows = q.data ?? [];

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis solicitudes</h1>
          <p className="text-sm text-muted-foreground mt-1">Cotizaciones que pediste a profesionales</p>
        </div>
        <Link
          to="/solicitar"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#111827] text-white text-sm font-semibold"
        >
          <Plus className="size-4" /> Nueva
        </Link>
      </header>

      {q.isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="size-5 mx-auto animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="px-5 mt-10 text-center">
          <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center">
            <MessageSquareQuote className="size-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">Aún no pides cotizaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe lo que necesitas y recibe propuestas de profesionales verificados. Gratis y sin compromiso.
          </p>
          <Link to="/solicitar" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold text-sm">
            Pedir cotizaciones
          </Link>
        </div>
      ) : (
        <div className="px-5 space-y-2 pb-6">
          {rows.map((r) => {
            const cat = getCategory(r.categoria_id);
            const n = r.cotizaciones?.[0]?.count ?? 0;
            const st = ESTADO_SOLICITUD[r.estado] ?? ESTADO_SOLICITUD.cerrada;
            const fecha = fmtFecha(r.fecha_deseada);
            return (
              <Link
                key={r.id}
                to="/solicitudes/$id"
                params={{ id: r.id }}
                className="block p-4 rounded-2xl bg-white border border-border hover:bg-muted/30 transition"
              >
                <div className="flex items-start gap-3">
                  {r.fotos?.[0] ? (
                    <img src={r.fotos[0]} alt="" className="size-14 rounded-xl object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="size-14 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: `${cat?.bg ?? "#111827"}1A` }}>
                      {cat ? <cat.icon className="size-6" style={{ color: cat.bg }} /> : <ImageIcon className="size-5 text-muted-foreground" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm leading-snug line-clamp-2">{r.titulo}</div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {cat?.name}{r.comuna ? ` · ${r.comuna}` : ""}{fecha ? ` · ${fecha}` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                      {r.urgente && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FF3B6B] text-white text-[11px] font-semibold">
                          <Zap className="size-3" /> Urgente
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${n > 0 ? "bg-[#111827] text-white" : "bg-muted text-muted-foreground"}`}>
                        <FileText className="size-3" /> {n} {n === 1 ? "cotización" : "cotizaciones"}
                      </span>
                      {r.presupuesto_max ? (
                        <span className="text-[11px] text-muted-foreground">hasta {formatCLP(r.presupuesto_max)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
