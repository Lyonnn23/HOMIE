import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, ImageIcon, Loader2, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { comprimirImagen } from "@/lib/imagen";

const QUICK_PRESTADOR = ["Voy en camino", "Llego en 15 min", "Ya llegué", "¿Puedes confirmar la dirección?"];
const QUICK_CLIENTE = ["¿A qué hora llegas?", "Te espero", "Llámame al llegar"];

/** Cache pequeño de URLs firmadas del bucket privado `chat` (válidas 1 h, se renuevan a los 50 min). */
const fotoCache = new Map<string, { url: string; exp: number }>();
async function urlFirmadaChat(path: string): Promise<string | null> {
  const hit = fotoCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from("chat").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  fotoCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

function FotoChat({ path }: { path: string }) {
  const { data: url, isError } = useQuery({
    queryKey: ["chat-foto", path],
    staleTime: 50 * 60 * 1000,
    retry: false,
    queryFn: () => urlFirmadaChat(path),
  });
  if (!url) {
    return (
      <div className="w-48 h-36 rounded-xl bg-black/5 flex items-center justify-center text-muted-foreground">
        {isError ? <ImageIcon className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img src={url} alt="Foto enviada en el chat" className="max-w-full w-56 rounded-xl object-cover" loading="lazy" />
    </a>
  );
}

export const Route = createFileRoute("/_authenticated/chat/$reservaId")({
  head: () => ({ meta: [
    { name: "description", content: "Conversación entre cliente y profesional sobre una reserva de Homie." },
    { property: "og:title", content: "Chat — Homie" },
    { property: "og:description", content: "Conversación entre cliente y profesional sobre una reserva de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Chat — Homie" }] }),
  component: ChatPage,
});

interface Mensaje {
  id: string;
  reserva_id: string;
  remitente_id: string;
  contenido: string;
  created_at: string;
  foto_url: string | null;
  lat: number | null;
  lng: number | null;
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
  const { usuario, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data: reserva } = useQuery({
    queryKey: ["reserva-chat", reservaId],
    queryFn: async (): Promise<ReservaInfo | null> => {
      const { data } = await supabase
        .from("reservas")
        .select(`
          id, cliente_id, prestador_id, prestador_usuario_id,
          prestador_nombre, prestador_foto_url,
          cliente_nombre, cliente_foto_url
        `)
        .eq("id", reservaId)
        .maybeSingle();
      if (!data) return null;
      const r = data as any;
      return {
        id: r.id,
        cliente_id: r.cliente_id,
        prestador_id: r.prestador_id,
        prestador_usuario: r.prestador_usuario_id
          ? { id: r.prestador_usuario_id, nombre: r.prestador_nombre ?? "Prestador", foto_url: r.prestador_foto_url ?? null }
          : null,
        cliente: { id: r.cliente_id, nombre: r.cliente_nombre ?? "Cliente", foto_url: r.cliente_foto_url ?? null },
      };
    },
  });

  const { data: mensajes = [] } = useQuery({
    queryKey: ["mensajes", reservaId],
    queryFn: async (): Promise<Mensaje[]> => {
      const { data } = await supabase
        .from("mensajes")
        .select("id, reserva_id, remitente_id, contenido, created_at, foto_url, lat, lng")
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

  const esCliente = !!usuario && usuario.id === reserva?.cliente_id;
  const quick = esCliente ? QUICK_CLIENTE : QUICK_PRESTADOR;

  async function send(contenido?: string) {
    const t = (contenido ?? text).trim();
    if (!t || !usuario || sending) return;
    setSending(true);
    const { error } = await supabase.from("mensajes").insert({
      reserva_id: reservaId,
      remitente_id: usuario.id,
      contenido: t.slice(0, 2000),
    });
    setSending(false);
    if (!error) {
      if (contenido === undefined) setText("");
      qc.invalidateQueries({ queryKey: ["mensajes", reservaId] });
    } else {
      toast.error("No se pudo enviar el mensaje");
    }
  }

  async function enviarFoto(file: File) {
    if (!usuario || !user || subiendo) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se pueden enviar imágenes"); return; }
    setSubiendo(true);
    try {
      const comprimida = await comprimirImagen(file);
      const path = `${user.id}/${reservaId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("chat").upload(path, comprimida, {
        contentType: comprimida.type || "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error } = await supabase.from("mensajes").insert({
        reserva_id: reservaId,
        remitente_id: usuario.id,
        contenido: "📷 Foto",
        foto_url: path,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["mensajes", reservaId] });
    } catch (e) {
      toast.error((e as Error).message || "No se pudo enviar la foto");
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function compartirUbicacion() {
    if (!usuario || subiendo) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Tu dispositivo no permite compartir ubicación");
      return;
    }
    setSubiendo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const { error } = await supabase.from("mensajes").insert({
          reserva_id: reservaId,
          remitente_id: usuario.id,
          contenido: "📍 Mi ubicación",
          lat,
          lng,
        });
        setSubiendo(false);
        if (error) toast.error("No se pudo compartir la ubicación");
        else qc.invalidateQueries({ queryKey: ["mensajes", reservaId] });
      },
      () => {
        setSubiendo(false);
        toast.error("No pudimos obtener tu ubicación. Revisa el permiso del navegador.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
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
                      {m.foto_url ? (
                        <FotoChat path={m.foto_url} />
                      ) : m.lat != null && m.lng != null ? (
                        <a
                          href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 text-sm underline underline-offset-2 ${mine ? "text-white" : "text-emerald-700"}`}
                        >
                          <MapPin className="size-4 shrink-0" />
                          <span>
                            <span className="block font-medium">Ubicación compartida</span>
                            <span className={`block text-[11px] no-underline ${mine ? "text-white/80" : "text-muted-foreground"}`}>Abrir en Google Maps</span>
                          </span>
                        </a>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words">{m.contenido}</div>
                      )}
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
        {reserva && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2" aria-label="Respuestas rápidas">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={sending}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-border text-xs font-medium text-foreground hover:bg-emerald-50 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarFoto(f); }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={subiendo}
            className="size-11 rounded-full bg-white border border-border text-emerald-700 flex items-center justify-center disabled:opacity-50"
            aria-label="Enviar foto"
          >
            {subiendo ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
          </button>
          <button
            type="button"
            onClick={compartirUbicacion}
            disabled={subiendo}
            className="size-11 rounded-full bg-white border border-border text-emerald-700 flex items-center justify-center disabled:opacity-50"
            aria-label="Compartir mi ubicación"
          >
            <MapPin className="size-5" />
          </button>
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
            onClick={() => send()}
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
