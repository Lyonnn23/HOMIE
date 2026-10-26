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
import { useServerFn } from "@tanstack/react-start";
import { moderarTexto } from "@/lib/moderacion.functions";
import { evento } from "@/lib/analitica";
import { useT } from "@/i18n";
import { localeDe } from "@/i18n/estados";

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
  enviada: { label: "solicitudes.cotEnviada", cls: "bg-blue-100 text-blue-800" },
  aceptada: { label: "solicitudes.cotAceptada", cls: "bg-[#00C28820] text-[#00754F]" },
  rechazada: { label: "solicitudes.cotRechazada", cls: "bg-muted text-muted-foreground" },
  retirada: { label: "solicitudes.cotRetirada", cls: "bg-muted text-muted-foreground" },
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

type TFn = (clave: string, vars?: Record<string, string | number>) => string;
function fmtFecha(iso: string | null, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!iso) return null;
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(locale, opts);
}
function timeAgo(iso: string, t: TFn) {
  const m = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return t("cotizar.haceMin", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("cotizar.haceH", { n: h });
  const d = Math.floor(h / 24);
  return t("cotizar.haceD", { n: d });
}

type Tab = "abiertas" | "mias";

function CotizarPage() {
  const { t } = useT();
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
        <header className="px-5 pt-6 pb-4"><h1 className="title-1">{t("cotizar.titulo")}</h1></header>
        <div className="px-5">
          <div className="p-5 rounded-3xl bg-white border border-border">
            <div className="font-semibold">{t("cotizar.paraPros")}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t("cotizar.paraProsSub")}</p>
            <Link to="/solicitar" className="mt-4 inline-flex w-full h-12 items-center justify-center px-5 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold text-sm">
              {t("cotizar.pedir")}
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
        <h1 className="title-1 text-white">{t("cotizar.titulo")}</h1>
        <p className="text-sm text-white/70 mt-1">
          {t("cotizar.sub", { rubro: cat ? cat.name : t("cotizar.tuRubro") })}
        </p>
        <div className="mt-4 flex gap-1 p-1 rounded-2xl bg-white/10">
          {([
            { key: "abiertas", label: t("cotizar.abiertas"), n: abiertasQ.data?.length },
            { key: "mias", label: t("cotizar.misCotizaciones"), n: miasQ.data?.length },
          ] as { key: Tab; label: string; n?: number }[]).map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${tab === tb.key ? "bg-white text-[#111827]" : "text-white/80"}`}
            >
              {tb.label}{typeof tb.n === "number" ? ` (${tb.n})` : ""}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 mt-5 pb-10 space-y-3">
        {noVerificado && (
          <Link to="/verificar-identidad" className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAC77540] border border-[#EF9F27]/40">
            <ShieldAlert className="size-5 text-[#854F0B] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-[#854F0B]">{t("cotizar.verificaTitulo")}</div>
              <div className="text-xs text-[#854F0B]/80 mt-0.5">{t("cotizar.verificaSub")}</div>
            </div>
          </Link>
        )}

        {loading ? (
          <ListaSkeleton items={3} conAvatar={false} />
        ) : !prestador ? (
          <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            {t("cotizar.completaPerfil")}
            <Link to="/onboarding-prestador" className="block mt-2 text-foreground font-medium underline">{t("cotizar.completarPerfil")}</Link>
          </div>
        ) : tab === "abiertas" ? (
          (abiertasQ.data ?? []).length === 0 ? (
            <Empty icon={Inbox} title={t("cotizar.sinAbiertas")} sub={noVerificado ? t("cotizar.sinAbiertasVerif") : t("cotizar.sinAbiertasAviso")} />
          ) : (
            (abiertasQ.data ?? []).map((s) => (
              <SolicitudCard key={s.id} s={s} prestadorId={prestador.id} mia={cotizadas.get(s.id)} onFoto={setFoto} />
            ))
          )
        ) : (miasQ.data ?? []).length === 0 ? (
          <Empty icon={FileText} title={t("cotizar.sinMias")} sub={t("cotizar.sinMiasSub")} />
        ) : (
          (miasQ.data ?? []).map((c) => <MiCotizacionCard key={c.id} c={c} />)
        )}
      </div>

      {foto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFoto(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white" aria-label={t("comun.cerrar")}><X className="size-5" /></button>
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
  const { t, idioma } = useT();
  const [open, setOpen] = useState(false);
  const cat = getCategory(s.categoria_id);
  return (
    <div className="rounded-3xl bg-white border border-border overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {s.urgente && <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FF3B6B] text-white text-[11px] font-semibold"><Zap className="size-3" /> {t("solicitudes.urgente")}</span>}
            {mia && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#00C28820] text-[#00754F] text-[11px] font-semibold">
                <Check className="size-3" /> {t("cotizar.yaCotizaste")}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{timeAgo(s.created_at, t)}</span>
          </div>
          <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-1.5 font-semibold leading-snug">{s.titulo}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{s.servicios?.nombre ?? cat?.name}</div>
        <p className={`mt-2 text-sm text-[#374151] whitespace-pre-wrap ${open ? "" : "line-clamp-2"}`}>{s.detalle}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {s.comuna ?? t("cotizar.comunaNoIndicada")}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {fmtFecha(s.fecha_deseada, localeDe(idioma)) ?? t("cotizar.fechaFlexible")}</span>
          <span className="inline-flex items-center gap-1"><Wallet className="size-3.5" /> {s.presupuesto_max ? t("cotizar.hasta", { monto: formatCLP(s.presupuesto_max) }) : t("cotizar.sinPresupuesto")}</span>
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
                <span className="font-semibold">{t("cotizar.tuCotizacion")}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${(ESTADO_COT[mia.estado] ?? ESTADO_COT.enviada).cls}`}>
                  {t((ESTADO_COT[mia.estado] ?? ESTADO_COT.enviada).label)}
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
  const { t } = useT();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [hastaTouched, setHastaTouched] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [disponible, setDisponible] = useState("");
  const moderar = useServerFn(moderarTexto);

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
      // Moderación: si la llamada falla, se permite enviar (la base de datos aplica sus propias reglas).
      const mod = await moderar({ data: { texto: mensaje.trim(), origen: "cotizacion" } }).catch(() => null);
      if (mod && !mod.ok) throw new Error(mod.mensaje ?? t("cotizar.normas"));
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
      evento("cotizacion_enviada", { solicitud_id: s.id, precio: desdeNum, precio_hasta: hastaNum });
      toast.success(t("cotizar.enviada"));
      qc.invalidateQueries({ queryKey: ["cotizaciones", "mias"] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("cotizar.errEnviar")),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) enviar.mutate(); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs font-semibold mb-1">{t("cotizar.precioDesde")}</span>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input inputMode="numeric" required value={desde} onChange={(e) => setDesde(e.target.value.replace(/\D/g, ""))} placeholder="45000" className={`${inputCls} pl-7`} />
          </div>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold mb-1">{t("cotizar.precioHasta")}</span>
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
          ? t("cotizar.min1000")
          : t("cotizar.topeEntre", { min: formatCLP(desdeNum), max: formatCLP(maxHasta), factor: RANGO_MAX_FACTOR })}
        {desdeNum >= 1000 && hastaNum > 0 && (hastaNum < desdeNum || hastaNum > maxHasta) && (
          <span className="block text-[#FF3B6B] font-semibold">{t("cotizar.fueraRango")}</span>
        )}
      </p>
      <label className="block">
        <span className="block text-xs font-semibold mb-1">{t("cotizar.mensaje")} <span className="font-normal text-muted-foreground">{t("cotizar.mensajeHint", { n: mensaje.trim().length })}</span></span>
        <textarea
          required
          rows={3}
          minLength={10}
          maxLength={1000}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder={t("cotizar.mensajePlaceholder")}
          className={`${inputCls} resize-none`}
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold mb-1">{t("cotizar.disponibleDesde")} <span className="font-normal text-muted-foreground">{t("cotizar.opcional")}</span></span>
        <input type="date" min={today} value={disponible} onChange={(e) => setDisponible(e.target.value)} className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={!valid || enviar.isPending}
        className="w-full h-12 inline-flex items-center justify-center gap-2 px-4 rounded-2xl bg-[#EF9F27] text-[#111827] text-sm font-bold disabled:opacity-50"
      >
        {enviar.isPending && <Loader2 className="size-4 animate-spin" />}
        {t("cotizar.enviar")}
      </button>
      <p className="text-[11px] text-center text-muted-foreground">{t("cotizar.unaPorSolicitud")}</p>
    </form>
  );
}

function MiCotizacionCard({ c }: { c: MiCotizacion }) {
  const { t } = useT();
  const qc = useQueryClient();
  const est = ESTADO_COT[c.estado] ?? ESTADO_COT.enviada;
  const cat = c.solicitudes ? getCategory(c.solicitudes.categoria_id) : undefined;
  const retirar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cotizaciones").update({ estado: "retirada" }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("cotizar.retirada"));
      qc.invalidateQueries({ queryKey: ["cotizaciones", "mias"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("cotizar.errRetirar")),
  });
  const solicitudAbierta = c.solicitudes?.estado === "abierta";

  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-snug line-clamp-2">{c.solicitudes?.titulo ?? t("cotizar.solicitud")}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {cat?.name}{c.solicitudes?.comuna ? ` · ${c.solicitudes.comuna}` : ""} · {timeAgo(c.created_at, t)}
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${est.cls}`}>{t(est.label)}</span>
      </div>
      <div className="mt-2 font-bold text-[#111827]">
        {formatCLP(c.precio)}{c.precio_hasta > c.precio ? <span className="text-sm font-medium text-[#6B7280]"> – {formatCLP(c.precio_hasta)}</span> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{c.mensaje}</p>
      {c.estado === "aceptada" && (
        <Link to="/panel" className="mt-3 inline-flex w-full h-11 items-center justify-center px-3 rounded-xl bg-[#111827] text-white text-xs font-semibold">
          {t("cotizar.verReserva")}
        </Link>
      )}
      {c.estado === "enviada" && solicitudAbierta && (
        <button
          disabled={retirar.isPending}
          onClick={() => { if (confirm(t("cotizar.confirmarRetirar"))) retirar.mutate(); }}
          className="mt-3 w-full px-3 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          {t("cotizar.retirar")}
        </button>
      )}
    </div>
  );
}
