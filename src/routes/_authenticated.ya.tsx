import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Zap, KeyRound, Droplets, Lightbulb, Flame, Car, Stethoscope, PawPrint, Sparkles,
  ArrowLeft, MapPin, Phone, Loader2, LocateFixed, Star, Clock, XCircle, CreditCard, Search, FileText,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { geocodificar, type GeoPoint } from "@/lib/geocode";
import { getCategory, type CategoryId } from "@/data/services";
import { mensajeError } from "@/lib/errores";

export const Route = createFileRoute("/_authenticated/ya")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s.id === "string" && s.id ? { id: s.id } : {}),
  head: () => ({ meta: [
    { name: "description", content: "Solicita asistencia urgente de profesionales con Homie Ya." },
    { property: "og:title", content: "Homie Ya — urgencias — Homie" },
    { property: "og:description", content: "Solicita asistencia urgente de profesionales con Homie Ya." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Homie Ya — urgencias — Homie" }] }),
  component: YaPage,
});

/** Tipos de urgencia con cobertura Homie Ya. `servicio` se usa para buscar el servicio_id por nombre. */
interface TipoUrgencia {
  id: string;
  label: string;
  hint: string;
  categoria: CategoryId;
  servicio: string;
  icon: LucideIcon;
  bg: string;
}

const TIPOS: TipoUrgencia[] = [
  { id: "cerrajero", label: "Cerrajero", hint: "Me quedé afuera / chapa rota", categoria: "tech-fix", servicio: "Cerrajero", icon: KeyRound, bg: "#FF6B00" },
  { id: "agua", label: "Fuga de agua", hint: "Cañería, llave o WC", categoria: "tech-fix", servicio: "Gasfíter", icon: Droplets, bg: "#00B4D8" },
  { id: "luz", label: "Corte de luz", hint: "Automático, enchufes, cortocircuito", categoria: "tech-fix", servicio: "Electricista", icon: Lightbulb, bg: "#EF9F27" },
  { id: "gas", label: "Problema de gas", hint: "Olor a gas, calefont, cocina", categoria: "tech-fix", servicio: "Gasfíter", icon: Flame, bg: "#FF3B6B" },
  { id: "auto", label: "Auto en pana", hint: "No parte, batería, neumático", categoria: "auto", servicio: "Mecánico a domicilio", icon: Car, bg: "#2563EB" },
  { id: "enfermera", label: "Enfermera urgente", hint: "Curación, inyección, control", categoria: "salud-pro", servicio: "Enfermer", icon: Stethoscope, bg: "#047857" },
  { id: "vet", label: "Veterinario urgente", hint: "Mascota enferma o accidentada", categoria: "pets", servicio: "Vet a domicilio", icon: PawPrint, bg: "#A855F7" },
  { id: "limpieza", label: "Limpieza urgente", hint: "Antes de una visita o evento", categoria: "home", servicio: "Aseo del hogar", icon: Sparkles, bg: "#0D9488" },
];

interface Urgencia {
  id: string;
  cliente_id: string;
  categoria_id: string;
  descripcion: string;
  direccion: string;
  telefono: string | null;
  estado: "buscando" | "asignada" | "cancelada" | "expirada";
  prestador_id: string | null;
  reserva_id: string | null;
  eta_min: number | null;
  created_at: string;
  expira_at: string;
  prestadores: { nombre: string | null; foto_url: string | null; calificacion_promedio: number; resenas_count: number } | null;
}

const URG_SELECT = "id, cliente_id, categoria_id, descripcion, direccion, telefono, estado, prestador_id, reserva_id, eta_min, created_at, expira_at, prestadores ( nombre, foto_url, calificacion_promedio, resenas_count )";

const inputCls =
  "w-full px-4 py-3 rounded-2xl bg-white border border-border text-sm outline-none focus:border-[#FF3B6B] focus:ring-2 focus:ring-[#FF3B6B]/20";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function YaPage() {
  const { usuario } = useAuth();
  const { id } = Route.useSearch();
  const navigate = useNavigate();

  // Si ya tiene una urgencia activa, abrirla directamente
  const activaQ = useQuery({
    queryKey: ["urgencia-activa", usuario?.id],
    enabled: !!usuario?.id && !id,
    queryFn: async () => {
      const { data } = await supabase
        .from("urgencias")
        .select("id, estado, expira_at")
        .eq("cliente_id", usuario!.id)
        .in("estado", ["buscando", "asignada"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (!id && activaQ.data?.id) navigate({ to: "/ya", search: { id: activaQ.data.id }, replace: true });
  }, [id, activaQ.data?.id, navigate]);

  if (usuario && usuario.tipo === "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Homie Ya para profesionales</h1>
          <p className="mt-2 text-sm text-muted-foreground">Las urgencias de tu rubro aparecen en tu bandeja.</p>
          <Link to="/ya-prestador" className="btn-primary inline-flex mt-4 px-5 py-3 rounded-2xl text-sm font-semibold">Ver urgencias</Link>
        </div>
      </AppShell>
    );
  }

  if (id) return <Tracking id={id} />;

  if (activaQ.isLoading) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center"><Loader2 className="size-5 mx-auto animate-spin" /></div>
      </AppShell>
    );
  }

  return <Pedir />;
}

/* ------------------------------------------------------------------ */
/* Paso 1 + 2: elegir tipo y pedir                                      */
/* ------------------------------------------------------------------ */

function Pedir() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<TipoUrgencia | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pos, setPos] = useState<GeoPoint | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  function pedirUbicacion() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGeoState("err"); return; }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoState("ok"); },
      () => setGeoState("err"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  const valid = !!tipo && descripcion.trim().length >= 5 && direccion.trim().length >= 5 && telefono.trim().length >= 8;

  const crear = useMutation({
    mutationFn: async () => {
      if (!tipo || !usuario) throw new Error("Faltan datos");
      let lat = pos?.lat ?? null;
      let lng = pos?.lng ?? null;
      if (lat == null || lng == null) {
        const g = await geocodificar(direccion);
        if (g) { lat = g.lat; lng = g.lng; }
      }
      // servicio_id opcional: buscamos por nombre dentro de la categoría
      let servicio_id: string | null = null;
      const { data: srv } = await supabase
        .from("servicios")
        .select("id")
        .eq("categoria_id", tipo.categoria)
        .ilike("nombre", `%${tipo.servicio}%`)
        .limit(1)
        .maybeSingle();
      if (srv?.id) servicio_id = srv.id;

      const { data, error } = await supabase
        .from("urgencias")
        .insert({
          cliente_id: usuario.id,
          categoria_id: tipo.categoria,
          servicio_id,
          descripcion: `${tipo.label}: ${descripcion.trim()}`.slice(0, 500),
          direccion: direccion.trim(),
          lat, lng,
          telefono: telefono.trim(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (newId) => {
      qc.invalidateQueries({ queryKey: ["urgencia-activa"] });
      toast.success("Buscando un profesional disponible...");
      navigate({ to: "/ya", search: { id: newId } });
    },
    onError: (e: Error) => toast.error(mensajeError(e, "No pudimos crear la urgencia.")),
  });

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-6 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF3B6B] text-xs font-bold">
          <Zap className="size-3.5 fill-white" /> Homie Ya
        </div>
        <h1 className="mt-3 title-2">¿Qué necesitas ahora?</h1>
        <p className="mt-1 text-sm text-white/70">
          Avisamos a los profesionales disponibles de tu zona. El primero que acepta va en camino.
        </p>
      </header>

      {!tipo ? (
        <div className="px-5 mt-5 grid grid-cols-2 gap-3 pb-8">
          {TIPOS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTipo(t)}
                className="text-left p-4 rounded-2xl bg-white border-2 border-border hover:border-[#FF3B6B] transition active:scale-[0.98]"
              >
                <span className="flex size-12 items-center justify-center rounded-xl" style={{ background: t.bg }}>
                  <Icon className="size-6 text-white" />
                </span>
                <div className="mt-3 font-bold text-[#111827] leading-tight">{t.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground leading-snug">{t.hint}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-5 mt-5 space-y-4 pb-10">
          <button onClick={() => setTipo(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> Cambiar tipo
          </button>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border">
            <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: tipo.bg }}>
              <tipo.icon className="size-5 text-white" />
            </span>
            <div>
              <div className="font-bold text-sm">{tipo.label}</div>
              <div className="text-xs text-muted-foreground">{getCategory(tipo.categoria)?.name}</div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">¿Qué pasa? <span className="text-muted-foreground font-normal">(corto)</span></span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder={tipo.hint}
              className={`${inputCls} mt-1.5 resize-none`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Dirección</span>
            <div className="relative mt-1.5">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, número, comuna"
                className={`${inputCls} pl-10`}
              />
            </div>
          </label>

          <button
            type="button"
            onClick={pedirUbicacion}
            disabled={geoState === "loading"}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition ${
              geoState === "ok" ? "bg-[#00C288]/10 border-[#00C288] text-[#00754F]" : "bg-white border-border text-[#111827]"
            }`}
          >
            {geoState === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
            {geoState === "ok" ? "Ubicación actual lista" : geoState === "err" ? "No pudimos obtener tu ubicación (usaremos la dirección)" : "Usar mi ubicación actual"}
          </button>

          <label className="block">
            <span className="text-sm font-semibold">Teléfono de contacto</span>
            <div className="relative mt-1.5">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                inputMode="tel"
                placeholder="+56 9 1234 5678"
                className={`${inputCls} pl-10`}
              />
            </div>
          </label>

          <div className="p-3 rounded-xl bg-[#F5F5F0] text-xs text-[#374151]">
            El profesional que acepte te mostrará su precio y hora estimada. Solo sale a tu domicilio cuando pagas y confirmas la reserva.
          </div>

          <button
            onClick={() => crear.mutate()}
            disabled={!valid || crear.isPending}
            className="w-full h-14 rounded-2xl bg-[#FF3B6B] text-white text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#FF3B6B]/30"
          >
            {crear.isPending ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5 fill-white" />}
            Pedir ahora
          </button>
        </div>
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Paso 3: seguimiento                                                   */
/* ------------------------------------------------------------------ */

function Tracking({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const now = useNow();
  const expiradaRef = useRef(false);

  const q = useQuery({
    queryKey: ["urgencia", id],
    refetchInterval: (query) => {
      const e = query.state.data?.estado;
      return e === "buscando" || e === undefined ? 5000 : false;
    },
    queryFn: async (): Promise<Urgencia | null> => {
      const { data, error } = await supabase.from("urgencias").select(URG_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as unknown as Urgencia) ?? null;
    },
  });
  const u = q.data;

  const cambiarEstado = useMutation({
    mutationFn: async (estado: "cancelada" | "expirada") => {
      const { error } = await supabase.from("urgencias").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["urgencia", id] });
      qc.invalidateQueries({ queryKey: ["urgencia-activa"] });
    },
  });

  const expiraMs = u ? new Date(u.expira_at).getTime() : 0;
  const restante = Math.max(0, expiraMs - now);
  const vencida = !!u && u.estado === "buscando" && restante <= 0;

  // Marcar expirada desde el cliente cuando pasa expira_at y sigue buscando
  useEffect(() => {
    if (vencida && !expiradaRef.current) {
      expiradaRef.current = true;
      cambiarEstado.mutate("expirada");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vencida]);

  const tipoCat = u ? getCategory(u.categoria_id) : undefined;
  const esGas = useMemo(() => !!u && /gas/i.test(u.descripcion), [u]);

  if (q.isLoading) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center"><Loader2 className="size-5 mx-auto animate-spin" /></div>
      </AppShell>
    );
  }
  if (!u) {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Urgencia no encontrada</h1>
          <Link to="/ya" className="btn-primary inline-flex mt-4 px-5 py-3 rounded-2xl text-sm font-semibold">Pedir otra</Link>
        </div>
      </AppShell>
    );
  }

  const mm = Math.floor(restante / 60000);
  const ss = Math.floor((restante % 60000) / 1000);

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-6 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF3B6B] text-xs font-bold">
          <Zap className="size-3.5 fill-white" /> Homie Ya
        </div>
        <h1 className="mt-3 title-2">
          {u.estado === "buscando" && !vencida && "Buscando un profesional..."}
          {u.estado === "asignada" && "¡Un profesional aceptó!"}
          {(u.estado === "expirada" || vencida) && "Nadie disponible ahora mismo"}
          {u.estado === "cancelada" && "Urgencia cancelada"}
        </h1>
        <p className="mt-1 text-sm text-white/70">{u.descripcion}</p>
        <p className="mt-1 text-xs text-white/50 inline-flex items-center gap-1"><MapPin className="size-3" /> {u.direccion}</p>
      </header>

      <div className="px-5 mt-6 space-y-5 pb-10">
        {u.estado === "buscando" && !vencida && (
          <>
            <Radar />
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <Clock className="size-3.5" /> Tiempo restante
              </div>
              <div className="text-4xl font-bold tabular-nums text-[#111827] mt-1">
                {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Avisamos a los {tipoCat?.name.toLowerCase() ?? "profesionales"} disponibles cerca de ti. Te notificamos apenas uno acepte.
              </p>
            </div>
            <button
              onClick={() => { if (confirm("¿Cancelar la urgencia?")) cambiarEstado.mutate("cancelada"); }}
              disabled={cambiarEstado.isPending}
              className="w-full h-12 rounded-2xl bg-white border border-border text-sm font-semibold inline-flex items-center justify-center gap-2 text-[#FF3B6B]"
            >
              <XCircle className="size-4" /> Cancelar
            </button>
          </>
        )}

        {u.estado === "asignada" && (
          <>
            <div className="p-5 rounded-2xl bg-white border-2 border-[#00C288]">
              <div className="flex items-center gap-3">
                <ProviderAvatar url={u.prestadores?.foto_url} name={u.prestadores?.nombre ?? "Profesional"} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#111827] truncate">{u.prestadores?.nombre ?? "Profesional"}</div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-[#EF9F27] text-[#EF9F27]" />
                    {Number(u.prestadores?.calificacion_promedio ?? 0).toFixed(1)} · {u.prestadores?.resenas_count ?? 0} reseñas
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase text-muted-foreground">Llega en</div>
                  <div className="text-2xl font-bold text-[#00754F]">~{u.eta_min ?? 30}<span className="text-sm"> min</span></div>
                </div>
              </div>
              {u.prestador_id && (
                <Link to="/prestador/$id" params={{ id: u.prestador_id }} className="mt-3 inline-block text-xs underline text-muted-foreground">
                  Ver perfil
                </Link>
              )}
            </div>

            <button
              onClick={() => navigate({ to: "/reservas" })}
              className="w-full h-14 rounded-2xl bg-[#EF9F27] text-[#111827] text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#EF9F27]/30"
            >
              <CreditCard className="size-5" /> Pagar para confirmar
            </button>
            <p className="text-xs text-center text-muted-foreground px-4">
              El profesional solo sale a tu domicilio después del pago. Encontrarás la reserva con el botón <b>Pagar</b> en tus reservas.
            </p>
          </>
        )}

        {(u.estado === "expirada" || vencida || u.estado === "cancelada") && (
          <div className="space-y-3">
            {u.estado !== "cancelada" && (
              <p className="text-sm text-muted-foreground">
                Ningún profesional disponible aceptó en 30 minutos. Prueba estas alternativas:
              </p>
            )}
            <Link
              to="/buscar"
              search={{ q: "", cat: u.categoria_id, min: 0, max: 0, rating: 0, now: true, sort: "relevance" }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border hover:border-[#111827]"
            >
              <Search className="size-5 text-[#EF9F27]" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Ver {tipoCat?.name.toLowerCase() ?? "profesionales"} disponibles ahora</div>
                <div className="text-xs text-muted-foreground">Contacta y reserva directamente</div>
              </div>
            </Link>
            <Link to="/solicitar" className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border hover:border-[#111827]">
              <FileText className="size-5 text-[#EF9F27]" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Pedir cotizaciones</div>
                <div className="text-xs text-muted-foreground">Varios profesionales te responden</div>
              </div>
            </Link>
            {esGas && (
              <Link to="/gas" className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border hover:border-[#111827]">
                <Flame className="size-5 text-[#FF6B00]" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">Distribuidoras de gas cerca de ti</div>
                  <div className="text-xs text-muted-foreground">Abiertas ahora, llama directo</div>
                </div>
              </Link>
            )}
            <Link to="/ya" className="btn-primary flex items-center justify-center h-12 rounded-2xl text-sm font-semibold">
              Pedir de nuevo
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Radar() {
  return (
    <div className="relative mx-auto size-44">
      <span className="absolute inset-0 rounded-full bg-[#FF3B6B]/20 animate-ping [animation-duration:2s]" />
      <span className="absolute inset-6 rounded-full bg-[#FF3B6B]/25 animate-ping [animation-duration:2s] [animation-delay:0.5s]" />
      <span className="absolute inset-12 rounded-full bg-[#FF3B6B]/30 animate-ping [animation-duration:2s] [animation-delay:1s]" />
      <span className="absolute inset-0 rounded-full border-2 border-[#FF3B6B]/30" />
      <span className="absolute inset-[30%] rounded-full bg-[#FF3B6B] flex items-center justify-center shadow-lg shadow-[#FF3B6B]/40">
        <Zap className="size-8 text-white fill-white" />
      </span>
    </div>
  );
}
