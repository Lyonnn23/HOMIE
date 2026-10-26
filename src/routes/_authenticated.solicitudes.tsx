import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, ChevronRight, Zap, MessageSquareQuote, ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EstadoVacio } from "@/components/EstadoVacio";
import { ListaSkeleton } from "@/components/Skeletons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCategory, formatCLP } from "@/data/services";
import { SolicitudFoto } from "@/components/SolicitudFoto";
import { useT } from "@/i18n";
import { localeDe } from "@/i18n/estados";

export const Route = createFileRoute("/_authenticated/solicitudes")({
  head: () => ({ meta: [
    { name: "description", content: "Tus solicitudes de servicios y cotizaciones en Homie." },
    { property: "og:title", content: "Mis solicitudes — Homie" },
    { property: "og:description", content: "Tus solicitudes de servicios y cotizaciones en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Mis solicitudes — Homie" }] }),
  component: SolicitudesLayout,
});

function SolicitudesLayout() {
  const children = useChildMatches();
  return <>{children.length === 0 && <SolicitudesPage />}<Outlet /></>;
}

const ESTADO_SOLICITUD: Record<string, { label: string; cls: string }> = {
  abierta: { label: "solicitudes.abierta", cls: "bg-[#00C28820] text-[#00754F]" },
  adjudicada: { label: "solicitudes.adjudicada", cls: "bg-[#EF9F27]/20 text-[#854F0B]" },
  cerrada: { label: "solicitudes.cerrada", cls: "bg-muted text-muted-foreground" },
  cancelada: { label: "solicitudes.cancelada", cls: "bg-[#FF3B6B20] text-[#FF3B6B]" },
};

type Row = {
  id: string; titulo: string; categoria_id: string; estado: string; urgente: boolean;
  comuna: string | null; fecha_deseada: string | null; presupuesto_max: number | null;
  fotos: string[]; created_at: string; expira_at: string;
  cotizaciones: { count: number }[] | null;
};

function fmtFecha(iso: string | null, locale = "es-CL") {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function SolicitudesPage() {
  const { t, idioma } = useT();
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
      <header className="px-5 pt-6 pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="title-1">{t("solicitudes.titulo")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("solicitudes.sub")}</p>
        </div>
        <Link
          to="/solicitar"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#111827] text-white text-sm font-semibold"
        >
          <Plus className="size-4" /> {t("solicitudes.nueva")}
        </Link>
      </header>

      {q.isLoading ? (
        <ListaSkeleton items={4} conAvatar={false} className="px-5" />
      ) : rows.length === 0 ? (
        <EstadoVacio
          icon={MessageSquareQuote}
          titulo={t("solicitudes.vacio")}
          descripcion={t("solicitudes.vacioDesc")}
          accion={{ label: t("solicitudes.pedir"), to: "/solicitar" }}
        />
      ) : (
        <div className="px-5 space-y-2 pb-6">
          {rows.map((r) => {
            const cat = getCategory(r.categoria_id);
            const n = r.cotizaciones?.[0]?.count ?? 0;
            const st = ESTADO_SOLICITUD[r.estado] ?? ESTADO_SOLICITUD.cerrada;
            const fecha = fmtFecha(r.fecha_deseada, localeDe(idioma));
            return (
              <Link
                key={r.id}
                to="/solicitudes/$id"
                params={{ id: r.id }}
                className="block p-4 rounded-2xl bg-white border border-border hover:bg-muted/30 transition"
              >
                <div className="flex items-start gap-3">
                  {r.fotos?.[0] ? (
                    <SolicitudFoto foto={r.fotos[0]} className="size-14 rounded-lg shrink-0" />
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
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{t(st.label)}</span>
                      {r.urgente && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FF3B6B] text-white text-[11px] font-semibold">
                          <Zap className="size-3" /> {t("solicitudes.urgente")}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${n > 0 ? "bg-[#111827] text-white" : "bg-muted text-muted-foreground"}`}>
                        <FileText className="size-3" /> {n} {n === 1 ? t("solicitudes.cotizacion") : t("solicitudes.cotizaciones")}
                      </span>
                      {r.presupuesto_max ? (
                        <span className="text-[11px] text-muted-foreground">{t("solicitudes.hasta", { monto: formatCLP(r.presupuesto_max) })}</span>
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
