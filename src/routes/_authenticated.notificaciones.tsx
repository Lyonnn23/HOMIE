import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CalendarCheck, Truck, Star, XCircle, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notificaciones")({
  head: () => ({ meta: [{ title: "Notificaciones — Homie" }] }),
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

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
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
    if (d.toDateString() === today.toDateString()) label = "Hoy";
    else if (d.toDateString() === yest.toDateString()) label = "Ayer";
    else label = d.toLocaleDateString("es-CL", { day: "2-digit", month: "long" });
    const g = groups.find((g) => g.label === label);
    if (g) g.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          {unread > 0 && (
            <p className="text-sm text-[#6B7280] mt-1">{unread} sin leer</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F5F0] text-[#111827] text-xs font-semibold hover:bg-[#EF9F27]/15"
          >
            <Check className="size-3.5" /> Marcar todas
          </button>
        )}
      </header>

      <div className="px-5 pb-10">
        {notifs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto size-16 rounded-full bg-[#F5F5F0] flex items-center justify-center">
              <Bell className="size-7 text-[#9CA3AF]" />
            </div>
            <h2 className="mt-4 font-semibold">Sin notificaciones</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Te avisaremos cuando tengas novedades en tus reservas.
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
                            <div className="text-[11px] text-[#9CA3AF] mt-1">{timeAgo(n.created_at)}</div>
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
