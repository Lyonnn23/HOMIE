import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LifeBuoy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/soporte")({
  head: () => ({ meta: [
    { name: "description", content: "Conversaciones de soporte con usuarios de Homie." },
    { property: "og:title", content: "Soporte — Admin Homie" },
    { property: "og:description", content: "Conversaciones de soporte con usuarios de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Soporte — Admin Homie" }] }),
  component: AdminSoporte,
});

interface Msg {
  id: string;
  usuario_id: string;
  de_admin: boolean;
  contenido: string;
  leido: boolean;
  created_at: string;
}
interface UsuarioMin { id: string; nombre: string; email: string | null; tipo: string }
interface Conversacion {
  usuario: UsuarioMin;
  ultimo: Msg;
  noLeidos: number; // mensajes del usuario sin leer por admin
  total: number;
}

function fecha(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

function AdminSoporte() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [abierta, setAbierta] = useState<string | null>(null);

  const isAdminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .in("role", ["admin", "superadmin"]);
      return (data ?? []).length > 0;
    },
  });

  const convQ = useQuery({
    queryKey: ["admin-soporte-conv"],
    enabled: isAdminQ.data === true,
    refetchInterval: 15_000,
    queryFn: async (): Promise<Conversacion[]> => {
      const { data, error } = await supabase
        .from("soporte_mensajes")
        .select("id, usuario_id, de_admin, contenido, leido, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const rows = (data ?? []) as Msg[];
      const porUsuario = new Map<string, { ultimo: Msg; noLeidos: number; total: number }>();
      for (const m of rows) {
        const cur = porUsuario.get(m.usuario_id);
        if (!cur) porUsuario.set(m.usuario_id, { ultimo: m, noLeidos: !m.de_admin && !m.leido ? 1 : 0, total: 1 });
        else {
          cur.total += 1;
          if (!m.de_admin && !m.leido) cur.noLeidos += 1;
        }
      }
      const ids = Array.from(porUsuario.keys());
      const usuarios = new Map<string, UsuarioMin>();
      if (ids.length > 0) {
        const { data: us } = await supabase.from("usuarios").select("id, nombre, email, tipo").in("id", ids);
        for (const u of (us ?? []) as UsuarioMin[]) usuarios.set(u.id, u);
      }
      return ids.map((id) => {
        const c = porUsuario.get(id)!;
        return { usuario: usuarios.get(id) ?? { id, nombre: "Usuario", email: null, tipo: "cliente" }, ...c };
      }).sort((a, b) => (b.noLeidos > 0 ? 1 : 0) - (a.noLeidos > 0 ? 1 : 0) || b.ultimo.created_at.localeCompare(a.ultimo.created_at));
    },
  });

  if (isAdminQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  }
  if (!isAdminQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta sección es solo para administradores.</p>
          <Link to="/" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-[#111827] text-white text-sm font-semibold">Ir al inicio</Link>
        </div>
      </div>
    );
  }

  const convs = convQ.data ?? [];
  const pendientes = convs.filter((c) => c.noLeidos > 0).length;
  const seleccionada = convs.find((c) => c.usuario.id === abierta) ?? null;

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-[#111827] text-white px-5 py-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"><ArrowLeft className="size-3.5" /> Panel</Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 mt-2"><LifeBuoy className="size-6 text-[#EF9F27]" /> Soporte</h1>
        <p className="text-sm text-white/70 mt-1">{convs.length} conversaciones · {pendientes} con mensajes sin leer</p>
      </header>

      <main className="px-5 py-6 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
        <section className={`${abierta ? "hidden md:block" : ""}`}>
          {convQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
          {convQ.error && <div className="card p-4 text-sm text-[#FF3B6B]">{(convQ.error as Error).message}</div>}
          {!convQ.isLoading && convs.length === 0 && (
            <div className="card p-6 text-sm text-muted-foreground text-center">Aún no hay conversaciones de soporte.</div>
          )}
          <div className="card divide-y divide-[#E5E7EB] overflow-hidden">
            {convs.map((c) => (
              <button
                key={c.usuario.id}
                onClick={() => setAbierta(c.usuario.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F9FAFB] ${abierta === c.usuario.id ? "bg-[#FFF6E5]" : ""}`}
              >
                <span className="size-9 rounded-full bg-[#111827] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {c.usuario.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-[#111827] truncate">{c.usuario.nombre}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{fecha(c.ultimo.created_at)}</span>
                  </span>
                  <span className="block text-[11px] text-muted-foreground truncate">{c.usuario.email ?? "sin email"} · {c.usuario.tipo}</span>
                  <span className="block text-xs text-[#374151] truncate mt-0.5">{c.ultimo.de_admin ? "Tú: " : ""}{c.ultimo.contenido}</span>
                </span>
                {c.noLeidos > 0 && (
                  <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#EF9F27] text-[#111827] text-[11px] font-bold flex items-center justify-center">{c.noLeidos}</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className={`${abierta ? "" : "hidden md:block"}`}>
          {seleccionada ? (
            <Hilo conv={seleccionada} onVolver={() => setAbierta(null)} onCambio={() => qc.invalidateQueries({ queryKey: ["admin-soporte-conv"] })} />
          ) : (
            <div className="card p-10 text-center text-sm text-muted-foreground">Selecciona una conversación.</div>
          )}
        </section>
      </main>
    </div>
  );
}

function Hilo({ conv, onVolver, onCambio }: { conv: Conversacion; onVolver: () => void; onCambio: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const uid = conv.usuario.id;

  const msgsQ = useQuery({
    queryKey: ["admin-soporte-hilo", uid],
    refetchInterval: 10_000,
    queryFn: async (): Promise<Msg[]> => {
      const { data, error } = await supabase
        .from("soporte_mensajes")
        .select("id, usuario_id, de_admin, contenido, leido, created_at")
        .eq("usuario_id", uid)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });
  const mensajesData = msgsQ.data;
  const mensajes = mensajesData ?? [];

  // Marcar como leídos los mensajes del usuario al abrir
  useEffect(() => {
    const ids = (mensajesData ?? []).filter((m) => !m.de_admin && !m.leido).map((m) => m.id);
    if (ids.length === 0) return;
    void supabase.from("soporte_mensajes").update({ leido: true }).in("id", ids).then(() => {
      qc.invalidateQueries({ queryKey: ["admin-soporte-hilo", uid] });
      onCambio();
    });
  }, [mensajesData, uid, qc, onCambio]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensajes.length]);

  const responder = useMutation({
    mutationFn: async (contenido: string) => {
      const { error } = await supabase.from("soporte_mensajes").insert({ usuario_id: uid, de_admin: true, contenido: contenido.slice(0, 2000) });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["admin-soporte-hilo", uid] });
      onCambio();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function send() {
    const t = text.trim();
    if (!t || responder.isPending) return;
    responder.mutate(t);
  }

  return (
    <div className="card overflow-hidden flex flex-col" style={{ minHeight: "60vh" }}>
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
        <button onClick={onVolver} className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-[#F5F5F0]" aria-label="Volver"><ArrowLeft className="size-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{conv.usuario.nombre}</div>
          <div className="text-[11px] text-muted-foreground truncate">{conv.usuario.email ?? "sin email"} · {conv.usuario.tipo}</div>
        </div>
        <span className="text-[11px] text-muted-foreground">{conv.total} mensajes</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 bg-[#F9FAFB] max-h-[55vh]">
        {msgsQ.isLoading && <div className="text-center py-6"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
        <div className="space-y-1.5">
          {mensajes.map((m) => (
            <div key={m.id} className={`flex ${m.de_admin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm ${m.de_admin ? "bg-[#111827] text-white rounded-br-md" : "bg-white text-[#111827] rounded-bl-md"}`}>
                <div className="text-sm whitespace-pre-wrap break-words">{m.contenido}</div>
                <div className={`text-[10px] mt-0.5 text-right ${m.de_admin ? "text-white/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {!m.de_admin && m.leido ? " · leído" : ""}
                  {m.de_admin && m.leido ? " · visto" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 border-t border-[#E5E7EB] flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          maxLength={2000}
          placeholder="Responder como Homie"
          className="flex-1 max-h-40 px-4 py-2.5 rounded-2xl bg-white border border-[#E5E7EB] outline-none focus:border-[#111827]/40 text-sm resize-none"
        />
        <button
          onClick={send}
          disabled={!text.trim() || responder.isPending}
          className="size-11 rounded-full bg-[#EF9F27] text-[#111827] flex items-center justify-center disabled:opacity-50"
          aria-label="Enviar"
        >
          {responder.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </div>
    </div>
  );
}
