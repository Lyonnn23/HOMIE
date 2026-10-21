import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, Loader2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCLP } from "@/data/services";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/reservas")({
  head: () => ({ meta: [
    { name: "description", content: "Consulta y gestión administrativa de reservas de servicios en Homie." },
    { property: "og:title", content: "Reservas — Admin Homie" },
    { property: "og:description", content: "Consulta y gestión administrativa de reservas de servicios en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Reservas — Admin Homie" }] }),
  component: AdminReservas,
});

type Estado = Database["public"]["Enums"]["reserva_estado"];

interface ReservaRow {
  id: string;
  fecha: string;
  hora: string;
  total: number;
  estado: Estado;
  cliente_nombre: string | null;
  prestador_nombre: string | null;
  prestador_id: string;
  direccion: string;
  created_at: string;
  servicios: { nombre: string } | null;
  pagos: { estado: string }[] | null;
}

const ESTADOS: { value: Estado | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "en_camino", label: "En camino" },
  { value: "completada", label: "Completadas" },
  { value: "cancelada", label: "Canceladas" },
];

const ESTADO_STYLE: Record<Estado, string> = {
  pendiente: "bg-[#FAC77540] text-[#854F0B]",
  confirmada: "bg-[#0E749020] text-[#0E7490]",
  en_camino: "bg-[#0E749020] text-[#0E7490]",
  completada: "bg-[#00C28820] text-[#00754F]",
  cancelada: "bg-[#FF3B6B1A] text-[#FF3B6B]",
};

const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_camino: "En camino",
  completada: "Completada",
  cancelada: "Cancelada",
};

function pagoLabel(p: { estado: string }[] | null): { text: string; cls: string } {
  const e = p?.[0]?.estado;
  if (!e) return { text: "Sin pago", cls: "text-muted-foreground" };
  if (e === "pagado") return { text: "Pagado", cls: "text-[#00754F]" };
  if (e === "reembolsado") return { text: "Reembolsado", cls: "text-[#0E7490]" };
  if (e === "pendiente") return { text: "Pago pendiente", cls: "text-[#854F0B]" };
  return { text: e, cls: "text-muted-foreground" };
}

