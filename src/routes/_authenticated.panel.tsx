import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarCheck, MapPin, Check, X, Truck, CheckCircle2, Star, DollarSign, MessageCircle,
  LayoutDashboard, ListTodo, History, UserCog, Loader2, ChevronDown, ImagePlus, Clock, Palette, ExternalLink, MessageSquareQuote, ChevronRight, Zap,
  Crown, FileText, Images, Trash2, Gift,
} from "lucide-react";
import { HorarioEditor, parseHorario, validarHorario, type Horario } from "@/components/HorarioEditor";
import { AppShell } from "@/components/AppShell";
import { ListaSkeleton } from "@/components/Skeletons";
import { PullRefresh } from "@/components/PullRefresh";
import { ProviderAvatar } from "@/components/Avatar";
import {
  useProviderBookings, useUpdateBookingStatus, useCompletarConCodigo,
  type Booking, type DbEstado,
} from "@/store/bookings";
import { geocodificar } from "@/lib/geocode";
import {
  formatCLP, categories, esPro, MODALIDAD_LABEL, UNIDAD_LABEL, UNIDADES, DURACION_OPCIONES, GARANTIA_OPCIONES,
  IDIOMAS_OPCIONES, esUnidad, type UnidadCobro,
} from "@/data/services";
import { COMUNAS_SUGERIDAS } from "@/data/comunas";
import { comprimirImagen } from "@/lib/imagen";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { mensajeError } from "@/lib/errores";
import { useT } from "@/i18n";
import { claveEstado, localeDe } from "@/i18n/estados";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [
    { name: "description", content: "Gestión de servicios, disponibilidad y reservas de tu perfil profesional Homie." },
    { property: "og:title", content: "Panel del prestador — Homie" },
    { property: "og:description", content: "Gestión de servicios, disponibilidad y reservas de tu perfil profesional Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Panel del prestador — Homie" }] }),
  component: PanelPage,
});

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-[#FAC77540] text-[#854F0B]",
  confirmada: "bg-[#00C28820] text-[#00754F]",
  "en camino": "bg-blue-100 text-blue-800",
  completado: "bg-[#00C28820] text-[#00754F]",
  cancelada: "bg-[#FF3B6B20] text-[#FF3B6B]",
};

type Tab = "resumen" | "pendientes" | "historial" | "perfil";

function PanelPage() {
  const { t } = useT();
  const { usuario } = useAuth();
  const { bookings, isLoading, hasPrestador } = useProviderBookings();
  const [tab, setTab] = useState<Tab>("resumen");

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">{t("panel.soloPrestadores")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("panel.soloPrestadoresSub")}</p>
          <Link to="/" className="inline-flex h-12 items-center justify-center mt-6 px-5 rounded-2xl bg-foreground text-background font-semibold text-sm">{t("panel.irInicio")}</Link>
        </div>
      </AppShell>
    );
  }

  if (!isLoading && !hasPrestador) {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">{t("panel.completaPerfil")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("panel.completaPerfilSub")}</p>
          <Link to="/onboarding-prestador" className="inline-flex h-12 items-center justify-center mt-6 px-5 rounded-2xl bg-foreground text-background font-semibold text-sm">
            {t("panel.completarPerfil")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PullRefresh queryKey={["bookings"]} />
      <header className="bg-[#111827] text-white px-5 pt-6 pb-6 -mt-px">
        <h1 className="title-1 text-white">{t("panel.miPanel")}</h1>
        <p className="text-sm text-white/70 mt-1">{t("panel.hola", { nombre: usuario?.nombre?.split(" ")[0] ?? "" })}</p>
      </header>

      <Tabs tab={tab} setTab={setTab} pendingCount={bookings.filter((b) => b.status === "pendiente").length} />

      <div className="px-5 mt-5">
        {isLoading ? (
          <ListaSkeleton items={4} conAvatar={false} />
        ) : tab === "resumen" ? (
          <Resumen bookings={bookings} />
        ) : tab === "pendientes" ? (
          <Pendientes bookings={bookings} />
        ) : tab === "historial" ? (
          <Historial bookings={bookings} />
        ) : (
          <EditorPerfil />
        )}
      </div>
    </AppShell>
  );
}

function Tabs({ tab, setTab, pendingCount }: { tab: Tab; setTab: (t: Tab) => void; pendingCount: number }) {
  const { t } = useT();
  const items: { id: Tab; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: "resumen", label: t("panel.tabResumen"), icon: LayoutDashboard },
    { id: "pendientes", label: t("panel.tabPendientes"), icon: ListTodo, badge: pendingCount },
    { id: "historial", label: t("panel.tabHistorial"), icon: History },
    { id: "perfil", label: t("panel.tabPerfil"), icon: UserCog },
  ];
  return (
    <div className="px-5 mt-2 overflow-x-auto">
      <div className="inline-flex gap-1 p-1 rounded-2xl bg-muted/70">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const on = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                on ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
              {badge ? (
                <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-foreground text-background text-[10px] font-bold">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- RESUMEN ----------
function Resumen({ bookings }: { bookings: Booking[] }) {
  const { t } = useT();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const reservasHoy = bookings.filter((b) => b.date === today && (b.status === "confirmada" || b.status === "en camino" || b.status === "pendiente"));
  const ingresosMes = bookings
    .filter((b) => b.status === "completado" && new Date(b.date) >= monthStart)
    .reduce((sum, b) => sum + b.price, 0);
  const completadas = bookings.filter((b) => b.status === "completado").length;

  return (
    <div className="space-y-5">
      <ProBanner />
      <AvailabilityToggle />

      <Link
        to="/cotizar"
        className="flex items-center gap-3 p-4 rounded-2xl bg-[#111827] text-white border border-[#111827] hover:bg-[#1F2937] transition"
      >
        <div className="size-10 rounded-xl bg-[#EF9F27] flex items-center justify-center shrink-0">
          <MessageSquareQuote className="size-5 text-[#111827]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{t("panel.solicitudesRubro")}</div>
          <div className="text-xs text-white/70">{t("panel.solicitudesRubroSub")}</div>
        </div>
        <ChevronRight className="size-4 text-white/60 shrink-0" />
      </Link>

      {/* Homie Ya: urgencias en tu rubro */}
      <Link
        to="/ya-prestador"
        className="flex items-center gap-3 p-4 rounded-2xl bg-white border-2 border-[#FF3B6B] hover:bg-[#FF3B6B]/5 transition"
      >
        <div className="size-10 rounded-xl bg-[#FF3B6B] flex items-center justify-center shrink-0">
          <Zap className="size-5 text-white fill-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[#111827]">{t("panel.yaUrgencias")}</div>
          <div className="text-xs text-muted-foreground">{t("panel.yaUrgenciasSub")}</div>
        </div>
        <ChevronRight className="size-4 text-[#FF3B6B] shrink-0" />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CalendarCheck} label={t("panel.hoy")} value={String(reservasHoy.length)} sub={t("panel.reservasActivas")} />
        <RatingCard />
        <StatCard icon={DollarSign} label={t("panel.mes")} value={formatCLP(ingresosMes)} sub={t("panel.ingresos")} accent="dark" />
        <StatCard icon={CheckCircle2} label={t("panel.completadas")} value={String(completadas)} sub={t("panel.trabajosMes")} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("panel.proximasReservas")}</h2>
        {reservasHoy.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            {t("panel.sinReservasHoy")}
          </div>
        ) : (
          <div className="space-y-2">
            {reservasHoy.map((b) => <ProviderBookingCard key={b.id} b={b} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, accent = "amber",
}: { icon: typeof CalendarCheck; label: string; value: string; sub: string; accent?: "amber" | "dark" }) {
  return (
    <div className="p-4 rounded-2xl bg-[#F5F5F0] border border-border">
      <div className="inline-flex size-9 items-center justify-center rounded-xl bg-white">
        <Icon className="size-4 text-[#EF9F27]" />
      </div>
      <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-0.5 truncate ${accent === "dark" ? "text-[#111827]" : "text-[#EF9F27]"}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function RatingCard() {
  const { t } = useT();
  const data = usePrestadorRow();
  return (
    <div className="p-4 rounded-2xl bg-[#F5F5F0] border border-border">
      <div className="inline-flex size-9 items-center justify-center rounded-xl bg-white">
        <Star className="size-4 text-[#EF9F27] fill-[#EF9F27]" />
      </div>
      <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wide">{t("panel.calificacion")}</div>
      <div className="text-xl font-bold mt-0.5 text-[#EF9F27]">
        {data ? Number(data.calificacion_promedio).toFixed(1) : "—"}
      </div>
      <div className="text-xs text-muted-foreground">{t("panel.nResenas", { n: data?.resenas_count ?? 0 })}</div>
    </div>
  );
}

// ---------- PENDIENTES / HISTORIAL ----------
function Pendientes({ bookings }: { bookings: Booking[] }) {
  const { t } = useT();
  const pendientes = bookings.filter((b) => b.status === "pendiente");
  const activas = bookings.filter((b) => b.status === "confirmada" || b.status === "en camino");
  if (pendientes.length === 0 && activas.length === 0) {
    return <Empty icon={ListTodo} title={t("panel.sinSolicitudes")} sub={t("panel.sinSolicitudesSub")} />;
  }
  return (
    <div className="space-y-6">
      {pendientes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("panel.nuevas", { n: pendientes.length })}</h2>
          <div className="space-y-2">{pendientes.map((b) => <ProviderBookingCard key={b.id} b={b} />)}</div>
        </section>
      )}
      {activas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("panel.enCurso")}</h2>
          <div className="space-y-2">{activas.map((b) => <ProviderBookingCard key={b.id} b={b} />)}</div>
        </section>
      )}
    </div>
  );
}

function Historial({ bookings }: { bookings: Booking[] }) {
  const { t } = useT();
  const items = bookings.filter((b) => b.status === "completado" || b.status === "cancelada");
  if (items.length === 0) return <Empty icon={History} title={t("panel.sinHistorial")} sub={t("panel.sinHistorialSub")} />;
  return <div className="space-y-2">{items.map((b) => <ProviderBookingCard key={b.id} b={b} />)}</div>;
}

function Empty({ icon: Icon, title, sub }: { icon: typeof ListTodo; title: string; sub: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto size-14 rounded-full bg-muted flex items-center justify-center">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

/** Calificaciones que este profesional ya dejó a sus clientes (reserva_id → puntaje). */
function useMisCalificacionesCliente() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["calificaciones-cliente", "mias", usuario?.id],
    enabled: !!usuario?.id && usuario.tipo === "prestador",
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from("calificaciones_cliente").select("reserva_id, puntaje");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of data ?? []) out[r.reserva_id] = r.puntaje;
      return out;
    },
  });
}

