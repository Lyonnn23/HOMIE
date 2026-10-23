import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LifeBuoy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/soporte")({
  head: () => ({ meta: [
    { name: "description", content: "Habla con el equipo de soporte de Homie directamente desde la app." },
    { property: "og:title", content: "Soporte Homie" },
    { property: "og:description", content: "Habla con el equipo de soporte de Homie directamente desde la app." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Soporte — Homie" }] }),
  component: SoportePage,
});

interface SoporteMsg {
  id: string;
  usuario_id: string;
  de_admin: boolean;
  contenido: string;
  leido: boolean;
  created_at: string;
}

const TEMAS: { label: string; texto: string }[] = [
  { label: "Problema con un pago", texto: "Hola, tengo un problema con un pago: " },
  { label: "Problema con un profesional", texto: "Hola, tuve un problema con un profesional: " },
  { label: "Mi verificación", texto: "Hola, tengo una consulta sobre mi verificación: " },
  { label: "Otro", texto: "Hola, necesito ayuda con: " },
];

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

function SoportePage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: mensajesData, isLoading } = useQuery({
    queryKey: ["soporte-mensajes", usuario?.id],
    enabled: !!usuario?.id,
    refetchInterval: 10_000,
    queryFn: async (): Promise<SoporteMsg[]> => {
      const { data, error } = await supabase
        .from("soporte_mensajes")
        .select("id, usuario_id, de_admin, contenido, leido, created_at")
        .eq("usuario_id", usuario!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SoporteMsg[];
    },
  });

  const mensajes = mensajesData ?? [];

  // Marcar como leídas las respuestas de Homie al abrir / al llegar nuevas
  useEffect(() => {
    const pendientes = (mensajesData ?? []).filter((m) => m.de_admin && !m.leido).map((m) => m.id);
    if (pendientes.length === 0) return;
    void supabase.from("soporte_mensajes").update({ leido: true }).in("id", pendientes).then(() => {
      qc.invalidateQueries({ queryKey: ["soporte-mensajes"] });
      qc.invalidateQueries({ queryKey: ["notificaciones"] });
    });
  }, [mensajesData, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensajes.length]);

  const enviar = useMutation({
    mutationFn: async (contenido: string) => {
      if (!usuario?.id) throw new Error("Sin sesión");
      const { error } = await supabase.from("soporte_mensajes").insert({
        usuario_id: usuario.id,
        de_admin: false,
        contenido: contenido.slice(0, 2000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["soporte-mensajes"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo enviar"),
  });

  function send() {
    const t = text.trim();
    if (!t || enviar.isPending) return;
    enviar.mutate(t);
  }

  const grouped: Array<{ date: string; items: SoporteMsg[] }> = [];
  for (const m of mensajes) {
    const key = formatFechaSep(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === key) last.items.push(m);
    else grouped.push({ date: key, items: [m] });
  }

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-3">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-full hover:bg-[#F5F5F0]" aria-label="Volver">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="mt-3 text-2xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="size-6 text-[#EF9F27]" /> Soporte Homie
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">Respondemos en menos de 24 h (lun–sáb).</p>
        <div className="mt-2 flex gap-3 text-xs">
          <Link to="/reclamos" className="underline underline-offset-2 text-[#111827]">Reclamos y sugerencias</Link>
          <Link to="/ayuda" className="underline underline-offset-2 text-[#111827]">Preguntas frecuentes</Link>
        </div>
      </header>

      <div ref={scrollRef} className="px-5 py-3 min-h-[40vh] max-h-[55vh] overflow-y-auto bg-[#F5F5F0] rounded-2xl mx-5 border border-[#E5E7EB]">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : mensajes.length === 0 ? (
          <div className="text-center text-sm text-[#6B7280] py-10">
            Cuéntanos qué pasó. Elige un tema o escribe tu mensaje.
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.date} className="space-y-1.5 mb-2">
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 bg-white rounded-full text-[10px] font-medium text-[#6B7280] shadow-sm">{g.date}</span>
              </div>
              {g.items.map((m) => (
                <div key={m.id} className={`flex ${m.de_admin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm ${m.de_admin ? "bg-white text-[#111827] rounded-bl-md" : "bg-[#111827] text-white rounded-br-md"}`}>
                    {m.de_admin && <div className="text-[10px] font-semibold text-[#B45309] mb-0.5">Homie</div>}
                    <div className="text-sm whitespace-pre-wrap break-words">{m.contenido}</div>
                    <div className={`text-[10px] mt-0.5 text-right ${m.de_admin ? "text-[#6B7280]" : "text-white/70"}`}>{formatHora(m.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="px-5 mt-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2" aria-label="Temas frecuentes">
          {TEMAS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => { setText(t.texto); inputRef.current?.focus(); }}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-xs font-medium text-[#111827] hover:bg-[#FFF6E5]"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            maxLength={2000}
            placeholder="Escribe tu mensaje"
            className="flex-1 max-h-40 px-4 py-2.5 rounded-2xl bg-white border border-[#E5E7EB] outline-none focus:border-[#111827]/40 text-sm resize-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || enviar.isPending}
            className="size-11 rounded-full bg-[#EF9F27] text-[#111827] flex items-center justify-center disabled:opacity-50"
            aria-label="Enviar"
          >
            {enviar.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[#6B7280]">Te avisaremos con una notificación cuando respondamos.</p>
      </div>
    </AppShell>
  );
}
