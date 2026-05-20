import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/chat/$reservaId")({
  head: () => ({ meta: [{ title: "Chat — Manitos" }] }),
  component: ChatPage,
});

interface Mensaje {
  id: string;
  reserva_id: string;
  remitente_id: string;
  contenido: string;
  created_at: string;
}

interface ReservaInfo {
  id: string;
  cliente_id: string;
  prestador_id: string;
  prestador_usuario: { id: string; nombre: string; foto_url: string | null } | null;
  cliente: { id: string; nombre: string; foto_url: string | null } | null;
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
function formatFechaSep(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "long" });
}

function ChatPage() {
  const { reservaId } = Route.useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data: reserva } = useQuery({
    queryKey: ["reserva-chat", reservaId],
    queryFn: async (): Promise<ReservaInfo | null> => {
      const { data } = await supabase
        .from("reservas")
        .select(`
          id, cliente_id, prestador_id,
          prestadores!inner ( usuarios!inner ( id, nombre, foto_url ) ),
          usuarios!reservas_cliente_id_fkey ( id, nombre, foto_url )
        `)
        .eq("id", reservaId)
        .maybeSingle();
      if (!data) return null;
      // Fallback: separately fetch participants if join shape differs
      const r = data as any;
      let prestUsuario = r.prestadores?.usuarios ?? null;
      let cliente = r.usuarios ?? null;
      if (!prestUsuario) {
        const { data: p } = await supabase
          .from("prestadores").select("usuarios ( id, nombre, foto_url )")
          .eq("id", r.prestador_id).maybeSingle();
        prestUsuario = (p as any)?.usuarios ?? null;
      }
      if (!cliente) {
        const { data: c } = await supabase
          .from("usuarios").select("id, nombre, foto_url")
          .eq("id", r.cliente_id).maybeSingle();
        cliente = c ?? null;
      }
      return {
        id: r.id, cliente_id: r.cliente_id, prestador_id: r.prestador_id,
        prestador_usuario: prestUsuario, cliente,
      };
    },
  });

  const { data: mensajes = [] } = useQuery({
    queryKey: ["mensajes", reservaId],
    queryFn: async (): Promise<Mensaje[]> => {
      const { data } = await supabase
        .from("mensajes")
        .select("id, reserva_id, remitente_id, contenido, created_at")
        .eq("reserva_id", reservaId)
        .order("created_at", { ascending: true });
      return (data as Mensaje[]) ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`chat-${reservaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes", filter: `reserva_id=eq.${reservaId}` },
        () => qc.invalidateQueries({ queryKey: ["mensajes", reservaId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reservaId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensajes.length]);

  const otro = usuario?.id === reserva?.cliente_id ? reserva?.prestador_usuario : reserva?.cliente;

  async function send() {
    const t = text.trim();
    if (!t || !usuario || sending) return;
    setSending(true);
    const { error } = await supabase.from("mensajes").insert({
      reserva_id: reservaId,
      remitente_id: usuario.id,
      contenido: t.slice(0, 2000),
    });
    setSending(false);
    if (!error) {
      setText("");
      qc.invalidateQueries({ queryKey: ["mensajes", reservaId] });
    }
  }

  // Group messages by date
  const grouped: Array<{ date: string; items: Mensaje[] }> = [];
  for (const m of mensajes) {
    const key = formatFechaSep(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === key) last.items.push(m);
    else grouped.push({ date: key, items: [m] });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.96_0.02_140)]">
      <header className="sticky top-0 z-30 bg-emerald-700 text-white">
        <div className="mx-auto max-w-2xl flex items-center gap-3 px-3 h-14">
          <button onClick={() => navigate({ to: "/reservas" })} className="p-2 -ml-1 rounded-full hover:bg-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <div className="size-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold overflow-hidden">
            {otro?.foto_url ? (
              <img src={otro.foto_url} alt="" className="size-full object-cover" />
            ) : (
              (otro?.nombre ?? "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{otro?.nombre ?? "Chat"}</div>
            <div className="text-[11px] text-white/80">en línea</div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 mx-auto w-full max-w-2xl">
        {mensajes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground mt-10">
            Aún no hay mensajes. ¡Saluda para coordinar tu servicio!
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.date} className="space-y-1.5 mb-2">
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 bg-white/80 backdrop-blur rounded-full text-[10px] font-medium text-muted-foreground shadow-sm">
                  {g.date}
                </span>
              </div>
              {g.items.map((m) => {
                const mine = m.remitente_id === usuario?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${
                        mine
                          ? "bg-emerald-500 text-white rounded-br-md"
                          : "bg-white text-foreground rounded-bl-md"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">{m.contenido}</div>
                      <div className={`text-[10px] mt-0.5 text-right ${mine ? "text-white/80" : "text-muted-foreground"}`}>
                        {formatHora(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="sticky bottom-0 bg-[oklch(0.96_0.02_140)] border-t border-border/60 px-3 py-2 mx-auto w-full max-w-2xl">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Mensaje"
            className="flex-1 max-h-32 px-4 py-2.5 rounded-3xl bg-white border border-border outline-none focus:border-foreground/30 text-sm resize-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="size-11 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
