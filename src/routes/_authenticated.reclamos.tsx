import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, MessageSquareWarning, Lightbulb, Scale, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBookings, useProviderBookings, type Booking } from "@/store/bookings";
import { mensajeError } from "@/lib/errores";

export const Route = createFileRoute("/_authenticated/reclamos")({
  head: () => ({ meta: [
    { name: "description", content: "Tus reclamos, sugerencias y respuestas del equipo Homie." },
    { property: "og:title", content: "Reclamos y sugerencias — Homie" },
    { property: "og:description", content: "Tus reclamos, sugerencias y respuestas del equipo Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Reclamos y sugerencias — Homie" }] }),
  component: ReclamosPage,
});

type Tipo = "reclamo" | "sugerencia";

interface ReclamoRow {
  id: string;
  autor_id: string;
  tipo: string;
  reserva_id: string | null;
  asunto: string;
  detalle: string;
  estado: string;
  respuesta_admin: string | null;
  respondido_at: string | null;
  created_at: string;
}

const ESTADO_LABEL: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const ESTADO_STYLE: Record<string, string> = {
  abierto: "bg-[#FAC77540] text-[#854F0B]",
  en_revision: "bg-blue-100 text-blue-800",
  resuelto: "bg-[#00C28820] text-[#00754F]",
  cerrado: "bg-[#F5F5F0] text-[#6B7280]",
};

