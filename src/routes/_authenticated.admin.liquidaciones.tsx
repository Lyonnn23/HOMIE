import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, ChevronDown, ChevronUp, Loader2, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/admin/liquidaciones")({
  head: () => ({ meta: [
    { title: "Liquidaciones — Admin Homie" },
    { name: "description", content: "Gestiona los pagos y saldos pendientes de profesionales en Homie." },
    { property: "og:title", content: "Liquidaciones — Admin Homie" },
    { property: "og:description", content: "Gestión administrativa de pagos y saldos de profesionales Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminLiquidaciones,
});

interface Saldo {
  prestador_id: string;
  nombre: string | null;
  usuario_id: string;
  reservas_pendientes: number;
  monto_pendiente: number;
  comision_homie: number;
  reserva_ids: string[] | null;
}

interface LiquidacionRow {
  id: string;
  prestador_id: string;
  monto: number;
  reservas: string[];
  medio: string | null;
  referencia: string | null;
  nota: string | null;
  pagada_at: string;
  prestadores: { nombre: string | null } | null;
}

const MEDIOS = ["Transferencia", "Mercado Pago", "Efectivo"] as const;

function AdminLiquidaciones() {
  const { user } = useAuth();

  const isAdminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "superadmin"]);
      return (data ?? []).length > 0;
    },
  });

  const saldosQ = useQuery({
    queryKey: ["admin-saldos"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<Saldo[]> => {
      const { data, error } = await supabase
        .from("saldos_prestadores")
        .select("*")
        .order("monto_pendiente", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Saldo[];
    },
  });

  const historialQ = useQuery({
    queryKey: ["admin-liquidaciones"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<LiquidacionRow[]> => {
      const { data, error } = await supabase
        .from("liquidaciones")
        .select("id, prestador_id, monto, reservas, medio, referencia, nota, pagada_at, prestadores ( nombre )")
        .order("pagada_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as LiquidacionRow[];
    },
  });

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

  const saldos = saldosQ.data ?? [];
  const totalPendiente = saldos.reduce((a, s) => a + s.monto_pendiente, 0);

  return (
    <AppShell>
      <div className="px-5 py-6 max-w-4xl mx-auto space-y-8">
        <header>
          <Link to="/admin" className="text-xs text-muted-foreground hover:underline">← Panel de administración</Link>
          <h1 className="title-2 flex items-center gap-2 mt-1"><Wallet className="size-6 text-[#EF9F27]" /> Liquidaciones</h1>
          <p className="lead mt-2 measure">
            Homie recibe el pago del cliente en Mercado Pago (exactamente el precio del profesional, sin recargo). Cada semana Homie transfiere a cada profesional su precio menos la comisión vigente: 0% durante sus 3 meses gratis, luego 15% (12% con Premium).
          </p>
        </header>

        <section>
          <div className="flex items-end justify-between mb-3 gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Por liquidar ({saldos.length})</h2>
            <div className="text-sm"><span className="text-muted-foreground">Total: </span><strong>{formatCLP(totalPendiente)}</strong></div>
          </div>
          {saldosQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
          {saldosQ.error && <div className="card p-4 text-sm text-[#FF3B6B]">{(saldosQ.error as Error).message}</div>}
          {!saldosQ.isLoading && saldos.length === 0 && (
            <div className="card p-8 text-center text-sm text-muted-foreground">No hay montos pendientes de liquidar.</div>
          )}
          <div className="space-y-3">
            {saldos.map((s) => <SaldoCard key={s.prestador_id} s={s} />)}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Historial</h2>
          {historialQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
          {(historialQ.data?.length ?? 0) === 0 && !historialQ.isLoading ? (
            <div className="card p-8 text-center text-sm text-muted-foreground">Aún no se han registrado liquidaciones.</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F3F4F6] text-xs text-muted-foreground uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Fecha</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Profesional</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Monto</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Medio</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Referencia</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Servicios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {historialQ.data?.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-2.5 whitespace-nowrap">{new Date(l.pagada_at).toLocaleDateString("es-CL")}</td>
                        <td className="px-4 py-2.5">{l.prestadores?.nombre ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">{formatCLP(l.monto)}</td>
                        <td className="px-4 py-2.5">{l.medio ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{l.referencia ?? "—"}{l.nota ? <span className="block text-xs">{l.nota}</span> : null}</td>
                        <td className="px-4 py-2.5 text-right">{l.reservas.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

interface ReservaIncluida {
  id: string;
  fecha: string;
  hora: string;
  total: number;
  cliente_nombre: string | null;
  servicios: { nombre: string } | null;
}

interface DatosBancarios {
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  rut: string | null;
  titular: string | null;
}

function SaldoCard({ s }: { s: Saldo }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [medio, setMedio] = useState<(typeof MEDIOS)[number]>("Transferencia");
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");

  const bancoQ = useQuery({
    queryKey: ["admin-contacto-banco", s.prestador_id],
    enabled: open,
    queryFn: async (): Promise<DatosBancarios | null> => {
      const { data, error } = await supabase
        .from("prestador_contacto")
        .select("banco, tipo_cuenta, numero_cuenta, rut, titular")
        .eq("prestador_id", s.prestador_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const reservasQ = useQuery({
    queryKey: ["admin-saldo-reservas", s.prestador_id, s.reserva_ids?.length],
    enabled: open && (s.reserva_ids?.length ?? 0) > 0,
    queryFn: async (): Promise<ReservaIncluida[]> => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id, fecha, hora, total, cliente_nombre, servicios ( nombre )")
        .in("id", s.reserva_ids ?? [])
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReservaIncluida[];
    },
  });

  const registrar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("registrar_liquidacion", {
        _prestador_id: s.prestador_id,
        _medio: medio,
        _referencia: referencia.trim(),
        _nota: nota.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Liquidación de ${formatCLP(s.monto_pendiente)} registrada para ${s.nombre ?? "el profesional"}`);
      setFormOpen(false);
      setReferencia(""); setNota("");
      qc.invalidateQueries({ queryKey: ["admin-saldos"] });
      qc.invalidateQueries({ queryKey: ["admin-liquidaciones"] });
      qc.invalidateQueries({ queryKey: ["admin-resumen"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo registrar la liquidación"),
  });

  const banco = bancoQ.data;
  const tieneBanco = !!banco && !!(banco.banco || banco.numero_cuenta);

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#F9FAFB]">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[#111827] truncate">{s.nombre ?? "Sin nombre"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {s.reservas_pendientes} {s.reservas_pendientes === 1 ? "servicio completado" : "servicios completados"} · comisión Homie {formatCLP(s.comision_homie)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-[#0E7490]">{formatCLP(s.monto_pendiente)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">a transferir</div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-[#E5E7EB] p-4 space-y-4 bg-[#FAFAFA]">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Banknote className="size-3.5" /> Datos bancarios</h4>
            {bancoQ.isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : tieneBanco && banco ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm bg-white rounded-xl border border-[#E5E7EB] p-3">
                <Dato label="Banco" value={banco.banco} />
                <Dato label="Tipo de cuenta" value={banco.tipo_cuenta} />
                <Dato label="Nº de cuenta" value={banco.numero_cuenta} mono />
                <Dato label="RUT" value={banco.rut} mono />
                <Dato label="Titular" value={banco.titular} />
              </dl>
            ) : (
              <div className="text-sm text-[#FF3B6B] bg-white rounded-xl border border-[#E5E7EB] p-3">Sin datos bancarios. El profesional debe completarlos en su panel.</div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Servicios incluidos</h4>
            {reservasQ.isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ul className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#E5E7EB] text-sm">
                {(reservasQ.data ?? []).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.fecha + "T00:00:00").toLocaleDateString("es-CL")} {r.hora.slice(0, 5)}</span>
                    <span className="flex-1 min-w-0 truncate">{r.servicios?.nombre ?? "Servicio"} · <span className="text-muted-foreground">{r.cliente_nombre ?? "Cliente"}</span></span>
                    <span className="font-semibold whitespace-nowrap">{formatCLP(r.total)}</span>
                  </li>
                ))}
                {(reservasQ.data?.length ?? 0) === 0 && <li className="px-3 py-2 text-muted-foreground">Sin detalle disponible.</li>}
              </ul>
            )}
          </div>

          {!formOpen ? (
            <button type="button" onClick={() => setFormOpen(true)} className="btn-primary btn-sm w-full sm:w-auto">
              Registrar pago de {formatCLP(s.monto_pendiente)}
            </button>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); registrar.mutate(); }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-3 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium mb-1">Medio de pago</span>
                  <select value={medio} onChange={(e) => setMedio(e.target.value as (typeof MEDIOS)[number])}
                    className="w-full h-11 px-3 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-sm outline-none">
                    {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-medium mb-1">Referencia / nº comprobante</span>
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. 123456789"
                    className="w-full h-11 px-3 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-sm outline-none focus:border-[#111827]/30" />
                </label>
              </div>
              <label className="block">
                <span className="block text-xs font-medium mb-1">Nota (opcional)</span>
                <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Semana 42"
                  className="w-full h-11 px-3 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-sm outline-none focus:border-[#111827]/30" />
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary btn-sm" disabled={registrar.isPending}>Cancelar</button>
                <button type="submit" className="btn-primary btn-sm" disabled={registrar.isPending}>
                  {registrar.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Confirmar pago de {formatCLP(s.monto_pendiente)}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Dato({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`text-[#111827] ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
