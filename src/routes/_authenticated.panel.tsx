import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  CalendarCheck, MapPin, Check, X, Truck, CheckCircle2, Star, DollarSign,
  LayoutDashboard, ListTodo, History, UserCog, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import {
  useProviderBookings, useUpdateBookingStatus,
  type Booking, type DbEstado,
} from "@/store/bookings";
import { formatCLP, categories } from "@/data/services";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [{ title: "Panel del prestador — Manitos" }] }),
  component: PanelPage,
});

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  "en camino": "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-700",
};

type Tab = "resumen" | "pendientes" | "historial" | "perfil";

function PanelPage() {
  const { usuario } = useAuth();
  const { bookings, isLoading, hasPrestador } = useProviderBookings();
  const [tab, setTab] = useState<Tab>("resumen");

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Solo prestadores</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta sección es para cuentas de tipo prestador.</p>
          <Link to="/" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm">Ir al inicio</Link>
        </div>
      </AppShell>
    );
  }

  if (!isLoading && !hasPrestador) {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Completa tu perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">Necesitas completar tu onboarding de prestador.</p>
          <Link to="/onboarding-prestador" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm">
            Completar perfil
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">Hola {usuario?.nombre?.split(" ")[0] ?? ""}, aquí gestionas tu negocio</p>
      </header>

      <Tabs tab={tab} setTab={setTab} pendingCount={bookings.filter((b) => b.status === "pendiente").length} />

      <div className="px-5 mt-5">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground"><Loader2 className="size-5 mx-auto animate-spin" /></div>
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
  const items: { id: Tab; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: "resumen", label: "Resumen", icon: LayoutDashboard },
    { id: "pendientes", label: "Pendientes", icon: ListTodo, badge: pendingCount },
    { id: "historial", label: "Historial", icon: History },
    { id: "perfil", label: "Perfil", icon: UserCog },
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
      <AvailabilityToggle />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={CalendarCheck}
          label="Hoy"
          value={String(reservasHoy.length)}
          sub="reservas activas"
          tint="bg-blue-50 text-blue-700"
        />
        <RatingCard />
        <StatCard
          icon={DollarSign}
          label="Mes"
          value={formatCLP(ingresosMes)}
          sub="ingresos"
          tint="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          icon={CheckCircle2}
          label="Total"
          value={String(completadas)}
          sub="trabajos completados"
          tint="bg-violet-50 text-violet-700"
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Próximas reservas</h2>
        {reservasHoy.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            No tienes reservas para hoy
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
  icon: Icon, label, value, sub, tint,
}: { icon: typeof CalendarCheck; label: string; value: string; sub: string; tint: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className={`inline-flex size-9 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="size-4" />
      </div>
      <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold mt-0.5 truncate">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function RatingCard() {
  const data = usePrestadorRow();
  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="inline-flex size-9 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
        <Star className="size-4 fill-current" />
      </div>
      <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wide">Calificación</div>
      <div className="text-xl font-bold mt-0.5">
        {data ? Number(data.calificacion_promedio).toFixed(1) : "—"}
      </div>
      <div className="text-xs text-muted-foreground">{data?.resenas_count ?? 0} reseñas</div>
    </div>
  );
}

// ---------- PENDIENTES / HISTORIAL ----------
function Pendientes({ bookings }: { bookings: Booking[] }) {
  const pendientes = bookings.filter((b) => b.status === "pendiente");
  const activas = bookings.filter((b) => b.status === "confirmada" || b.status === "en camino");
  if (pendientes.length === 0 && activas.length === 0) {
    return <Empty icon={ListTodo} title="Sin solicitudes" sub="Las nuevas reservas aparecerán aquí en tiempo real." />;
  }
  return (
    <div className="space-y-6">
      {pendientes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Nuevas ({pendientes.length})</h2>
          <div className="space-y-2">{pendientes.map((b) => <ProviderBookingCard key={b.id} b={b} />)}</div>
        </section>
      )}
      {activas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">En curso</h2>
          <div className="space-y-2">{activas.map((b) => <ProviderBookingCard key={b.id} b={b} />)}</div>
        </section>
      )}
    </div>
  );
}

function Historial({ bookings }: { bookings: Booking[] }) {
  const items = bookings.filter((b) => b.status === "completado" || b.status === "cancelada");
  if (items.length === 0) return <Empty icon={History} title="Sin historial" sub="Aquí verás los trabajos completados." />;
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

function ProviderBookingCard({ b }: { b: Booking }) {
  const update = useUpdateBookingStatus();
  const set = (estado: DbEstado) => update.mutate({ id: b.id, estado });

  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{b.service}</div>
          <div className="text-sm text-muted-foreground">para {b.clientName}</div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[b.status]}`}>{b.status}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span>{b.date} · {b.time}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{b.address}</span>
      </div>
      {b.note && <p className="mt-2 text-xs text-muted-foreground italic">"{b.note}"</p>}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="font-semibold text-sm">{formatCLP(b.price)}</span>
        <div className="flex gap-2">
          {b.status === "pendiente" && (
            <>
              <button disabled={update.isPending} onClick={() => set("cancelada")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50">
                <X className="size-3.5" /> Rechazar
              </button>
              <button disabled={update.isPending} onClick={() => set("confirmada")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50">
                <Check className="size-3.5" /> Aceptar
              </button>
            </>
          )}
          {b.status === "confirmada" && (
            <button disabled={update.isPending} onClick={() => set("en_camino")}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50">
              <Truck className="size-3.5" /> En camino
            </button>
          )}
          {b.status === "en camino" && (
            <button disabled={update.isPending} onClick={() => set("completada")}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-semibold disabled:opacity-50">
              <CheckCircle2 className="size-3.5" /> Completar
            </button>
          )}
        </div>
      </div>
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
        .select("id, bio, direccion, precio_desde, disponible_ahora, categoria_id, calificacion_promedio, resenas_count")
        .eq("usuario_id", usuario!.id)
        .maybeSingle();
      return data;
    },
  });
  return q.data;
}

