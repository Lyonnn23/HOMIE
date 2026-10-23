import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Zap, MapPin, CalendarDays, Wallet, Loader2, ShieldAlert, ChevronDown, Check, Inbox, FileText, X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EstadoVacio } from "@/components/EstadoVacio";
import { ListaSkeleton } from "@/components/Skeletons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCategory, formatCLP, RANGO_MAX_FACTOR } from "@/data/services";
import { SolicitudFoto } from "@/components/SolicitudFoto";

export const Route = createFileRoute("/_authenticated/cotizar")({
  head: () => ({ meta: [
    { name: "description", content: "Solicitudes de servicios y cotizaciones para profesionales de Homie." },
    { property: "og:title", content: "Cotizar solicitudes — Homie" },
    { property: "og:description", content: "Solicitudes de servicios y cotizaciones para profesionales de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Cotizar solicitudes — Homie" }] }),
  component: CotizarPage,
});

const inputCls =
  "w-full px-4 py-3 rounded-2xl bg-white border border-border text-sm outline-none focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20";
const ESTADO_COT: Record<string, { label: string; cls: string }> = {
  enviada: { label: "Enviada", cls: "bg-blue-100 text-blue-800" },
  aceptada: { label: "Aceptada", cls: "bg-[#00C28820] text-[#00754F]" },
  rechazada: { label: "Rechazada", cls: "bg-muted text-muted-foreground" },
  retirada: { label: "Retirada", cls: "bg-muted text-muted-foreground" },
};

type Solicitud = {
  id: string; categoria_id: string; titulo: string; detalle: string; fotos: string[]; comuna: string | null;
  fecha_deseada: string | null; urgente: boolean; presupuesto_max: number | null; estado: string; created_at: string; expira_at: string;
  servicios: { nombre: string } | null;
};
type MiCotizacion = {
  id: string; solicitud_id: string; precio: number; precio_hasta: number; mensaje: string; disponible_desde: string | null; estado: string; created_at: string;
  solicitudes: { id: string; titulo: string; comuna: string | null; estado: string; categoria_id: string } | null;
};

