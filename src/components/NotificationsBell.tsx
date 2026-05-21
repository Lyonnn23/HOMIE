import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
  return `hace ${Math.floor(s / 86400)} d`;
}

export function NotificationsBell() {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  const { data: notifs = [] } = useQuery({
    queryKey: ["notificaciones", usuarioId],
    enabled: !!usuarioId,
    queryFn: async (): Promise<Notif[]> => {
      const { data } = await supabase
        .from("notificaciones")
        .select("id, tipo, titulo, mensaje, reserva_id, leida, created_at")
        .eq("usuario_id", usuarioId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as Notif[]) ?? [];
    },
  });

  useEffect(() => {
    if (!usuarioId) return;
    const ch = supabase
      .channel(`notif-${usuarioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${usuarioId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["notificaciones", usuarioId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [usuarioId, qc]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = notifs.filter((n) => !n.leida).length;

  async function markAllRead() {
    if (!usuarioId || unread === 0) return;
    await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("usuario_id", usuarioId)
      .eq("leida", false);
    qc.invalidateQueries({ queryKey: ["notificaciones", usuarioId] });
  }

  async function openNotif(n: Notif) {
    if (!n.leida) {
      await supabase.from("notificaciones").update({ leida: true }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notificaciones", usuarioId] });
    }
    setOpen(false);
    if (n.reserva_id) navigate({ to: "/reservas" });
  }

  if (!usuarioId) return null;

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-muted transition"
        aria-label="Notificaciones"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#FF3B6B] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-2xl shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notificaciones</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <Check className="size-3" /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Sin notificaciones aún</div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotif(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/50 transition ${
                    !n.leida ? "bg-[#FAC77520]" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.leida && <span className="mt-1.5 size-2 rounded-full bg-[#EF9F27] shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{n.titulo}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.mensaje}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <Link
            to="/notificaciones"
            onClick={() => setOpen(false)}
            className="block text-center px-4 py-3 border-t border-border text-xs font-semibold text-[#EF9F27] hover:bg-[#EF9F27]/5"
          >
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  );
}