function AvailabilityToggle() {
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
    <div className="p-4 rounded-2xl bg-white border border-border flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-sm">Disponibilidad</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {on ? "Estás aceptando reservas" : "No apareces en búsquedas"}
        </div>
      </div>
      <button
        onClick={() => m.mutate(!on)}
        disabled={m.isPending || !row}
        aria-pressed={on}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-50 ${
          on ? "bg-green-500" : "bg-muted-foreground/30"
        }`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition ${on ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

// ---------- EDITOR PERFIL ----------
interface ServicioRow {
  id: string; // prestador_servicios.id
  servicio_id: string;
  nombre: string;
  precio: number;
}

function EditorPerfil() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const row = usePrestadorRow();

  const [foto, setFoto] = useState("");
  const [bio, setBio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [precio, setPrecio] = useState<number>(15000);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setFoto(usuario?.foto_url ?? "");
  }, [usuario?.foto_url]);
  useEffect(() => {
    if (!row) return;
    setBio(row.bio ?? "");
    setDireccion(row.direccion ?? "");
    setPrecio(row.precio_desde ?? 15000);
  }, [row]);

  const cat = useMemo(() => categories.find((c) => c.id === row?.categoria_id), [row?.categoria_id]);

  // services
  const serviciosQ = useQuery({
    queryKey: ["mis-servicios", row?.id],
    enabled: !!row?.id,
    queryFn: async (): Promise<ServicioRow[]> => {
      const { data } = await supabase
        .from("prestador_servicios")
        .select("id, precio, servicio_id, servicios ( id, nombre )")
        .eq("prestador_id", row!.id);
      type R = { id: string; precio: number; servicio_id: string; servicios: { id: string; nombre: string } | null };
      return ((data ?? []) as unknown as R[]).map((r) => ({
        id: r.id, servicio_id: r.servicio_id, nombre: r.servicios?.nombre ?? "?", precio: r.precio,
      }));
    },
  });
  const misServicios = serviciosQ.data ?? [];
  const ofrecidos = new Set(misServicios.map((s) => s.nombre));

  async function savePerfil() {
    if (!usuario || !row) return;
    setSaving(true); setMsg(null);
    const u = await supabase.from("usuarios").update({ foto_url: foto || null }).eq("id", usuario.id);
    const p = await supabase.from("prestadores").update({
      bio, direccion, precio_desde: precio, precio_hasta: Math.round(precio * 1.5),
    }).eq("id", row.id);
    setSaving(false);
    if (u.error || p.error) { setMsg(u.error?.message ?? p.error?.message ?? "Error al guardar"); return; }
    setMsg("Perfil actualizado");
    qc.invalidateQueries({ queryKey: ["prestador-row"] });
    qc.invalidateQueries({ queryKey: ["usuario"] });
    qc.invalidateQueries({ queryKey: ["provider"] });
  }

  async function toggleServicio(nombre: string) {
    if (!row) return;
    const existing = misServicios.find((s) => s.nombre === nombre);
    if (existing) {
      await supabase.from("prestador_servicios").delete().eq("id", existing.id);
    } else {
      const { data: srv } = await supabase
        .from("servicios").select("id").eq("categoria_id", row.categoria_id).eq("nombre", nombre).maybeSingle();
      if (srv) {
        await supabase.from("prestador_servicios").insert({
          prestador_id: row.id, servicio_id: srv.id, precio,
        });
      }
    }
    qc.invalidateQueries({ queryKey: ["mis-servicios"] });
  }

  async function updateServicioPrecio(id: string, nuevoPrecio: number) {
    await supabase.from("prestador_servicios").update({ precio: nuevoPrecio }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["mis-servicios"] });
  }

  if (!row) return <div className="py-16 text-center text-muted-foreground"><Loader2 className="size-5 mx-auto animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Foto */}
      <div className="p-4 rounded-2xl bg-white border border-border flex items-center gap-4">
        <ProviderAvatar url={foto || null} name={usuario?.nombre ?? "U"} size={64} />
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Foto de perfil (URL)</label>
          <input
            value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="https://..."
            className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
          />
        </div>
      </div>

      {/* Bio */}
      <Field label="Sobre mí (bio)">
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
          className="w-full p-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 resize-none text-sm" />
      </Field>

      <Field label="Dirección base">
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Comuna o sector"
          className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30" />
      </Field>

      <Field label="Precio base por hora (CLP)">
        <input type="number" min={1000} step={1000} value={precio} onChange={(e) => setPrecio(Number(e.target.value))}
          className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30" />
      </Field>

      {/* Servicios */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Servicios que ofreces {cat ? `· ${cat.name}` : ""}
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
          <div className="mt-3 divide-y divide-border rounded-2xl bg-white border border-border">
            {misServicios.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm truncate">{s.nombre}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">CLP</span>
                  <input
                    type="number" min={1000} step={1000} defaultValue={s.precio}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v && v !== s.precio) updateServicioPrecio(s.id, v);
                    }}
                    className="w-28 h-9 px-3 rounded-lg bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm text-right"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <button
        onClick={savePerfil} disabled={saving}
        className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
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
