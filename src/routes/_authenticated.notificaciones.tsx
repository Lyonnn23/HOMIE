import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CalendarCheck, Truck, Star, XCircle, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";
import { localeDe } from "@/i18n/estados";

export const Route = createFileRoute("/_authenticated/notificaciones")({
  head: () => ({ meta: [
    { name: "description", content: "Avisos de reservas, cotizaciones y servicios de Homie." },
    { property: "og:title", content: "Notificaciones — Homie" },
    { property: "og:description", content: "Avisos de reservas, cotizaciones y servicios de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Notificaciones — Homie" }] }),
  component: NotificacionesPage,
});

interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  reserva_id: string | null;
  leida: boolean;
  created_at: string;
}

type TFn = (clave: string, vars?: Record<string, string | number>) => string;
function timeAgo(iso: string, t: TFn, locale: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t("notif.ahora");
  if (s < 3600) return t("notif.haceMin", { n: Math.floor(s / 60) });
  if (s < 86400) return t("notif.haceH", { n: Math.floor(s / 3600) });
  if (s < 604800) return t("notif.haceD", { n: Math.floor(s / 86400) });
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

function iconForTipo(tipo: string) {
  if (tipo.startsWith("estado_confirmada") || tipo === "nueva_reserva") return CalendarCheck;
  if (tipo.startsWith("estado_en_camino")) return Truck;
  if (tipo.startsWith("estado_completada")) return Star;
  if (tipo.startsWith("estado_rechazada") || tipo.startsWith("estado_cancelada")) return XCircle;
  if (tipo.startsWith("alerta")) return ShieldAlert;
  return Bell;
}

function NotificacionesPage() {
  const { t, idioma } = useT();
  const locale = localeDe(idioma);
  const { usuario } = useAuth();
  const usuarioId = usuario?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifs = [] } = useQuery({
    queryKey: ["notificaciones-page", usuarioId],
    enabled: !!usuarioId,
    queryFn: async (): Promise<Notif[]> => {
      const { data } = await supabase
        .from("notificaciones")
        .select("id, tipo, titulo, mensaje, reserva_id, leida, created_at")
        .eq("usuario_id", usuarioId!)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data as Notif[]) ?? [];
    },
  });

  useEffect(() => {
    if (!usuarioId) return;
    const ch = supabase
      .channel(`notif-page-${usuarioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${usuarioId}` },
        () => qc.invalidateQueries({ queryKey: ["notificaciones-page", usuarioId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [usuarioId, qc]);

  const unread = notifs.filter((n) => !n.leida).length;

  async function markAll() {
    if (!usuarioId || unread === 0) return;
    await supabase.from("notificaciones").update({ leida: true })
      .eq("usuario_id", usuarioId).eq("leida", false);
    qc.invalidateQueries({ queryKey: ["notificaciones-page", usuarioId] });
    qc.invalidateQueries({ queryKey: ["notificaciones", usuarioId] });
  }

  async function open(n: Notif) {
    if (!n.leida) {
      await supabase.from("notificaciones").update({ leida: true }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notificaciones-page", usuarioId] });
      qc.invalidateQueries({ queryKey: ["notificaciones", usuarioId] });
    }
    if (n.reserva_id) {
      navigate({ to: "/reservas" });
    }
  }

  // Group by day
  const groups: Array<{ label: string; items: Notif[] }> = [];
  for (const n of notifs) {
    const d = new Date(n.created_at);
    const today = new Date();
    const yest = new Date(); yest.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = t("notif.hoy");
    else if (d.toDateString() === yest.toDateString()) label = t("notif.ayer");
    else label = d.toLocaleDateString(locale, { day: "2-digit", month: "long" });
    const g = groups.find((g) => g.label === label);
    if (g) g.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="title-1">{t("notif.titulo")}</h1>
          {unread > 0 && (
            <p className="text-sm text-[#6B7280] mt-1">{t("notif.sinLeer", { n: unread })}</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F5F0] text-[#111827] text-xs font-semibold hover:bg-[#EF9F27]/15"
          >
            <Check className="size-3.5" /> {t("notif.marcarTodas")}
          </button>
        )}
      </header>

      <div className="px-5 pb-10">
        {notifs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto size-16 rounded-full bg-[#F5F5F0] flex items-center justify-center">
              <Bell className="size-7 text-[#9CA3AF]" />
            </div>
            <h2 className="mt-4 font-semibold">{t("notif.vacio")}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {t("notif.vacioSub")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.label}>
                <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
                  {g.label}
                </h2>
                <div className="space-y-2">
                  {g.items.map((n) => {
                    const Icon = iconForTipo(n.tipo);
                    return (
                      <button
                        key={n.id}
                        onClick={() => open(n)}
                        className={`w-full text-left p-4 rounded-2xl border transition ${
                          n.leida
                            ? "bg-white border-[#E5E7EB]"
                            : "bg-[#FAC77520] border-[#EF9F27]/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-full bg-[#111827] flex items-center justify-center shrink-0">
                            <Icon className="size-5 text-[#EF9F27]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#111827] truncate">
                                {n.titulo}
                              </span>
                              {!n.leida && <span className="size-2 rounded-full bg-[#EF9F27] shrink-0" />}
                            </div>
                            <p className="text-sm text-[#6B7280] mt-0.5 line-clamp-2">{n.mensaje}</p>
                            <div className="text-[11px] text-[#9CA3AF] mt-1">{timeAgo(n.created_at, t, locale)}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