function fmtFecha(iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!iso) return null;
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CL", opts);
}
function timeAgo(iso: string) {
  const m = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

type Tab = "abiertas" | "mias";

function CotizarPage() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<Tab>("abiertas");
  const [foto, setFoto] = useState<string | null>(null);
  const usuarioId = usuario?.tipo === "prestador" ? usuario.id : undefined;

  const prestadorQ = useQuery({
    queryKey: ["prestador-cotizar", usuarioId],
    enabled: !!usuarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestadores")
        .select("id, categoria_id, verificado, suspendido")
        .eq("usuario_id", usuarioId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const prestador = prestadorQ.data;

  const abiertasQ = useQuery({
    queryKey: ["solicitudes", "abiertas", prestador?.id],
    enabled: !!prestador?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitudes")
        .select("id, categoria_id, titulo, detalle, fotos, comuna, fecha_deseada, urgente, presupuesto_max, estado, created_at, expira_at, servicios(nombre)")
        .eq("estado", "abierta")
        .gt("expira_at", new Date().toISOString())
        .order("urgente", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Solicitud[];
    },
  });

  const miasQ = useQuery({
    queryKey: ["cotizaciones", "mias", prestador?.id],
    enabled: !!prestador?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("id, solicitud_id, precio, precio_hasta, mensaje, disponible_desde, estado, created_at, solicitudes(id, titulo, comuna, estado, categoria_id)")
        .eq("prestador_id", prestador!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MiCotizacion[];
    },
  });

  const cotizadas = useMemo(() => {
    const m = new Map<string, MiCotizacion>();
    for (const c of miasQ.data ?? []) if (!m.has(c.solicitud_id)) m.set(c.solicitud_id, c);
    return m;
  }, [miasQ.data]);

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <header className="px-5 pt-6 pb-4"><h1 className="title-1">Cotizar</h1></header>
        <div className="px-5">
          <div className="p-5 rounded-3xl bg-white border border-border">
            <div className="font-semibold">Esta sección es para profesionales</div>
            <p className="mt-1 text-sm text-muted-foreground">¿Necesitas un servicio? Pide cotizaciones y elige la mejor propuesta.</p>
            <Link to="/solicitar" className="mt-4 inline-flex w-full h-12 items-center justify-center px-5 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold text-sm">
              Pedir cotizaciones
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const loading = prestadorQ.isLoading || (tab === "abiertas" ? abiertasQ.isLoading : miasQ.isLoading);
  const noVerificado = !!prestador && !prestador.verificado;
  const cat = prestador ? getCategory(prestador.categoria_id) : undefined;

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-6 pb-5">
        <h1 className="title-1 text-white">Cotizar</h1>
        <p className="text-sm text-white/70 mt-1">
          Solicitudes abiertas en {cat ? cat.name : "tu rubro"}. Cotiza y consigue clientes nuevos.
        </p>
        <div className="mt-4 flex gap-1 p-1 rounded-2xl bg-white/10">
          {([
            { key: "abiertas", label: "Abiertas", n: abiertasQ.data?.length },
            { key: "mias", label: "Mis cotizaciones", n: miasQ.data?.length },
          ] as { key: Tab; label: string; n?: number }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${tab === t.key ? "bg-white text-[#111827]" : "text-white/80"}`}
            >
              {t.label}{typeof t.n === "number" ? ` (${t.n})` : ""}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 mt-5 pb-10 space-y-3">
        {noVerificado && (
          <Link to="/verificar-identidad" className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAC77540] border border-[#EF9F27]/40">
            <ShieldAlert className="size-5 text-[#854F0B] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-[#854F0B]">Verifica tu identidad para cotizar</div>
              <div className="text-xs text-[#854F0B]/80 mt-0.5">Solo los profesionales verificados ven las solicitudes y pueden enviar cotizaciones. Toca para verificarte.</div>
            </div>
          </Link>
        )}

        {loading ? (
          <ListaSkeleton items={3} conAvatar={false} />
        ) : !prestador ? (
          <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            Completa tu perfil de profesional para cotizar.
            <Link to="/onboarding-prestador" className="block mt-2 text-foreground font-medium underline">Completar perfil</Link>
          </div>
        ) : tab === "abiertas" ? (
          (abiertasQ.data ?? []).length === 0 ? (
            <Empty icon={Inbox} title="No hay solicitudes abiertas" sub={noVerificado ? "Cuando estés verificado verás las solicitudes de tu rubro aquí." : "Te avisaremos cuando un cliente publique algo en tu rubro."} />
          ) : (
            (abiertasQ.data ?? []).map((s) => (
              <SolicitudCard key={s.id} s={s} prestadorId={prestador.id} mia={cotizadas.get(s.id)} onFoto={setFoto} />
            ))
          )
        ) : (miasQ.data ?? []).length === 0 ? (
          <Empty icon={FileText} title="Aún no has cotizado" sub="Revisa las solicitudes abiertas y envía tu primera propuesta." />
        ) : (
          (miasQ.data ?? []).map((c) => <MiCotizacionCard key={c.id} c={c} />)
        )}
      </div>

      {foto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFoto(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white" aria-label="Cerrar"><X className="size-5" /></button>
          <img src={foto} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </AppShell>
  );
}

function Empty({ icon, title, sub }: { icon: typeof Inbox; title: string; sub: string }) {
  return <EstadoVacio icon={icon} titulo={title} descripcion={sub} className="py-8" />;
}

function SolicitudCard({ s, prestadorId, mia, onFoto }: { s: Solicitud; prestadorId: string; mia?: MiCotizacion; onFoto: (u: string) => void }) {
  const [open, setOpen] = useState(false);
  const cat = getCategory(s.categoria_id);
  return (
    <div className="rounded-3xl bg-white border border-border overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {s.urgente && <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FF3B6B] text-white text-[11px] font-semibold"><Zap className="size-3" /> Urgente</span>}
            {mia && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#00C28820] text-[#00754F] text-[11px] font-semibold">
                <Check className="size-3" /> Ya cotizaste
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{timeAgo(s.created_at)}</span>
          </div>
          <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-1.5 font-semibold leading-snug">{s.titulo}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{s.servicios?.nombre ?? cat?.name}</div>
        <p className={`mt-2 text-sm text-[#374151] whitespace-pre-wrap ${open ? "" : "line-clamp-2"}`}>{s.detalle}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {s.comuna ?? "Comuna no indicada"}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {fmtFecha(s.fecha_deseada) ?? "Fecha flexible"}</span>
          <span className="inline-flex items-center gap-1"><Wallet className="size-3.5" /> {s.presupuesto_max ? `Hasta ${formatCLP(s.presupuesto_max)}` : "Sin presupuesto"}</span>
        </div>
      </button>

      {s.fotos?.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {s.fotos.map((f) => (
            <SolicitudFoto key={f} foto={f} onOpen={onFoto} className="size-16 shrink-0 rounded-lg" />
          ))}
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {mia ? (
            <div className="p-3 rounded-2xl bg-[#F5F5F0] text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Tu cotización</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${(ESTADO_COT[mia.estado] ?? ESTADO_COT.enviada).cls}`}>
                  {(ESTADO_COT[mia.estado] ?? ESTADO_COT.enviada).label}
                </span>
              </div>
              <div className="mt-1 font-bold text-[#111827]">
                {formatCLP(mia.precio)}{mia.precio_hasta > mia.precio ? ` – ${formatCLP(mia.precio_hasta)}` : ""}
              </div>
              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{mia.mensaje}</p>
            </div>
          ) : (
            <QuoteForm s={s} prestadorId={prestadorId} onDone={() => setOpen(false)} />
          )}
        </div>
      )}
    </div>
  );
}

function QuoteForm({ s, prestadorId, onDone }: { s: Solicitud; prestadorId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [hastaTouched, setHastaTouched] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [disponible, setDisponible] = useState("");

  const desdeNum = Number(desde) || 0;
  const hastaNum = Number(hasta) || 0;
  const maxHasta = Math.floor(desdeNum * RANGO_MAX_FACTOR);

  useEffect(() => {
    if (!hastaTouched) setHasta(desdeNum > 0 ? String(Math.round(desdeNum * 1.3)) : "");
  }, [desdeNum, hastaTouched]);

  function clampHasta() {
    if (desdeNum <= 0) return;
    const v = Math.min(Math.max(hastaNum, desdeNum), maxHasta);
    if (v !== hastaNum) setHasta(String(v));
  }

  const valid = desdeNum >= 1000 && hastaNum >= desdeNum && hastaNum <= maxHasta && mensaje.trim().length >= 10;

  const enviar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cotizaciones").insert({
        solicitud_id: s.id,
        prestador_id: prestadorId,
        precio: desdeNum,
        precio_hasta: hastaNum,
        mensaje: mensaje.trim(),
        disponible_desde: disponible || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cotización enviada. El cliente fue notificado.");
      qc.invalidateQueries({ queryKey: ["cotizaciones", "mias"] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo enviar la cotización"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) enviar.mutate(); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs font-semibold mb-1">Precio desde</span>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input inputMode="numeric" required value={desde} onChange={(e) => setDesde(e.target.value.replace(/\D/g, ""))} placeholder="45000" className={`${inputCls} pl-7`} />
          </div>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold mb-1">Precio hasta</span>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              inputMode="numeric"
              required
              value={hasta}
              onChange={(e) => { setHastaTouched(true); setHasta(e.target.value.replace(/\D/g, "")); }}
              onBlur={clampHasta}
              placeholder="58500"
              className={`${inputCls} pl-7`}
            />
          </div>
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {desdeNum < 1000
          ? "Mínimo $1.000. Se cobra el precio desde; el hasta es tu tope si el trabajo requiere más."
          : `Tu tope puede ser entre ${formatCLP(desdeNum)} y ${formatCLP(maxHasta)} (máx. ${RANGO_MAX_FACTOR}x). Nunca podrás cobrar más que eso.`}
        {desdeNum >= 1000 && hastaNum > 0 && (hastaNum < desdeNum || hastaNum > maxHasta) && (
          <span className="block text-[#FF3B6B] font-semibold">El precio hasta está fuera del rango permitido.</span>
        )}
      </p>
      <label className="block">
        <span className="block text-xs font-semibold mb-1">Mensaje al cliente <span className="font-normal text-muted-foreground">({mensaje.trim().length}/1000, mín. 10)</span></span>
        <textarea
          required
          rows={3}
          minLength={10}
          maxLength={1000}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Qué incluye tu cotización, materiales, tiempo estimado, garantía…"
          className={`${inputCls} resize-none`}
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold mb-1">Disponible desde <span className="font-normal text-muted-foreground">(opcional)</span></span>
        <input type="date" min={today} value={disponible} onChange={(e) => setDisponible(e.target.value)} className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={!valid || enviar.isPending}
        className="w-full h-12 inline-flex items-center justify-center gap-2 px-4 rounded-2xl bg-[#EF9F27] text-[#111827] text-sm font-bold disabled:opacity-50"
      >
        {enviar.isPending && <Loader2 className="size-4 animate-spin" />}
        Enviar cotización
      </button>
      <p className="text-[11px] text-center text-muted-foreground">Solo puedes enviar una cotización por solicitud. Si el cliente la acepta, se crea la reserva y recibes una notificación.</p>
    </form>
  );
}

function MiCotizacionCard({ c }: { c: MiCotizacion }) {
  const qc = useQueryClient();
  const est = ESTADO_COT[c.estado] ?? ESTADO_COT.enviada;
  const cat = c.solicitudes ? getCategory(c.solicitudes.categoria_id) : undefined;
  const retirar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cotizaciones").update({ estado: "retirada" }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cotización retirada");
      qc.invalidateQueries({ queryKey: ["cotizaciones", "mias"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo retirar"),
  });
  const solicitudAbierta = c.solicitudes?.estado === "abierta";

  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-snug line-clamp-2">{c.solicitudes?.titulo ?? "Solicitud"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {cat?.name}{c.solicitudes?.comuna ? ` · ${c.solicitudes.comuna}` : ""} · {timeAgo(c.created_at)}
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${est.cls}`}>{est.label}</span>
      </div>
      <div className="mt-2 font-bold text-[#111827]">
        {formatCLP(c.precio)}{c.precio_hasta > c.precio ? <span className="text-sm font-medium text-[#6B7280]"> – {formatCLP(c.precio_hasta)}</span> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{c.mensaje}</p>
      {c.estado === "aceptada" && (
        <Link to="/panel" className="mt-3 inline-flex w-full h-11 items-center justify-center px-3 rounded-xl bg-[#111827] text-white text-xs font-semibold">
          Ver reserva en mi panel
        </Link>
      )}
      {c.estado === "enviada" && solicitudAbierta && (
        <button
          disabled={retirar.isPending}
          onClick={() => { if (confirm("¿Retirar esta cotización? No podrás volver a cotizar esta solicitud.")) retirar.mutate(); }}
          className="mt-3 w-full px-3 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          Retirar cotización
        </button>
      )}
    </div>
  );
}