function ReclamosPage() {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const clienteBookings = useBookings();
  const { bookings: prestadorBookings } = useProviderBookings();

  const bookings = useMemo<Booking[]>(() => {
    const map = new Map<string, Booking>();
    for (const b of [...clienteBookings, ...prestadorBookings]) map.set(b.id, b);
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [clienteBookings, prestadorBookings]);

  const [tipo, setTipo] = useState<Tipo>("reclamo");
  const [reservaId, setReservaId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [errores, setErrores] = useState<{ asunto?: string; detalle?: string }>({});

  const misReclamos = useQuery({
    queryKey: ["reclamos", "mios", usuario?.id],
    enabled: !!usuario?.id,
    queryFn: async (): Promise<ReclamoRow[]> => {
      const { data, error } = await supabase
        .from("reclamos")
        .select("id, autor_id, tipo, reserva_id, asunto, detalle, estado, respuesta_admin, respondido_at, created_at")
        .eq("autor_id", usuario!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReclamoRow[];
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!usuario?.id) throw new Error("Debes iniciar sesión");
      const { error } = await supabase.from("reclamos").insert({
        autor_id: usuario.id,
        tipo,
        reserva_id: reservaId || null,
        asunto: asunto.trim(),
        detalle: detalle.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tipo === "reclamo" ? "Reclamo enviado. Te responderemos pronto." : "¡Gracias por tu sugerencia!");
      setAsunto("");
      setDetalle("");
      setReservaId("");
      setErrores({});
      qc.invalidateQueries({ queryKey: ["reclamos", "mios"] });
    },
    onError: (e: Error) => toast.error(mensajeError(e, "No se pudo enviar el reclamo.")),
  });

  const validar = () => {
    const err: typeof errores = {};
    const a = asunto.trim();
    const d = detalle.trim();
    if (a.length < 3 || a.length > 120) err.asunto = "El asunto debe tener entre 3 y 120 caracteres.";
    if (d.length < 10 || d.length > 2000) err.detalle = "El detalle debe tener entre 10 y 2000 caracteres.";
    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    enviar.mutate();
  };

  const bookingLabel = (b: Booking) => {
    const quien = b.clientId === usuario?.id ? `con ${b.providerName}` : `para ${b.clientName}`;
    return `${b.service} · ${b.date} ${b.time} · ${quien}`;
  };

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4">
        <h1 className="title-1">Reclamos y sugerencias</h1>
        <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
          Si tuviste un problema con un servicio, Homie actúa como mediador entre cliente y profesional. También puedes
          dejarnos sugerencias.
        </p>
      </header>

      <section className="px-5">
        <div className="p-4 rounded-2xl bg-[#111827] text-white flex items-start gap-3">
          <Scale className="size-5 text-[#EF9F27] shrink-0 mt-0.5" />
          <p className="text-sm text-white/80">
            Nuestro equipo revisa cada caso, contacta a ambas partes y busca una solución justa. Te responderemos aquí
            mismo.
          </p>
        </div>
      </section>

      <section className="px-5 mt-6">
        <form onSubmit={onSubmit} className="p-5 rounded-2xl bg-white border border-border space-y-4" noValidate>
          <fieldset>
            <legend className="text-sm font-semibold mb-2">¿Qué quieres enviar?</legend>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#F5F5F0]" role="radiogroup">
              <SegBtn active={tipo === "reclamo"} onClick={() => setTipo("reclamo")} icon={MessageSquareWarning} label="Reclamo" />
              <SegBtn active={tipo === "sugerencia"} onClick={() => setTipo("sugerencia")} icon={Lightbulb} label="Sugerencia" />
            </div>
          </fieldset>

          <div>
            <label htmlFor="reserva" className="block text-sm font-semibold mb-1">
              Reserva relacionada <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <select
              id="reserva"
              value={reservaId}
              onChange={(e) => setReservaId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-white text-sm"
            >
              <option value="">Sin reserva específica</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {bookingLabel(b)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="asunto" className="block text-sm font-semibold mb-1">
              Asunto
            </label>
            <input
              id="asunto"
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              maxLength={120}
              placeholder={tipo === "reclamo" ? "Ej: El profesional no llegó a la hora" : "Ej: Me gustaría poder pagar en cuotas"}
              aria-invalid={!!errores.asunto}
              aria-describedby={errores.asunto ? "asunto-error" : undefined}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-white text-sm"
            />
            {errores.asunto && (
              <p id="asunto-error" className="mt-1 text-xs text-destructive">{errores.asunto}</p>
            )}
          </div>

          <div>
            <label htmlFor="detalle" className="block text-sm font-semibold mb-1">
              Detalle
            </label>
            <textarea
              id="detalle"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Cuéntanos qué pasó con el mayor detalle posible."
              aria-invalid={!!errores.detalle}
              aria-describedby={errores.detalle ? "detalle-error" : "detalle-hint"}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-white text-sm resize-y"
            />
            {errores.detalle ? (
              <p id="detalle-error" className="mt-1 text-xs text-destructive">{errores.detalle}</p>
            ) : (
              <p id="detalle-hint" className="mt-1 text-xs text-muted-foreground">{detalle.trim().length}/2000</p>
            )}
          </div>

          <button
            type="submit"
            disabled={enviar.isPending}
            className="w-full h-12 inline-flex items-center justify-center gap-2 px-5 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold text-sm disabled:opacity-50"
          >
            {enviar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {tipo === "reclamo" ? "Enviar reclamo" : "Enviar sugerencia"}
          </button>
        </form>
      </section>

      <section className="px-5 mt-8 pb-10">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mis envíos</h2>
        {misReclamos.isLoading && (
          <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>
        )}
        {misReclamos.data && misReclamos.data.length === 0 && (
          <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            Aún no has enviado reclamos ni sugerencias.
          </div>
        )}
        <div className="space-y-2">
          {misReclamos.data?.map((r) => (
            <ReclamoCard key={r.id} r={r} reserva={bookings.find((b) => b.id === r.reserva_id)} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function SegBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Lightbulb;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
        active ? "bg-[#111827] text-white" : "text-[#111827] hover:bg-white"
      }`}
    >
      <Icon className={`size-4 ${active ? "text-[#EF9F27]" : ""}`} /> {label}
    </button>
  );
}

function ReclamoCard({ r, reserva }: { r: ReclamoRow; reserva?: Booking }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">
            {r.tipo === "reclamo" ? "Reclamo" : "Sugerencia"}
          </div>
          <div className="font-semibold truncate">{r.asunto}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString("es-CL")}</div>
          {reserva && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Reserva: {reserva.service} · {reserva.date}
            </div>
          )}
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_STYLE[r.estado] ?? ESTADO_STYLE.abierto}`}>
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </span>
      </div>
      <p className="mt-3 text-sm text-[#111827] whitespace-pre-wrap">{r.detalle}</p>
      {r.respuesta_admin && (
        <div className="mt-3 p-3 rounded-xl bg-[#F5F5F0] border-l-4 border-[#EF9F27]">
          <div className="text-xs font-bold text-[#111827]">Respuesta de Homie</div>
          <p className="mt-1 text-sm text-[#111827] whitespace-pre-wrap">{r.respuesta_admin}</p>
          {r.respondido_at && (
            <div className="mt-1 text-[10px] text-muted-foreground">{new Date(r.respondido_at).toLocaleString("es-CL")}</div>
          )}
        </div>
      )}
    </div>
  );
}