function CalificarCliente({ b }: { b: Booking }) {
  const { t } = useT();
  const qc = useQueryClient();
  const calif = useMisCalificacionesCliente();
  const [open, setOpen] = useState(false);
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      if (puntaje < 1) throw new Error(t("panel.elige15"));
      const { error } = await supabase.from("calificaciones_cliente").insert({
        reserva_id: b.id, prestador_id: b.providerId, cliente_id: b.clientId,
        puntaje, comentario: comentario.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("panel.graciasCalificar"));
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["calificaciones-cliente"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("panel.errCalificar")),
  });

  const hecha = calif.data?.[b.id];
  if (hecha) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="size-3.5 fill-[#EF9F27] text-[#EF9F27]" /> {t("panel.calificaste", { n: hecha })}
      </span>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-semibold">
        <Star className="size-3.5" /> {t("panel.calificarCliente")}
      </button>
    );
  }
  return (
    <div className="w-full mt-1 p-3 rounded-xl bg-[#F5F5F0] border border-border">
      <div className="text-xs font-semibold text-[#111827]">{t("panel.comoFueTrabajar", { nombre: b.clientName })}</div>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={t("panel.puntaje")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={puntaje === n} aria-label={t("panel.nEstrellas", { n })}
            onClick={() => setPuntaje(n)} className="p-1">
            <Star className={`size-6 ${n <= puntaje ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#D1D5DB]"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comentario} onChange={(e) => setComentario(e.target.value.slice(0, 300))} rows={2} maxLength={300}
        placeholder={t("panel.comentarioCliente")}
        className="mt-2 w-full p-3 rounded-xl bg-white border border-border text-sm outline-none focus:border-foreground/30 resize-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{comentario.length}/300 · {t("panel.soloProfesionales")}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={m.isPending}
            className="px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50">
            {t("comun.cancelar")}
          </button>
          <button type="button" onClick={() => m.mutate()} disabled={m.isPending || puntaje < 1}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50">
            {m.isPending && <Loader2 className="size-3.5 animate-spin" />} {t("panel.enviar")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderBookingCard({ b }: { b: Booking }) {
  const { t } = useT();
  const update = useUpdateBookingStatus();
  const set = (estado: DbEstado) => update.mutate({ id: b.id, estado });
  const completar = useCompletarConCodigo();
  const [codigo, setCodigo] = useState("");

  async function completarConCodigo() {
    if (codigo.length !== 4) { toast.error(t("panel.ingresaCodigo4")); return; }
    try {
      const ok = await completar.mutateAsync({ reservaId: b.id, codigo });
      if (ok) {
        import("@/lib/nativo").then((m) => m.vibrar("exito")).catch(() => {});
        toast.success(t("panel.trabajoCompletado")); setCodigo("");
      }
      else toast.error(t("panel.codigoIncorrecto"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("panel.errCompletar"));
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{b.service}</div>
          <div className="text-sm text-muted-foreground">{t("panel.para", { nombre: b.clientName })}</div>
          {b.status === "pendiente" && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              {b.clienteCalificacion != null && b.clienteCalificacion > 0 ? (
                <><Star className="size-3 fill-[#EF9F27] text-[#EF9F27]" /> {t("panel.cliente", { n: b.clienteCalificacion.toFixed(1) })}</>
              ) : (
                <>{t("panel.clienteNuevo")}</>
              )}
            </span>
          )}
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[b.status]}`}>{t(claveEstado(b.status))}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span>{b.date} · {b.time}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{b.address}</span>
      </div>
      {b.note && <p className="mt-2 text-xs text-muted-foreground italic">"{b.note}"</p>}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-semibold text-sm">{formatCLP(b.price)}</span>
          {b.status === "completado" && b.comision != null && (
            <div className="text-[11px] text-muted-foreground">
              {t("panel.tuPago", { monto: formatCLP(Math.max(b.price + (b.descuento ?? 0) - b.comision, 0)), pct: Math.round((b.comision / Math.max(b.price + (b.descuento ?? 0), 1)) * 100) })}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {b.status === "completado" && (
            <Link
              to="/comprobante/$reservaId"
              params={{ reservaId: b.id }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
            >
              <FileText className="size-3.5" /> {t("panel.comprobante")}
            </Link>
          )}
          {(b.status === "confirmada" || b.status === "en camino") && (
            <Link
              to="/chat/$reservaId"
              params={{ reservaId: b.id }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
            >
              <MessageCircle className="size-3.5" /> {t("panel.chat")}
            </Link>
          )}
          {b.status === "pendiente" && (
            <>
              <button disabled={update.isPending} onClick={() => set("cancelada")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FF3B6B] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                <X className="size-3.5" /> {t("panel.rechazar")}
              </button>
              <button disabled={update.isPending} onClick={() => set("confirmada")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#00C288] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                <Check className="size-3.5" /> {t("panel.aceptar")}
              </button>
            </>
          )}
          {b.status === "confirmada" && (
            <button disabled={update.isPending} onClick={() => set("en_camino")}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50">
              <Truck className="size-3.5" /> {t("panel.enCamino")}
            </button>
          )}
        </div>
      </div>
      {b.status === "completado" && (
        <div className="mt-3 pt-3 border-t border-border flex justify-end">
          <CalificarCliente b={b} />
        </div>
      )}
      {b.status === "en camino" && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">{t("panel.pideCodigo")}</p>
          <div className="flex gap-2">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="0000"
              aria-label={t("panel.codigoConfirmacion")}
              className="w-24 h-10 px-3 rounded-xl bg-white border border-border text-center font-mono text-base tracking-[0.3em] outline-none focus:border-foreground/30"
            />
            <button disabled={completar.isPending || codigo.length !== 4} onClick={completarConCodigo}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50">
              {completar.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} {t("panel.completarConCodigo")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- AVAILABILITY ----------
function usePrestadorRow() {
  const { usuario } = useAuth();
  const q = useQuery({
    queryKey: ["prestador-row", usuario?.id],
    enabled: !!usuario?.id && usuario?.tipo === "prestador",
    queryFn: async () => {
      const { data } = await supabase
        .from("prestadores")
        .select("id, bio, direccion, precio_desde, disponible_ahora, categoria_id, calificacion_promedio, resenas_count, verificado, horario, banner_url, color_perfil, titulo_profesional, anos_experiencia, comuna, pro_hasta, pro_trial_usado, comision_gratis_hasta, gallery_urls, especialidades, comunas_cobertura, radio_km, idiomas, tiene_vehiculo, herramientas_propias, emite_boleta")
        .eq("usuario_id", usuario!.id)
        .maybeSingle();
      return data;
    },
  });
  return q.data;
}

function AvailabilityToggle() {
  const { t } = useT();
  const qc = useQueryClient();
  const row = usePrestadorRow();
  const m = useMutation({
    mutationFn: async (next: boolean) => {
      if (!row?.id) return;
      const { error } = await supabase
        .from("prestadores")
        .update({ disponible_ahora: next, disponibilidad_texto: next ? "Disponible ahora" : "No disponible" })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prestador-row"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
      qc.invalidateQueries({ queryKey: ["providers-for-service"] });
    },
  });
  const on = !!row?.disponible_ahora;
  return (
    <div className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 transition ${
      on ? "bg-[#00C288]/10 border-[#00C288]" : "bg-[#FF3B6B]/10 border-[#FF3B6B]"
    }`}>
      <div className="min-w-0 flex items-center gap-3">
        <span className={`size-3 rounded-full shrink-0 ${on ? "bg-[#00C288]" : "bg-[#FF3B6B]"}`} />
        <div>
          <div className={`font-semibold text-sm ${on ? "text-[#00754F]" : "text-[#FF3B6B]"}`}>
            {on ? t("panel.disponibleVerde") : t("panel.noDisponibleRojo")}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {on ? t("panel.aceptandoReservas") : t("panel.noApareces")}
          </div>
        </div>
      </div>
      <button
        onClick={() => m.mutate(!on)}
        disabled={m.isPending || !row}
        aria-pressed={on}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
          on ? "bg-[#00C288]" : "bg-[#FF3B6B]"
        }`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition ${on ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function fechaCL(iso: string, locale = "es-CL") {
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Banner de cobros: periodo gratis, tarifa vigente y Homie Premium. */
function ProBanner() {
  const { t, idioma } = useT();
  const locale = localeDe(idioma);
  const row = usePrestadorRow();
  if (!row) return null;
  const premium = esPro(row.pro_hasta);
  const gratisHasta = row.comision_gratis_hasta ? new Date(row.comision_gratis_hasta) : null;
  const enGratis = !!gratisHasta && gratisHasta.getTime() > Date.now();
  const diasGratis = gratisHasta ? Math.max(0, Math.ceil((gratisHasta.getTime() - Date.now()) / 86_400_000)) : 0;
  const tasaActual = enGratis ? 0 : premium ? 12 : 15;

  return (
    <div className="space-y-2">
      {enGratis ? (
        <div className="p-4 rounded-2xl bg-[#00C288]/10 border border-[#00C288] text-[#111827]">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 rounded-xl bg-[#00C288] items-center justify-center shrink-0">
              <Gift className="size-5 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{t("panel.periodoGratis", { fecha: fechaCL(gratisHasta!.toISOString(), locale) })}</div>
              <div className="text-xs text-[#00754F]">{diasGratis === 1 ? t("panel.teQuedanDia") : t("panel.teQuedanDias", { n: diasGratis })}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("panel.despues15")}</p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white border border-border">
          <div className="font-semibold text-sm">{t("panel.comisionVigente", { pct: tasaActual })}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {premium ? t("panel.tarifaPremium") : t("panel.tarifaNormal")}
          </p>
        </div>
      )}

      {premium ? (
        <div className="p-4 rounded-2xl bg-[#111827] text-white flex items-center gap-3">
          <span className="inline-flex size-10 rounded-xl bg-gradient-to-br from-[#EF9F27] to-[#F5C56B] items-center justify-center shrink-0">
            <Crown className="size-5 text-[#111827]" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{t("panel.premiumHasta", { fecha: fechaCL(row.pro_hasta!, locale) })}</div>
            <div className="text-xs text-white/70">{t("panel.premiumSub")}</div>
          </div>
          <Link to="/estadisticas" className="shrink-0 px-3 py-2 rounded-xl bg-white text-[#111827] text-xs font-bold">
            {t("panel.estadisticas")}
          </Link>
        </div>
      ) : (
        <Link to="/pro" className="flex items-center gap-3 p-4 rounded-2xl bg-[#FAC775] text-[#111827] hover:bg-[#F7BB5E] transition">
          <span className="inline-flex size-10 rounded-xl bg-[#111827] items-center justify-center shrink-0">
            <Crown className="size-5 text-[#EF9F27]" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{row.pro_trial_usado ? t("panel.vuelvePremium") : t("panel.pruebaPremium")}</div>
            <div className="text-xs text-[#854F0B]">{t("panel.premiumBeneficios")}</div>
          </div>
          <ChevronRight className="size-4 shrink-0" />
        </Link>
      )}
    </div>
  );
}

// ---------- EDITOR PERFIL ----------
interface ServicioRow {
  id: string; // prestador_servicios.id
  servicio_id: string;
  nombre: string;
  precio: number;
  precio_hasta: number;
  descripcion: string | null;
  foto_url: string | null;
  modalidades: string[];
  unidad: UnidadCobro;
  duracion_min: number | null;
  garantia_dias: number;
  materiales_incluidos: boolean;
  incluye: string | null;
  no_incluye: string | null;
}

type ServicioPatch = {
  precio: number; precio_hasta: number; descripcion: string | null; foto_url: string | null; modalidades: string[];
  unidad: UnidadCobro; duracion_min: number | null; garantia_dias: number; materiales_incluidos: boolean;
  incluye: string | null; no_incluye: string | null;
};
const MAX_INCLUYE = 600;
const MAX_NO_INCLUYE = 400;
/** label: clave i18n */
const MODALIDADES: { id: string; label: string }[] = [
  { id: "domicilio", label: "panel.modDomicilio" }, { id: "online", label: "panel.modOnline" }, { id: "local", label: "panel.modLocal" },
];

const MAX_DESC = 600;
const PRESET_COLORS = [
  ...categories.map((c) => c.bg),
  "#111827", "#EF9F27", "#0EA5E9", "#14B8A6", "#F59E0B", "#8B5CF6",
];

function sugerirHasta(desde: number) {
  return Math.round((desde * 1.3) / 1000) * 1000;
}
function maxHasta(desde: number) {
  return Math.floor(desde * 1.5);
}

async function subirAPerfiles(userId: string, file: File, slug: string) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("perfiles").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("perfiles").getPublicUrl(path).data.publicUrl;
}

function EditorPerfil() {
  const { t } = useT();
  const qc = useQueryClient();
  const { usuario, user } = useAuth();
  const row = usePrestadorRow();

  const [foto, setFoto] = useState("");
  const [bio, setBio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFoto(usuario?.foto_url ?? "");
  }, [usuario?.foto_url]);
  useEffect(() => {
    if (!row) return;
    setBio(row.bio ?? "");
    setDireccion(row.direccion ?? "");
  }, [row]);

  const cat = useMemo(() => categories.find((c) => c.id === row?.categoria_id), [row?.categoria_id]);

  // services
  const serviciosQ = useQuery({
    queryKey: ["mis-servicios", row?.id],
    enabled: !!row?.id,
    queryFn: async (): Promise<ServicioRow[]> => {
      const { data } = await supabase
        .from("prestador_servicios")
        .select("id, precio, precio_hasta, descripcion, foto_url, modalidades, unidad, duracion_min, garantia_dias, materiales_incluidos, incluye, no_incluye, servicio_id, servicios ( id, nombre )")
        .eq("prestador_id", row!.id);
      type R = {
        id: string; precio: number; precio_hasta: number; descripcion: string | null; foto_url: string | null;
        modalidades: string[] | null;
        unidad: string | null; duracion_min: number | null; garantia_dias: number | null; materiales_incluidos: boolean | null;
        incluye: string | null; no_incluye: string | null;
        servicio_id: string; servicios: { id: string; nombre: string } | null;
      };
      return ((data ?? []) as unknown as R[]).map((r) => ({
        id: r.id, servicio_id: r.servicio_id, nombre: r.servicios?.nombre ?? "?",
        precio: r.precio, precio_hasta: r.precio_hasta, descripcion: r.descripcion, foto_url: r.foto_url,
        modalidades: r.modalidades && r.modalidades.length > 0 ? r.modalidades : ["domicilio"],
        unidad: esUnidad(r.unidad) ? r.unidad : "trabajo",
        duracion_min: r.duracion_min ?? null,
        garantia_dias: r.garantia_dias ?? 0,
        materiales_incluidos: !!r.materiales_incluidos,
        incluye: r.incluye, no_incluye: r.no_incluye,
      }));
    },
  });
  const misServicios = serviciosQ.data ?? [];
  const ofrecidos = new Set(misServicios.map((s) => s.nombre));

  async function syncRangoPrestador(servicios: ServicioRow[]) {
    if (!row || servicios.length === 0) return;
    const desde = Math.min(...servicios.map((s) => s.precio));
    const hasta = Math.max(...servicios.map((s) => s.precio_hasta));
    await supabase.from("prestadores").update({ precio_desde: desde, precio_hasta: hasta }).eq("id", row.id);
    qc.invalidateQueries({ queryKey: ["prestador-row"] });
  }

  async function onPickFoto(file: File) {
    if (!user || !usuario) return;
    setSaving(true); setMsg(null);
    try {
      const url = await subirAPerfiles(user.id, file, "perfil");
      const u = await supabase.from("usuarios").update({ foto_url: url }).eq("id", usuario.id);
      if (u.error) throw u.error;
      if (row) await supabase.from("prestadores").update({ foto_url: url }).eq("id", row.id);
      setFoto(url);
      toast.success(t("panel.fotoActualizada"));
      qc.invalidateQueries({ queryKey: ["usuario"] });
      qc.invalidateQueries({ queryKey: ["prestador-row"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("panel.errFoto"));
    } finally {
      setSaving(false);
    }
  }

  async function savePerfil() {
    if (!usuario || !row) return;
    setSaving(true); setMsg(null);
    // Re-geocodificar la dirección base (best-effort); si falla se conservan las coordenadas previas.
    const geo = direccion.trim()
      ? await geocodificar(direccion.trim(), row.comuna ?? undefined).catch(() => null)
      : null;
    const p = await supabase.from("prestadores")
      .update({ bio, direccion, ...(geo ? { lat: geo.lat, lng: geo.lng } : {}) })
      .eq("id", row.id);
    setSaving(false);
    if (p.error) { const m = mensajeError(p.error, t("panel.errGuardar"), t); setMsg(m); toast.error(m); return; }
    setMsg(t("panel.perfilActualizado"));
    toast.success(t("panel.perfilActualizado"));
    qc.invalidateQueries({ queryKey: ["prestador-row"] });
    qc.invalidateQueries({ queryKey: ["provider"] });
  }

  async function toggleServicio(nombre: string) {
    if (!row) return;
    const existing = misServicios.find((s) => s.nombre === nombre);
    if (existing) {
      const { error } = await supabase.from("prestador_servicios").delete().eq("id", existing.id);
      if (error) { toast.error(mensajeError(error, t("panel.errGuardar"), t)); return; }
      await syncRangoPrestador(misServicios.filter((s) => s.id !== existing.id));
    } else {
      const { data: srv } = await supabase
        .from("servicios").select("id").eq("categoria_id", row.categoria_id).eq("nombre", nombre).maybeSingle();
      if (srv) {
        const precio = row.precio_desde || 15000;
        const { error } = await supabase.from("prestador_servicios").insert({
          prestador_id: row.id, servicio_id: srv.id, precio, precio_hasta: sugerirHasta(precio),
        });
        if (error) { toast.error(mensajeError(error, t("panel.errGuardar"), t)); return; }
      }
    }
    qc.invalidateQueries({ queryKey: ["mis-servicios"] });
  }

  async function updateServicio(id: string, patch: ServicioPatch) {
    const { error } = await supabase.from("prestador_servicios").update(patch).eq("id", id);
    if (error) throw error;
    await syncRangoPrestador(misServicios.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    qc.invalidateQueries({ queryKey: ["mis-servicios"] });
    qc.invalidateQueries({ queryKey: ["provider"] });
  }

  if (!row) return <div className="py-16 text-center text-muted-foreground"><Loader2 className="size-5 mx-auto animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <VerificacionBanner prestadorId={row.id} verificado={!!(row as { verificado?: boolean }).verificado} />

      {/* Foto */}
      <div className="p-4 rounded-2xl bg-white border border-border flex items-center gap-4">
        <ProviderAvatar url={foto || null} name={usuario?.nombre ?? "U"} size={64} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{t("panel.fotoPerfil")}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{t("panel.fotoPerfilSub")}</p>
          <button
            type="button" onClick={() => fotoRef.current?.click()} disabled={saving}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111827] text-white text-xs font-semibold disabled:opacity-50"
          >
            <ImagePlus className="size-3.5" /> {foto ? t("panel.cambiarFoto") : t("panel.subirFoto")}
          </button>
          <input ref={fotoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFoto(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* Bio */}
      <Field label={t("panel.sobreMi")}>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
          className="w-full p-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 resize-none text-sm" />
      </Field>

      <Field label={t("panel.direccionBase")}>
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder={t("panel.calleSector")}
          className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30" />
      </Field>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <button
        onClick={savePerfil} disabled={saving}
        className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-60"
      >
        {saving ? t("panel.guardando") : t("panel.guardarBio")}
      </button>

      {/* Servicios */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {t("panel.serviciosOfreces")} {cat ? `· ${cat.name}` : ""}
        </h3>
        <div className="flex flex-wrap gap-2">
          {cat?.services.map((s) => {
            const on = ofrecidos.has(s);
            return (
              <button key={s} onClick={() => toggleServicio(s)}
                className={`px-3.5 py-2 rounded-full text-sm border transition ${
                  on ? "bg-foreground text-background border-foreground" : "bg-white border-border text-foreground"
                }`}>
                {s}
              </button>
            );
          })}
        </div>

        {misServicios.length > 0 && (
          <div className="mt-3 space-y-3">
            {misServicios.map((s) => (
              <ServicioEditCard key={s.id} s={s} userId={user?.id ?? ""} onSave={(patch) => updateServicio(s.id, patch)} />
            ))}
          </div>
        )}
      </div>

      {/* Horario */}
      <HorarioCard prestadorId={row.id} horarioRaw={row.horario} />

      {/* Perfil público */}
      <PerfilPublicoCard
        prestadorId={row.id}
        userId={user?.id ?? ""}
        initial={{
          banner_url: row.banner_url, color_perfil: row.color_perfil, titulo_profesional: row.titulo_profesional,
          anos_experiencia: row.anos_experiencia, comuna: row.comuna,
          especialidades: row.especialidades ?? [], comunas_cobertura: row.comunas_cobertura ?? [], radio_km: row.radio_km ?? 15,
          idiomas: row.idiomas ?? ["Español"], tiene_vehiculo: !!row.tiene_vehiculo,
          herramientas_propias: row.herramientas_propias !== false, emite_boleta: !!row.emite_boleta,
        }}
      />

      {/* Galería de trabajos */}
      <GaleriaCard prestadorId={row.id} userId={user?.id ?? ""} initial={row.gallery_urls ?? []} />

      {/* Datos bancarios para liquidaciones */}
      <DatosBancariosCard prestadorId={row.id} />

      {/* Liquidaciones recibidas */}
      <MisLiquidacionesCard prestadorId={row.id} />
    </div>
  );
}

const TIPOS_CUENTA = ["Cuenta corriente", "Cuenta vista", "Cuenta RUT", "Ahorro"] as const;

function DatosBancariosCard({ prestadorId }: { prestadorId: string }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [banco, setBanco] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState<string>("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [rut, setRut] = useState("");
  const [titular, setTitular] = useState("");
  const [saving, setSaving] = useState(false);

  const bancoQ = useQuery({
    queryKey: ["prestador-banco", prestadorId],
    enabled: !!prestadorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("prestador_contacto")
        .select("banco, tipo_cuenta, numero_cuenta, rut, titular")
        .eq("prestador_id", prestadorId)
        .maybeSingle();
      return data;
    },
  });
  useEffect(() => {
    if (bancoQ.data) {
      setBanco(bancoQ.data.banco ?? "");
      setTipoCuenta(bancoQ.data.tipo_cuenta ?? "");
      setNumeroCuenta(bancoQ.data.numero_cuenta ?? "");
      setRut(bancoQ.data.rut ?? "");
      setTitular(bancoQ.data.titular ?? "");
    }
  }, [bancoQ.data]);

  async function guardar() {
    if (!banco.trim() || !numeroCuenta.trim() || !rut.trim() || !titular.trim()) {
      toast.error(t("panel.completaBanco")); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("prestador_contacto").upsert({
        prestador_id: prestadorId,
        banco: banco.trim(), tipo_cuenta: tipoCuenta || null, numero_cuenta: numeroCuenta.trim(),
        rut: rut.trim(), titular: titular.trim(),
      });
      if (error) throw error;
      toast.success(t("panel.bancoGuardado"));
      qc.invalidateQueries({ queryKey: ["prestador-banco"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("panel.errGuardarCorto"));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm";

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <DollarSign className="size-3.5" /> {t("panel.datosBancarios")}
      </h3>
      <div className="rounded-2xl bg-white border border-border p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("panel.datosBancariosSub")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.banco")}</span>
            <input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder={t("panel.bancoPlaceholder")} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.tipoCuenta")}</span>
            <select value={tipoCuenta} onChange={(e) => setTipoCuenta(e.target.value)} className={inputCls}>
              <option value="">{t("panel.selecciona")}</option>
              {TIPOS_CUENTA.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.numeroCuenta")}</span>
            <input value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} inputMode="numeric" placeholder={t("panel.numeroCuentaPlaceholder")} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.rutTitular")}</span>
            <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" className={inputCls} />
          </label>
          <label className="block col-span-2">
            <span className="block text-xs font-medium mb-1">{t("panel.nombreTitular")}</span>
            <input value={titular} onChange={(e) => setTitular(e.target.value)} placeholder={t("panel.comoBanco")} className={inputCls} />
          </label>
        </div>
        <button type="button" onClick={guardar} disabled={saving || bancoQ.isLoading}
          className="w-full h-11 rounded-xl bg-[#111827] text-white text-sm font-semibold disabled:opacity-50">
          {saving ? t("panel.guardando") : t("panel.guardarBanco")}
        </button>
      </div>
    </div>
  );
}

function MisLiquidacionesCard({ prestadorId }: { prestadorId: string }) {
  const { t, idioma } = useT();
  const liqQ = useQuery({
    queryKey: ["mis-liquidaciones", prestadorId],
    enabled: !!prestadorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones")
        .select("id, monto, medio, referencia, pagada_at, reservas")
        .eq("prestador_id", prestadorId)
        .order("pagada_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <History className="size-3.5" /> {t("panel.misLiquidaciones")}
      </h3>
      <div className="rounded-2xl bg-white border border-border overflow-hidden">
        {liqQ.isLoading ? (
          <div className="p-6 text-center"><Loader2 className="size-4 mx-auto animate-spin" /></div>
        ) : (liqQ.data?.length ?? 0) === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{t("panel.sinLiquidaciones")}</div>
        ) : (
          <ul className="divide-y divide-border">
            {liqQ.data!.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{new Date(l.pagada_at).toLocaleDateString(localeDe(idioma))} · {l.medio ?? t("panel.transferencia")}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.reservas.length} {l.reservas.length === 1 ? t("panel.servicio") : t("panel.servicios")}{l.referencia ? ` · ${t("panel.ref", { ref: l.referencia })}` : ""}
                  </div>
                </div>
                <div className="font-bold text-[#00754F] whitespace-nowrap">{formatCLP(l.monto)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ServicioEditCard({
  s, userId, onSave,
}: { s: ServicioRow; userId: string; onSave: (p: ServicioPatch) => Promise<void> }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [precio, setPrecio] = useState(s.precio);
  const [hasta, setHasta] = useState(s.precio_hasta);
  const [desc, setDesc] = useState(s.descripcion ?? "");
  const [modalidades, setModalidades] = useState<string[]>(s.modalidades);
  const [unidad, setUnidad] = useState<UnidadCobro>(s.unidad);
  const [duracion, setDuracion] = useState<number | null>(s.duracion_min);
  const [garantia, setGarantia] = useState(s.garantia_dias);
  const [materiales, setMateriales] = useState(s.materiales_incluidos);
  const [incluye, setIncluye] = useState(s.incluye ?? "");
  const [noIncluye, setNoIncluye] = useState(s.no_incluye ?? "");
  const [fotoUrl, setFotoUrl] = useState<string | null>(s.foto_url);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(s.foto_url);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPrecio(s.precio); setHasta(s.precio_hasta); setDesc(s.descripcion ?? "");
    setFotoUrl(s.foto_url); setPreview(s.foto_url); setFotoFile(null);
    setModalidades(s.modalidades);
    setUnidad(s.unidad); setDuracion(s.duracion_min); setGarantia(s.garantia_dias); setMateriales(s.materiales_incluidos);
    setIncluye(s.incluye ?? ""); setNoIncluye(s.no_incluye ?? "");
  }, [s]);

  function toggleModalidad(id: string) {
    setModalidades((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  const max = maxHasta(precio);
  const invalido = !precio || precio < 1000 || hasta < precio || hasta > max;

  async function guardar() {
    if (!precio || precio < 1000) { toast.error(t("panel.errPrecioMin")); return; }
    if (hasta < precio) { toast.error(t("panel.errHastaMenor")); return; }
    if (hasta > max) { toast.error(t("panel.errHastaMayor")); return; }
    if (desc.length > MAX_DESC) { toast.error(t("panel.errDesc", { n: MAX_DESC })); return; }
    if (modalidades.length === 0) { toast.error(t("panel.errModalidad")); return; }
    if (incluye.length > MAX_INCLUYE) { toast.error(t("panel.errIncluye", { n: MAX_INCLUYE })); return; }
    if (noIncluye.length > MAX_NO_INCLUYE) { toast.error(t("panel.errNoIncluye", { n: MAX_NO_INCLUYE })); return; }
    setSaving(true);
    try {
      let url = fotoUrl;
      if (fotoFile && userId) url = await subirAPerfiles(userId, fotoFile, `servicio-${s.servicio_id}`);
      await onSave({
        precio, precio_hasta: hasta, descripcion: desc.trim() || null, foto_url: url, modalidades,
        unidad, duracion_min: duracion, garantia_dias: garantia, materiales_incluidos: materiales,
        incluye: incluye.trim() || null, no_incluye: noIncluye.trim() || null,
      });
      setFotoUrl(url); setFotoFile(null);
      toast.success(t("panel.servicioActualizado", { nombre: s.nombre }));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("panel.errGuardarCorto"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-border overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {s.foto_url ? (
          <img src={s.foto_url} alt="" className="size-10 rounded-lg object-cover shrink-0" />
        ) : (
          <span className="size-10 rounded-lg bg-[#F5F5F0] flex items-center justify-center shrink-0"><ImagePlus className="size-4 text-muted-foreground" /></span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{s.nombre}</div>
          <div className="text-xs text-muted-foreground">
            {formatCLP(s.precio)} – {formatCLP(s.precio_hasta)} {UNIDAD_LABEL[s.unidad]} · {s.modalidades.map((m) => MODALIDAD_LABEL[m] ?? m).join(", ")}
          </div>
        </div>
        <ChevronDown className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-4 border-t border-border space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1">{t("panel.precioDesdeCLP")}</span>
              <input type="number" min={1000} step={1000} value={precio || ""}
                onChange={(e) => { const v = Number(e.target.value); setPrecio(v); setHasta(sugerirHasta(v)); }}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium mb-1">{t("panel.precioHastaCLP")}</span>
              <input type="number" min={precio} max={max} step={1000} value={hasta || ""}
                onChange={(e) => setHasta(Number(e.target.value))}
                onBlur={() => { if (hasta > max) setHasta(max); else if (hasta < precio) setHasta(precio); }}
                className={`w-full h-11 px-3 rounded-xl bg-muted/50 border outline-none text-sm ${invalido ? "border-[#FF3B6B]" : "border-border focus:border-foreground/30"}`} />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            {t("panel.max50")}
            {precio >= 1000 && <> {t("panel.maxPermitido")} <strong>{formatCLP(max)}</strong>.</>}
          </p>

          <div>
            <span className="block text-xs font-medium mb-2">{t("panel.unidadCobro")}</span>
            <SegmentedPanel options={UNIDADES.map((u) => ({ value: u, label: UNIDAD_LABEL[u] }))} value={unidad} onChange={setUnidad} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1">{t("panel.duracionEstimada")}</span>
              <select
                value={duracion === null ? "null" : String(duracion)}
                onChange={(e) => setDuracion(e.target.value === "null" ? null : Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
              >
                {DURACION_OPCIONES.map((o) => (
                  <option key={String(o.value)} value={o.value === null ? "null" : String(o.value)}>{o.label}</option>
                ))}
              </select>
            </label>
            <div>
              <span className="block text-xs font-medium mb-1">{t("panel.garantia")}</span>
              <SegmentedPanel options={GARANTIA_OPCIONES} value={garantia} onChange={setGarantia} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="min-w-0">
              <div className="text-sm font-medium">{t("panel.materialesIncluidos")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t("panel.materialesSub")}</div>
            </div>
            <button type="button" onClick={() => setMateriales((v) => !v)} aria-pressed={materiales}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${materiales ? "bg-[#00C288]" : "bg-[#D1D5DB]"}`}>
              <span className={`inline-block size-5 rounded-full bg-white shadow transition ${materiales ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.queIncluye")}</span>
            <textarea rows={3} maxLength={MAX_INCLUYE} value={incluye} onChange={(e) => setIncluye(e.target.value)}
              placeholder={t("panel.queIncluyePlaceholder")}
              className="w-full p-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 resize-none text-sm" />
            <span className="block text-right text-[11px] text-muted-foreground mt-1">{incluye.length}/{MAX_INCLUYE}</span>
          </label>

          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.queNoIncluye")}</span>
            <textarea rows={2} maxLength={MAX_NO_INCLUYE} value={noIncluye} onChange={(e) => setNoIncluye(e.target.value)}
              placeholder={t("panel.queNoIncluyePlaceholder")}
              className="w-full p-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 resize-none text-sm" />
            <span className="block text-right text-[11px] text-muted-foreground mt-1">{noIncluye.length}/{MAX_NO_INCLUYE}</span>
          </label>

          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.descripcionCorta")}</span>
            <textarea rows={3} maxLength={MAX_DESC} value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder={t("panel.descripcionPlaceholder")}
              className="w-full p-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 resize-none text-sm" />
            <span className="block text-right text-[11px] text-muted-foreground mt-1">{desc.length}/{MAX_DESC}</span>
          </label>

          <div>
            <span className="block text-xs font-medium mb-2">{t("panel.modalidad")}</span>
            <div className="flex flex-wrap gap-2">
              {MODALIDADES.map((m) => {
                const on = modalidades.includes(m.id);
                return (
                  <label key={m.id} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition ${
                    on ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-border"
                  }`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleModalidad(m.id)} />
                    {on && <Check className="size-3.5" />}
                    {t(m.label)}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("panel.onlineSinDireccion")}</p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => ref.current?.click()}
              className="size-16 rounded-xl overflow-hidden bg-[#F5F5F0] border-2 border-dashed border-[#E5E7EB] flex items-center justify-center shrink-0">
              {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-[#EF9F27]" />}
            </button>
            <div className="text-xs text-muted-foreground flex-1">
              <div className="font-medium text-[#111827]">{t("panel.fotoServicio")}</div>
              {t("panel.fotoServicioSub")}
              {preview && (
                <button type="button" onClick={() => { setPreview(null); setFotoUrl(null); setFotoFile(null); }}
                  className="block mt-1 text-[#FF3B6B] font-semibold">{t("panel.quitarFoto")}</button>
              )}
            </div>
            <input ref={ref} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setPreview(URL.createObjectURL(f)); } e.target.value = ""; }} />
          </div>

          <button type="button" onClick={guardar} disabled={saving || invalido}
            className="w-full h-11 rounded-xl bg-[#111827] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? t("panel.guardando") : t("panel.guardarServicio")}
          </button>
        </div>
      )}
    </div>
  );
}

const MAX_GALERIA = 12;

function GaleriaCard({ prestadorId, userId, initial }: { prestadorId: string; userId: string; initial: string[] }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [urls, setUrls] = useState<string[]>(initial);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setUrls(initial); }, [initial]);

  async function persistir(next: string[]) {
    setGuardando(true);
    try {
      const { error } = await supabase.from("prestadores").update({ gallery_urls: next }).eq("id", prestadorId);
      if (error) throw error;
      setUrls(next);
      qc.invalidateQueries({ queryKey: ["prestador-row"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("panel.errGaleria"));
    } finally {
      setGuardando(false);
    }
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0 || !userId) return;
    const libres = MAX_GALERIA - urls.length;
    if (libres <= 0) { toast.error(t("panel.maxFotos", { n: MAX_GALERIA })); return; }
    const lista = Array.from(files).slice(0, libres);
    if (lista.length < files.length) toast.info(t("panel.soloSubiran", { n: lista.length, max: MAX_GALERIA }));
    setSubiendo(true);
    const nuevas: string[] = [];
    try {
      for (const f of lista) {
        const comp = await comprimirImagen(f);
        nuevas.push(await subirAPerfiles(userId, comp, "galeria"));
      }
      await persistir([...urls, ...nuevas]);
      toast.success(nuevas.length === 1 ? t("panel.fotoAgregada") : t("panel.fotosAgregadas", { n: nuevas.length }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("panel.errFoto"));
      if (nuevas.length > 0) await persistir([...urls, ...nuevas]);
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar(url: string) {
    await persistir(urls.filter((u) => u !== url));
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Images className="size-3.5" /> {t("panel.galeria")}
      </h3>
      <div className="rounded-2xl bg-white border border-border p-4">
        <p className="text-sm text-muted-foreground">
          {t("panel.galeriaSub", { n: MAX_GALERIA })}
        </p>
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {urls.map((u) => (
            <div key={u} className="relative aspect-square rounded-xl overflow-hidden bg-[#F5F5F0] group">
              <img src={u} alt="" loading="lazy" className="size-full object-cover" />
              <button
                type="button" onClick={() => quitar(u)} disabled={guardando} aria-label={t("panel.quitarFoto")}
                className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-[#FF3B6B] disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {urls.length < MAX_GALERIA && (
            <button
              type="button" onClick={() => ref.current?.click()} disabled={subiendo || !userId}
              className="aspect-square rounded-xl bg-[#F5F5F0] border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:border-[#EF9F27] disabled:opacity-50"
            >
              {subiendo ? <Loader2 className="size-5 animate-spin text-[#EF9F27]" /> : <ImagePlus className="size-5 text-[#EF9F27]" />}
              {subiendo ? t("panel.subiendo") : t("panel.agregar")}
            </button>
          )}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground text-right">{urls.length}/{MAX_GALERIA}</div>
        <input
          ref={ref} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { onPick(e.target.files); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}

function HorarioCard({ prestadorId, horarioRaw }: { prestadorId: string; horarioRaw: unknown }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [horario, setHorario] = useState<Horario>(() => parseHorario(horarioRaw));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setHorario(parseHorario(horarioRaw)); }, [horarioRaw]);

  async function guardar() {
    const e = validarHorario(horario, t);
    if (e) { toast.error(e); return; }
    setSaving(true);
    const { error } = await supabase.from("prestadores").update({ horario }).eq("id", prestadorId);
    setSaving(false);
    if (error) { toast.error(mensajeError(error, t("panel.errGuardar"), t)); return; }
    toast.success(t("panel.horarioActualizado"));
    qc.invalidateQueries({ queryKey: ["prestador-row"] });
    qc.invalidateQueries({ queryKey: ["provider"] });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Clock className="size-3.5" /> {t("panel.horarioAtencion")}
      </h3>
      <HorarioEditor value={horario} onChange={setHorario} compact />
      <button type="button" onClick={guardar} disabled={saving}
        className="mt-3 w-full h-11 rounded-xl bg-[#111827] text-white text-sm font-semibold disabled:opacity-50">
        {saving ? t("panel.guardando") : t("panel.guardarHorario")}
      </button>
    </div>
  );
}

interface PerfilPublicoInitial {
  banner_url: string | null;
  color_perfil: string | null;
  titulo_profesional: string | null;
  anos_experiencia: number | null;
  comuna: string | null;
  especialidades: string[];
  comunas_cobertura: string[];
  radio_km: number;
  idiomas: string[];
  tiene_vehiculo: boolean;
  herramientas_propias: boolean;
  emite_boleta: boolean;
}

function PerfilPublicoCard({ prestadorId, userId, initial }: { prestadorId: string; userId: string; initial: PerfilPublicoInitial }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial.banner_url);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initial.banner_url);
  const [color, setColor] = useState(initial.color_perfil ?? "#EF9F27");
  const [titulo, setTitulo] = useState(initial.titulo_profesional ?? "");
  const [anos, setAnos] = useState<number>(initial.anos_experiencia ?? 0);
  const [comuna, setComuna] = useState(initial.comuna ?? "");
  const [especialidades, setEspecialidades] = useState<string[]>(initial.especialidades);
  const [comunasCobertura, setComunasCobertura] = useState<string[]>(initial.comunas_cobertura);
  const [radioKm, setRadioKm] = useState(initial.radio_km);
  const [idiomas, setIdiomas] = useState<string[]>(initial.idiomas);
  const [tieneVehiculo, setTieneVehiculo] = useState(initial.tiene_vehiculo);
  const [herramientasPropias, setHerramientasPropias] = useState(initial.herramientas_propias);
  const [emiteBoleta, setEmiteBoleta] = useState(initial.emite_boleta);
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const row = usePrestadorRow();
  const cat = useMemo(() => categories.find((c) => c.id === row?.categoria_id), [row?.categoria_id]);

  useEffect(() => {
    setBannerUrl(initial.banner_url); setBannerPreview(initial.banner_url); setBannerFile(null);
    setColor(initial.color_perfil ?? "#EF9F27");
    setTitulo(initial.titulo_profesional ?? "");
    setAnos(initial.anos_experiencia ?? 0);
    setComuna(initial.comuna ?? "");
  }, [initial.banner_url, initial.color_perfil, initial.titulo_profesional, initial.anos_experiencia, initial.comuna]);
  const listasKey = `${initial.especialidades.join("|")}~${initial.comunas_cobertura.join("|")}~${initial.idiomas.join("|")}`;
  useEffect(() => {
    setEspecialidades(initial.especialidades); setComunasCobertura(initial.comunas_cobertura); setRadioKm(initial.radio_km);
    setIdiomas(initial.idiomas); setTieneVehiculo(initial.tiene_vehiculo);
    setHerramientasPropias(initial.herramientas_propias); setEmiteBoleta(initial.emite_boleta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listasKey, initial.radio_km, initial.tiene_vehiculo, initial.herramientas_propias, initial.emite_boleta]);

  const contactoQ = useQuery({
    queryKey: ["prestador-contacto", prestadorId],
    enabled: !!prestadorId,
    queryFn: async () => {
      const { data } = await supabase.from("prestador_contacto").select("telefono, whatsapp").eq("prestador_id", prestadorId).maybeSingle();
      return data;
    },
  });
  useEffect(() => {
    if (contactoQ.data) {
      setTelefono(contactoQ.data.telefono ?? "");
      setWhatsapp(contactoQ.data.whatsapp ?? "");
    }
  }, [contactoQ.data]);

  async function guardar() {
    if (titulo.trim().length > 0 && titulo.trim().length < 3) { toast.error(t("panel.errTituloCorto")); return; }
    if (!Number.isFinite(anos) || anos < 0 || anos > 60) { toast.error(t("panel.errAnos")); return; }
    if (radioKm < 1 || radioKm > 200) { toast.error(t("panel.errRadio")); return; }
    if (idiomas.length === 0) { toast.error(t("panel.errIdioma")); return; }
    setSaving(true);
    try {
      let url = bannerUrl;
      if (bannerFile && userId) url = await subirAPerfiles(userId, bannerFile, "banner");
      const p = await supabase.from("prestadores").update({
        banner_url: url, color_perfil: color, titulo_profesional: titulo.trim() || null,
        anos_experiencia: anos, comuna: comuna.trim() || null,
        especialidades, comunas_cobertura: comunasCobertura, radio_km: radioKm, idiomas,
        tiene_vehiculo: tieneVehiculo, herramientas_propias: herramientasPropias, emite_boleta: emiteBoleta,
      }).eq("id", prestadorId);
      if (p.error) throw p.error;
      const c = await supabase.from("prestador_contacto").upsert({
        prestador_id: prestadorId, telefono: telefono.trim() || null, whatsapp: whatsapp.trim() || null,
      });
      if (c.error) throw c.error;
      setBannerUrl(url); setBannerFile(null);
      toast.success(t("panel.perfilPublicoActualizado"));
      qc.invalidateQueries({ queryKey: ["prestador-row"] });
      qc.invalidateQueries({ queryKey: ["prestador-contacto"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("panel.errGuardarCorto"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Palette className="size-3.5" /> {t("panel.perfilPublico")}
      </h3>
      <div className="rounded-2xl bg-white border border-border overflow-hidden">
        {/* Banner */}
        <div className="relative h-28 w-full" style={{ backgroundColor: color }}>
          {bannerPreview && <img src={bannerPreview} alt="" className="absolute inset-0 size-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <button type="button" onClick={() => bannerRef.current?.click()}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 text-[#111827] text-xs font-semibold">
            <ImagePlus className="size-3.5" /> {bannerPreview ? t("panel.cambiarBanner") : t("panel.subirBanner")}
          </button>
          {bannerPreview && (
            <button type="button" onClick={() => { setBannerPreview(null); setBannerUrl(null); setBannerFile(null); }}
              className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/50 text-white text-xs font-semibold">
              {t("panel.quitar")}
            </button>
          )}
          <input ref={bannerRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); } e.target.value = ""; }} />
        </div>

        <div className="p-4 space-y-4">
          <div>
            <span className="block text-xs font-medium mb-2">{t("panel.colorPerfil")}</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={c}
                  className={`size-8 rounded-full border-2 transition ${color.toLowerCase() === c.toLowerCase() ? "border-[#111827] scale-110" : "border-white shadow"}`}
                  style={{ backgroundColor: c }} />
              ))}
              <label className="size-8 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden relative">
                <Palette className="size-4 text-muted-foreground" />
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="block text-xs font-medium mb-1">{t("panel.tituloProfesional")}</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t("panel.tituloPlaceholder")}
              className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1">{t("panel.anosExperiencia")}</span>
              <input type="number" min={0} max={60} value={anos} onChange={(e) => setAnos(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium mb-1">{t("panel.comuna")}</span>
              <input value={comuna} onChange={(e) => setComuna(e.target.value)} placeholder={t("panel.comunaPlaceholder")}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm" />
            </label>
          </div>

          <div>
            <span className="block text-xs font-medium mb-1">{t("panel.especialidades")}</span>
            <ChipsPanel value={especialidades} onChange={setEspecialidades} max={8}
              suggestions={(cat?.services ?? [])} placeholder={t("panel.escribeEnter")} />
          </div>

          <div>
            <span className="block text-xs font-medium mb-1">{t("panel.comunasAtiendes")}</span>
            <ChipsPanel value={comunasCobertura} onChange={setComunasCobertura} max={30}
              suggestions={COMUNAS_SUGERIDAS} placeholder={t("panel.comunaEnter")} />
            <p className="text-[11px] text-muted-foreground mt-1">{t("panel.sinComunasRadio")}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">{t("panel.radioDesplazamiento")}</span>
              <span className="text-xs font-bold">{radioKm} km</span>
            </div>
            <input type="range" min={1} max={60} step={1} value={radioKm} onChange={(e) => setRadioKm(Number(e.target.value))} className="w-full accent-[#EF9F27]" />
          </div>

          <div>
            <span className="block text-xs font-medium mb-2">{t("panel.idiomas")}</span>
            <div className="flex flex-wrap gap-2">
              {IDIOMAS_OPCIONES.map((o) => {
                const on = idiomas.includes(o);
                return (
                  <label key={o} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition ${
                    on ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-border"
                  }`}>
                    <input type="checkbox" className="sr-only" checked={on}
                      onChange={() => setIdiomas(on ? idiomas.filter((x) => x !== o) : [...idiomas, o])} />
                    {on && <Check className="size-3.5" />}
                    {o}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <TogglePanel label={t("panel.tengoVehiculo")} value={tieneVehiculo} onChange={setTieneVehiculo} />
            <TogglePanel label={t("panel.herramientasPropias")} value={herramientasPropias} onChange={setHerramientasPropias} />
            <TogglePanel label={t("panel.emitoBoleta")} value={emiteBoleta} onChange={setEmiteBoleta} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1">{t("panel.telefono")}</span>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+56 9 1234 5678"
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium mb-1">WhatsApp</span>
              <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+56 9 1234 5678"
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm" />
            </label>
          </div>

          <div className="flex gap-3">
            <Link
              to="/prestador/$id" params={{ id: prestadorId }}
              className="h-11 px-4 rounded-xl border border-border text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-muted"
            >
              <ExternalLink className="size-4" /> {t("panel.verPerfilPublico")}
            </Link>
            <button type="button" onClick={guardar} disabled={saving}
              className="flex-1 h-11 rounded-xl bg-[#111827] text-white text-sm font-semibold disabled:opacity-50">
              {saving ? t("panel.guardando") : t("panel.guardarPerfilPublico")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-2">{label}</span>
      {children}
    </label>
  );
}

function SegmentedPanel<T extends string | number>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-muted/60 border border-border">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} aria-pressed={on}
            className={`flex-1 min-w-[4.5rem] h-9 px-2 rounded-lg text-xs font-semibold transition ${
              on ? "bg-[#111827] text-white shadow-sm" : "text-[#374151] hover:bg-white"
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TogglePanel({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
      <div className="text-sm font-medium">{label}</div>
      <button type="button" onClick={() => onChange(!value)} aria-pressed={value}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${value ? "bg-[#00C288]" : "bg-[#D1D5DB]"}`}>
        <span className={`inline-block size-5 rounded-full bg-white shadow transition ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function ChipsPanel({
  value, onChange, suggestions, placeholder, max,
}: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder?: string; max: number }) {
  const { t } = useT();
  const [texto, setTexto] = useState("");
  const lleno = value.length >= max;
  const norm = (s: string) => s.trim().toLowerCase();
  function agregar(raw: string) {
    const v = raw.trim().replace(/\s+/g, " ");
    if (!v || lleno) return;
    if (!value.some((x) => norm(x) === norm(v))) onChange([...value, v]);
    setTexto("");
  }
  const filtradas = suggestions
    .filter((s) => !value.some((x) => norm(x) === norm(s)))
    .filter((s) => !texto.trim() || norm(s).includes(norm(texto)))
    .slice(0, 8);
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#111827] text-white text-xs">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={t("panel.quitarX", { x: v })} className="p-0.5 rounded-full hover:bg-white/20">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input value={texto} onChange={(e) => setTexto(e.target.value)} disabled={lleno}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); agregar(texto); } }}
        onBlur={() => { if (texto.trim()) agregar(texto); }}
        placeholder={lleno ? t("panel.maximoN", { n: max }) : placeholder}
        className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm disabled:opacity-60" />
      {!lleno && filtradas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtradas.map((s) => (
            <button key={s} type="button" onClick={() => agregar(s)}
              className="px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs text-[#374151] hover:bg-white transition">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VerificacionBanner({ prestadorId, verificado }: { prestadorId: string; verificado: boolean }) {
  const { t } = useT();
  const verifQ = useQuery({
    queryKey: ["mi-verif-status", prestadorId],
    enabled: !!prestadorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("verificaciones_prestador")
        .select("estado, motivo_rechazo")
        .eq("prestador_id", prestadorId)
        .order("created_at", { ascending: false })
        .maybeSingle();
      return data;
    },
  });

  if (verificado) {
    return (
      <div className="p-4 rounded-2xl bg-[#111827] text-white flex items-center gap-3">
        <span className="inline-flex size-9 rounded-full bg-white/10 items-center justify-center">
          <Check className="size-5 text-[#EF9F27]" />
        </span>
        <div className="flex-1">
          <div className="font-semibold text-sm">{t("panel.verificadoHomie")}</div>
          <div className="text-xs text-white/70">{t("panel.identidadConfirmada")}</div>
        </div>
      </div>
    );
  }

  const estado = verifQ.data?.estado;
  if (estado === "pendiente") {
    return (
      <div className="p-4 rounded-2xl bg-[#E5E7EB] text-[#111827] flex items-center gap-3">
        <span className="inline-flex size-9 rounded-full bg-white items-center justify-center text-xs font-bold">⏳</span>
        <div className="flex-1">
          <div className="font-semibold text-sm">{t("panel.enRevision")}</div>
          <div className="text-xs text-[#6B7280]">{t("panel.enRevisionSub")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-[#FAC775] text-[#111827]">
      <div className="font-semibold text-sm">{t("panel.completaVerificacion")}</div>
      {estado === "rechazado" && verifQ.data?.motivo_rechazo && (
        <div className="text-xs mt-1 text-[#854F0B]"><strong>{t("panel.rechazoPrevio")}</strong> {verifQ.data.motivo_rechazo}</div>
      )}
      <Link
        to="/verificar-identidad"
        className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-sm font-semibold"
      >
        {t("panel.verificarme")}
      </Link>
    </div>
  );
}
