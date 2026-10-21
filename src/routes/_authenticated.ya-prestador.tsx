import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap, MapPin, Clock, Navigation, Loader2, AlertTriangle, CheckCircle2, ChevronRight, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { distanciaKm } from "@/lib/geocode";
import { getCategory } from "@/data/services";

export const Route = createFileRoute("/_authenticated/ya-prestador")({
  head: () => ({ meta: [
    { name: "description", content: "Urgencias disponibles para profesionales de tu rubro en Homie Ya." },
    { property: "og:title", content: "Homie Ya — urgencias en tu rubro — Homie" },
    { property: "og:description", content: "Urgencias disponibles para profesionales de tu rubro en Homie Ya." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Homie Ya — urgencias en tu rubro — Homie" }] }),
  component: YaPrestadorPage,
});

interface UrgenciaRow {
  id: string;
  categoria_id: string;
  descripcion: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
  telefono: string | null;
  estado: string;
  prestador_id: string | null;
  reserva_id: string | null;
  eta_min: number | null;
  created_at: string;
  expira_at: string;
}

const ETAS = [15, 30, 45, 60] as const;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function YaPrestadorPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const now = useNow();

  const prestadorQ = useQuery({
    queryKey: ["prestador-ya", usuario?.id],
    enabled: !!usuario?.id && usuario.tipo === "prestador",
    queryFn: async () => {
      const { data } = await supabase
        .from("prestadores")
        .select("id, categoria_id, disponible_ahora, verificado, lat, lng")
        .eq("usuario_id", usuario!.id)
        .maybeSingle();
      return data ?? null;
    },
  });
  const p = prestadorQ.data;

  const abiertasQ = useQuery({
    queryKey: ["urgencias-abiertas", p?.id],
    enabled: !!p?.id,
    refetchInterval: 5000,
    queryFn: async (): Promise<UrgenciaRow[]> => {
      const { data, error } = await supabase
        .from("urgencias")
        .select("id, categoria_id, descripcion, direccion, lat, lng, telefono, estado, prestador_id, reserva_id, eta_min, created_at, expira_at")
        .eq("estado", "buscando")
        .eq("categoria_id", p!.categoria_id)
        .gt("expira_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UrgenciaRow[];
    },
  });

  const asignadasQ = useQuery({
    queryKey: ["urgencias-asignadas", p?.id],
    enabled: !!p?.id,
    refetchInterval: 15000,
    queryFn: async (): Promise<UrgenciaRow[]> => {
      const { data, error } = await supabase
        .from("urgencias")
        .select("id, categoria_id, descripcion, direccion, lat, lng, telefono, estado, prestador_id, reserva_id, eta_min, created_at, expira_at")
        .eq("prestador_id", p!.id)
        .eq("estado", "asignada")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as UrgenciaRow[];
    },
  });

  const aceptar = useMutation({
    mutationFn: async ({ urgenciaId, eta }: { urgenciaId: string; eta: number }) => {
      const { data, error } = await supabase.rpc("aceptar_urgencia", { _urgencia_id: urgenciaId, _eta_min: eta });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("¡Urgencia aceptada! El cliente debe pagar para confirmar. Revisa tu panel.");
      qc.invalidateQueries({ queryKey: ["urgencias-abiertas"] });
      qc.invalidateQueries({ queryKey: ["urgencias-asignadas"] });
      qc.invalidateQueries({ queryKey: ["provider-bookings"] });
      navigate({ to: "/panel" });
    },
    onError: (e: Error) => {
      toast.error(e.message || "No se pudo aceptar la urgencia");
      qc.invalidateQueries({ queryKey: ["urgencias-abiertas"] });
    },
  });

  if (usuario && usuario.tipo !== "prestador") {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Solo profesionales</h1>
          <p className="mt-2 text-sm text-muted-foreground">¿Tienes una urgencia? Pídela desde Homie Ya.</p>
          <Link to="/ya" className="btn-primary inline-flex mt-4 px-5 py-3 rounded-2xl text-sm font-semibold">Ir a Homie Ya</Link>
        </div>
      </AppShell>
    );
  }

  const cat = p ? getCategory(p.categoria_id) : undefined;
  const origen = p?.lat != null && p?.lng != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null;
  const abiertas = abiertasQ.data ?? [];
  const asignadas = asignadasQ.data ?? [];

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-6 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF3B6B] text-xs font-bold">
          <Zap className="size-3.5 fill-white" /> Homie Ya
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Urgencias en tu rubro</h1>
        <p className="mt-1 text-sm text-white/70">
          {cat ? `${cat.name} · ` : ""}El primero en aceptar se la queda. Se actualiza cada 5 segundos.
        </p>
      </header>

      <div className="px-5 mt-5 space-y-5 pb-10">
        {prestadorQ.isLoading && <div className="py-10 text-center"><Loader2 className="size-5 mx-auto animate-spin" /></div>}

        {p && !p.verificado && (
          <div className="p-4 rounded-2xl bg-[#FAC77540] text-[#854F0B] text-sm flex gap-3">
            <AlertTriangle className="size-5 shrink-0" />
            <div>Solo profesionales verificados pueden aceptar urgencias. <Link to="/verificar-identidad" className="underline font-semibold">Verificar mi perfil</Link></div>
          </div>
        )}

        {p && p.verificado && !p.disponible_ahora && (
          <div className="p-4 rounded-2xl bg-[#FF3B6B]/10 border border-[#FF3B6B] text-sm flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-[#FF3B6B]" />
            <div className="text-[#111827]">
              <b>Activa “Disponible ahora” en tu panel</b> para recibir urgencias. Mientras estés en rojo no verás las solicitudes de tu rubro.
              <Link to="/panel" className="block mt-1 underline font-semibold text-[#FF3B6B]">Ir al panel</Link>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
            Abiertas ahora
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#FF3B6B] text-white text-[10px] font-bold">{abiertas.length}</span>
            {abiertasQ.isFetching && <Loader2 className="size-3 animate-spin" />}
          </h2>

          {p && abiertas.length === 0 && !abiertasQ.isLoading && (
            <div className="p-6 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
              No hay urgencias abiertas en tu rubro en este momento. Te avisaremos con una notificación.
            </div>
          )}

          <div className="space-y-3">
            {abiertas.map((u) => {
              const restante = Math.max(0, new Date(u.expira_at).getTime() - now);
              const mm = Math.floor(restante / 60000);
              const ss = Math.floor((restante % 60000) / 1000);
              const dist = origen && u.lat != null && u.lng != null ? distanciaKm(origen, { lat: Number(u.lat), lng: Number(u.lng) }) : null;
              const pending = aceptar.isPending && aceptar.variables?.urgenciaId === u.id;
              return (
                <div key={u.id} className="p-4 rounded-2xl bg-white border-2 border-[#FF3B6B]/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#111827] leading-snug">{u.descripcion}</div>
                      <div className="mt-1.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                        <MapPin className="size-3.5 shrink-0" /> {u.direccion}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase text-muted-foreground inline-flex items-center gap-1"><Clock className="size-3" /> Vence</div>
                      <div className={`font-bold tabular-nums ${restante < 5 * 60000 ? "text-[#FF3B6B]" : "text-[#111827]"}`}>
                        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {dist != null && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5F5F0] text-[#374151]">
                        <Navigation className="size-3" /> {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5F5F0] text-[#374151]">
                      Hace {Math.max(1, Math.round((now - new Date(u.created_at).getTime()) / 60000))} min
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-[#111827] mb-1.5">Aceptar · llego en</div>
                    <div className="grid grid-cols-4 gap-2">
                      {ETAS.map((eta) => (
                        <button
                          key={eta}
                          disabled={aceptar.isPending || !p?.verificado}
                          onClick={() => aceptar.mutate({ urgenciaId: u.id, eta })}
                          className="h-11 rounded-xl bg-[#111827] text-white text-sm font-bold hover:bg-[#FF3B6B] transition disabled:opacity-50 flex items-center justify-center"
                        >
                          {pending && aceptar.variables?.eta === eta ? <Loader2 className="size-4 animate-spin" /> : `${eta} min`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {asignadas.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tus urgencias aceptadas</h2>
            <div className="space-y-2">
              {asignadas.map((u) => (
                <Link
                  key={u.id}
                  to="/panel"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#00C288]/50 hover:border-[#00C288]"
                >
                  <CheckCircle2 className="size-5 text-[#00C288] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{u.descripcion}</div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1 truncate">
                      <MapPin className="size-3" /> {u.direccion} · ETA {u.eta_min ?? 30} min
                    </div>
                    {u.telefono && (
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <Phone className="size-3" /> {u.telefono}
                      </div>
                    )}
                    <div className="text-[11px] text-[#854F0B] mt-0.5">Esperando el pago del cliente. Ver reserva en el panel.</div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