function AdminReservas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [estado, setEstado] = useState<Estado | "todas">("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const isAdminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .in("role", ["admin", "superadmin"]);
      return (data ?? []).length > 0;
    },
  });

  const reservasQ = useQuery({
    queryKey: ["admin-reservas", estado, desde, hasta],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<ReservaRow[]> => {
      let q = supabase
        .from("reservas")
        .select("id, fecha, hora, total, estado, cliente_nombre, prestador_nombre, prestador_id, direccion, created_at, servicios ( nombre ), pagos ( estado )")
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
        .limit(300);
      if (estado !== "todas") q = q.eq("estado", estado);
      if (desde) q = q.gte("fecha", desde);
      if (hasta) q = q.lte("fecha", hasta);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ReservaRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-reservas"] });
    qc.invalidateQueries({ queryKey: ["admin-resumen"] });
    qc.invalidateQueries({ queryKey: ["admin-saldos"] });
  };

  const cancelar = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error } = await supabase
        .from("reservas")
        .update({ estado: "cancelada", cancelada_por: "admin", motivo_cancelacion: motivo })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No se pudo actualizar la reserva (sin permiso de actualización).");
    },
    onSuccess: () => { toast.success("Reserva cancelada"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo cancelar"),
  });

  const completar = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("reservas")
        .update({ estado: "completada", completada_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No se pudo actualizar la reserva (sin permiso de actualización).");
    },
    onSuccess: () => { toast.success("Reserva marcada como completada"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo completar"),
  });

  const totales = useMemo(() => {
    const rows = reservasQ.data ?? [];
    return { n: rows.length, monto: rows.filter((r) => r.estado !== "cancelada").reduce((a, r) => a + r.total, 0) };
  }, [reservasQ.data]);

  if (isAdminQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  }
  if (!isAdminQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta sección es solo para administradores.</p>
          <Link to="/" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-[#111827] text-white text-sm font-semibold">Ir al inicio</Link>
        </div>
      </div>
    );
  }

  function onCancelar(r: ReservaRow) {
    const motivo = window.prompt(`Motivo de cancelación para la reserva de ${r.cliente_nombre ?? "cliente"} con ${r.prestador_nombre ?? "profesional"}:`);
    if (motivo === null) return;
    if (!motivo.trim()) { toast.error("Debes indicar un motivo."); return; }
    cancelar.mutate({ id: r.id, motivo: motivo.trim() });
  }

  function onCompletar(r: ReservaRow) {
    if (!window.confirm(`¿Marcar como completada la reserva de ${r.cliente_nombre ?? "cliente"} con ${r.prestador_nombre ?? "profesional"}?`)) return;
    completar.mutate(r.id);
  }

  const inputCls = "h-10 px-3 rounded-xl bg-white border border-[#E5E7EB] text-sm outline-none focus:border-[#111827]/30";

  return (
    <AppShell wide>
      <div className="container-landing py-6 space-y-6">
        <header>
          <Link to="/admin" className="text-xs text-muted-foreground hover:underline">← Panel de administración</Link>
          <h1 className="title-2 flex items-center gap-2 mt-1"><CalendarDays className="size-6 text-[#EF9F27]" /> Reservas</h1>
          <p className="lead mt-1">{totales.n} reservas · {formatCLP(totales.monto)} en servicios (excluye canceladas)</p>
        </header>

        <div className="card p-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs font-medium mb-1">Estado</span>
            <select value={estado} onChange={(e) => setEstado(e.target.value as Estado | "todas")} className={inputCls}>
              {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1">Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1">Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
          </label>
          {(desde || hasta || estado !== "todas") && (
            <button type="button" onClick={() => { setDesde(""); setHasta(""); setEstado("todas"); }} className="btn-ghost btn-sm">Limpiar</button>
          )}
        </div>

        {reservasQ.isLoading && <div className="text-center py-12"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
        {reservasQ.error && <div className="card p-4 text-sm text-[#FF3B6B]">{(reservasQ.error as Error).message}</div>}

        {reservasQ.data && reservasQ.data.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted-foreground">No hay reservas con estos filtros.</div>
        )}

        {reservasQ.data && reservasQ.data.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-[#F3F4F6] text-xs text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Fecha / hora</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Servicio</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Profesional</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Estado</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Pago</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {reservasQ.data.map((r) => {
                    const pago = pagoLabel(r.pagos);
                    const activa = r.estado !== "cancelada" && r.estado !== "completada";
                    return (
                      <tr key={r.id} className="hover:bg-[#FAFAFA]">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {new Date(r.fecha + "T00:00:00").toLocaleDateString("es-CL")}
                          <span className="text-muted-foreground"> {r.hora.slice(0, 5)}</span>
                        </td>
                        <td className="px-4 py-2.5">{r.servicios?.nombre ?? "—"}</td>
                        <td className="px-4 py-2.5">{r.cliente_nombre ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <Link to="/prestador/$id" params={{ id: r.prestador_id }} className="hover:underline">{r.prestador_nombre ?? "—"}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">{formatCLP(r.total)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${ESTADO_STYLE[r.estado]}`}>{ESTADO_LABEL[r.estado]}</span>
                        </td>
                        <td className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap ${pago.cls}`}>{pago.text}</td>
                        <td className="px-4 py-2.5">
                          {activa ? (
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => onCompletar(r)} disabled={completar.isPending}
                                title="Marcar completada"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00C288] text-white text-xs font-semibold disabled:opacity-50">
                                <Check className="size-3.5" /> Completar
                              </button>
                              <button type="button" onClick={() => onCancelar(r)} disabled={cancelar.isPending}
                                title="Cancelar reserva"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#FF3B6B] text-[#FF3B6B] text-xs font-semibold disabled:opacity-50">
                                <X className="size-3.5" /> Cancelar
                              </button>
                            </div>
                          ) : (
                            <span className="block text-right text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
