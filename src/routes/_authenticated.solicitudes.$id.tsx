import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Star, BadgeCheck, Zap, MapPin, CalendarDays, Wallet, ShieldCheck, Loader2, X, Lock, CheckCircle2, Clock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCategory, formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/solicitudes/$id")({
  head: () => ({ meta: [{ title: "Solicitud — Homie" }] }),
  component: SolicitudDetalle,
});

const ESTADO: Record<string, { label: string; cls: string }> = {
  abierta: { label: "Abierta", cls: "bg-[#00C28820] text-[#00754F]" },
  adjudicada: { label: "Adjudicada", cls: "bg-[#EF9F27]/20 text-[#854F0B]" },
  cerrada: { label: "Cerrada", cls: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", cls: "bg-[#FF3B6B20] text-[#FF3B6B]" },
};
const ESTADO_COT: Record<string, { label: string; cls: string }> = {
  enviada: { label: "Enviada", cls: "bg-blue-100 text-blue-800" },
  aceptada: { label: "Aceptada", cls: "bg-[#00C28820] text-[#00754F]" },
  rechazada: { label: "Rechazada", cls: "bg-muted text-muted-foreground" },
  retirada: { label: "Retirada", cls: "bg-muted text-muted-foreground" },
};
const HORAS = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);
const inputCls =
  "w-full px-4 py-3 rounded-2xl bg-white border border-border text-sm outline-none focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20";

type Solicitud = {
  id: string; cliente_id: string; categoria_id: string; titulo: string; detalle: string; fotos: string[];
  comuna: string | null; direccion: string | null; fecha_deseada: string | null; urgente: boolean;
  presupuesto_max: number | null; estado: string; cotizacion_aceptada_id: string | null; created_at: string; expira_at: string;
  servicios: { nombre: string } | null;
};
type Cotizacion = {
  id: string; precio: number; precio_hasta: number; mensaje: string; disponible_desde: string | null; estado: string; created_at: string;
  prestadores: {
    id: string; nombre: string | null; foto_url: string | null; calificacion_promedio: number; resenas_count: number;
    verificado: boolean | null; categoria_id: string;
  } | null;
};

function fmtFecha(iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) {
  if (!iso) return null;
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CL", opts);
}

function SolicitudDetalle() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const [foto, setFoto] = useState<string | null>(null);

  const sQ = useQuery({
    queryKey: ["solicitud", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitudes")
        .select("*, servicios(nombre)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Solicitud | null;
    },
  });
  const cQ = useQuery({
    queryKey: ["cotizaciones", "solicitud", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("id, precio, precio_hasta, mensaje, disponible_desde, estado, created_at, prestadores(id, nombre, foto_url, calificacion_promedio, resenas_count, verificado, categoria_id)")
        .eq("solicitud_id", id)
        .order("precio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Cotizacion[];
    },
  });

  const cancelar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("solicitudes").update({ estado: "cancelada" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      qc.invalidateQueries({ queryKey: ["solicitud", id] });
      qc.invalidateQueries({ queryKey: ["solicitudes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo cancelar"),
  });

  const s = sQ.data;
  if (sQ.isLoading) return <AppShell><div className="p-8 text-center text-muted-foreground"><Loader2 className="size-5 mx-auto animate-spin" /></div></AppShell>;
  if (!s) return <AppShell><div className="p-8 text-center text-muted-foreground">Solicitud no encontrada</div></AppShell>;

  const isOwner = usuario?.id === s.cliente_id;
  const cat = getCategory(s.categoria_id);
  const st = ESTADO[s.estado] ?? ESTADO.cerrada;
  const cots = cQ.data ?? [];
  const activas = cots.filter((c) => c.estado === "enviada" || c.estado === "aceptada");
  const otras = cots.filter((c) => c.estado !== "enviada" && c.estado !== "aceptada");
  const expirada = s.estado === "abierta" && new Date(s.expira_at).getTime() < Date.now();

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4" style={{ backgroundColor: cat?.bg ?? "#111827" }}>
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-full text-white hover:bg-white/15">
          <ArrowLeft className="size-5" />
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-[#111827]">{st.label}</span>
          {s.urgente && <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FF3B6B] text-white text-[11px] font-semibold"><Zap className="size-3" /> Urgente</span>}
          <span className="text-[11px] text-white/80 font-medium">{cat?.name}{s.servicios?.nombre ? ` · ${s.servicios.nombre}` : ""}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white leading-tight">{s.titulo}</h1>
      </header>

      <div className="px-5 mt-5 space-y-5 pb-10">
        <section className="p-4 rounded-3xl bg-white border border-border">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{s.detalle}</p>
          {s.fotos?.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {s.fotos.map((f) => (
                <button key={f} type="button" onClick={() => setFoto(f)} className="aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={f} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Meta icon={MapPin} label="Comuna" value={s.comuna ?? "No indicada"} />
            <Meta icon={CalendarDays} label="Fecha deseada" value={fmtFecha(s.fecha_deseada) ?? "Flexible"} />
            <Meta icon={Wallet} label="Presupuesto máx." value={s.presupuesto_max ? formatCLP(s.presupuesto_max) : "Sin tope"} />
            <Meta icon={Clock} label={s.estado === "abierta" ? "Vence" : "Publicada"} value={fmtFecha(s.estado === "abierta" ? s.expira_at : s.created_at) ?? "—"} />
          </div>
          {isOwner && s.direccion && (
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5 mt-0.5 shrink-0" />
              <span>Dirección: {s.direccion}. Solo la ve el profesional que elijas.</span>
            </div>
          )}
        </section>

        <div className="p-4 rounded-2xl bg-[#111827] text-white flex items-start gap-3">
          <ShieldCheck className="size-5 text-[#EF9F27] shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold">Precio protegido.</span> Pagas el precio cotizado al reservar. Si el trabajo requiere más, el profesional nunca puede cobrarte sobre su "precio hasta".
          </div>
        </div>

        {expirada && s.estado === "abierta" && (
          <div className="p-3 rounded-2xl bg-[#FAC77540] text-[#854F0B] text-xs font-medium">Esta solicitud venció. Puedes publicar una nueva.</div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Cotizaciones {cots.length > 0 && `(${cots.length})`}
          </h2>
          {cQ.isLoading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="size-5 mx-auto animate-spin" /></div>
          ) : cots.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
              {s.estado === "abierta"
                ? "Aún no llegan cotizaciones. Avisamos a los profesionales verificados de tu rubro; te notificaremos cuando cotice alguno."
                : "No se recibieron cotizaciones."}
            </div>
          ) : (
            <div className="space-y-3">
              {activas.map((c) => (
                <CotizacionCard key={c.id} c={c} s={s} isOwner={isOwner} aceptada={s.cotizacion_aceptada_id === c.id} />
              ))}
              {otras.length > 0 && (
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer list-none px-1 py-1">
                    {otras.length} {otras.length === 1 ? "cotización" : "cotizaciones"} no vigentes · ver
                  </summary>
                  <div className="mt-2 space-y-3 opacity-70">
                    {otras.map((c) => <CotizacionCard key={c.id} c={c} s={s} isOwner={isOwner} aceptada={false} />)}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>

        {isOwner && s.estado === "abierta" && (
          <button
            disabled={cancelar.isPending}
            onClick={() => { if (confirm("¿Cancelar esta solicitud? Los profesionales dejarán de verla.")) cancelar.mutate(); }}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-[#FF3B6B] text-[#FF3B6B] text-sm font-semibold hover:bg-[#FF3B6B]/5 disabled:opacity-50"
          >
            Cancelar solicitud
          </button>
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

function Meta({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F5F5F0]">
      <Icon className="size-4 text-[#EF9F27] shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-semibold text-[#111827] truncate">{value}</div>
      </div>
    </div>
  );
}

function CotizacionCard({ c, s, isOwner, aceptada }: { c: Cotizacion; s: Solicitud; isOwner: boolean; aceptada: boolean }) {
  const [open, setOpen] = useState(false);
  const p = c.prestadores;
  const est = ESTADO_COT[c.estado] ?? ESTADO_COT.enviada;
  const canAccept = isOwner && s.estado === "abierta" && c.estado === "enviada";

  return (
    <div className={`p-4 rounded-3xl bg-white border ${aceptada ? "border-[#EF9F27] ring-2 ring-[#EF9F27]/20" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <ProviderAvatar url={p?.foto_url ?? null} name={p?.nombre ?? "Profesional"} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{p?.nombre ?? "Profesional"}</span>
            {p?.verificado && <BadgeCheck className="size-4 text-[#00C288] shrink-0" />}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3.5" style={{ fill: "#EF9F27", color: "#EF9F27" }} />
            <span className="font-semibold text-[#111827]">{Number(p?.calificacion_promedio ?? 0).toFixed(1)}</span>
            <span>({p?.resenas_count ?? 0} reseñas)</span>
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${aceptada ? "bg-[#EF9F27] text-[#111827]" : est.cls}`}>
          {aceptada ? "Elegida" : est.label}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Precio cotizado</div>
          <div className="text-xl font-bold text-[#111827]">
            {formatCLP(c.precio)}
            {c.precio_hasta > c.precio && <span className="text-sm font-medium text-[#6B7280]"> – {formatCLP(c.precio_hasta)}</span>}
          </div>
        </div>
        {c.disponible_desde && (
          <div className="text-right text-xs text-muted-foreground">
            <div className="text-[10px] uppercase tracking-wide">Disponible desde</div>
            <div className="font-semibold text-[#111827]">{fmtFecha(c.disponible_desde, { day: "numeric", month: "short" })}</div>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">{c.mensaje}</p>

      <div className="mt-3 pt-3 border-t border-border flex gap-2">
        {p && (
          <Link
            to="/prestador/$id"
            params={{ id: p.id }}
            className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
          >
            Ver perfil
          </Link>
        )}
        {canAccept && (
          <button
            onClick={() => setOpen(!open)}
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-bold"
          >
            <CheckCircle2 className="size-3.5" /> {open ? "Cerrar" : "Aceptar y reservar"}
          </button>
        )}
      </div>

      {canAccept && open && <AceptarForm c={c} s={s} />}
    </div>
  );
}

function AceptarForm({ c, s }: { c: Cotizacion; s: Solicitud }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const defaultFecha = [s.fecha_deseada, c.disponible_desde].filter((d): d is string => !!d && d >= today).sort()[0] ?? today;
  const [fecha, setFecha] = useState(defaultFecha);
  const [hora, setHora] = useState("10:00");
  const [direccion, setDireccion] = useState(s.direccion ?? "");

  const aceptar = useMutation({
    mutationFn: async () => {
      if (!direccion.trim()) throw new Error("Ingresa la dirección del servicio");
      const { data, error } = await supabase.rpc("aceptar_cotizacion", {
        _cotizacion_id: c.id,
        _fecha: fecha,
        _hora: hora,
        _direccion: direccion.trim(),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitud", s.id] });
      qc.invalidateQueries({ queryKey: ["solicitudes"] });
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Reserva creada. Ahora paga para confirmar.");
      navigate({ to: "/reservas" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo aceptar la cotización"),
  });

  const comision = Math.round(c.precio * 0.15);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); aceptar.mutate(); }}
      className="mt-3 p-3 rounded-2xl bg-[#F5F5F0] space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs font-semibold mb-1">Fecha</span>
          <input type="date" required min={today} value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold mb-1">Hora</span>
          <select value={hora} onChange={(e) => setHora(e.target.value)} className={inputCls}>
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-xs font-semibold mb-1">Dirección del servicio</span>
        <input required value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, depto" className={inputCls} />
      </label>
      <div className="text-xs text-muted-foreground flex justify-between">
        <span>Servicio {formatCLP(c.precio)} + comisión Homie {formatCLP(comision)}</span>
        <span className="font-bold text-[#111827]">Total {formatCLP(c.precio + comision)}</span>
      </div>
      <button
        type="submit"
        disabled={aceptar.isPending}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#111827] text-white text-sm font-bold disabled:opacity-50"
      >
        {aceptar.isPending && <Loader2 className="size-4 animate-spin" />}
        Confirmar y crear reserva
      </button>
      <p className="text-[11px] text-center text-muted-foreground">Las demás cotizaciones se rechazarán automáticamente. El pago se hace desde Reservas.</p>
    </form>
  );
}
