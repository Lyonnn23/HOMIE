import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HomieWordmark, HomieIcon } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { formatCLP, MODALIDAD_LABEL } from "@/data/services";

export const Route = createFileRoute("/_authenticated/comprobante/$reservaId")({
  head: () => ({ meta: [
    { name: "description", content: "Detalle y comprobante de un servicio reservado a través de Homie." },
    { property: "og:title", content: "Comprobante de servicio — Homie" },
    { property: "og:description", content: "Detalle y comprobante de un servicio reservado a través de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Comprobante de servicio — Homie" }] }),
  component: ComprobantePage,
});

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_camino: "En camino",
  completada: "Completada",
  cancelada: "Cancelada",
};

const PAGO_LABEL: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pago pendiente",
  reembolsado: "Reembolsado",
  rechazado: "Rechazado",
};

function fechaLarga(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function useComprobante(reservaId: string) {
  return useQuery({
    queryKey: ["comprobante", reservaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select(`
          id, fecha, hora, direccion, estado, nota, total, comision, created_at, completada_at, modalidad,
          prestador_nombre, cliente_nombre, prestador_id,
          servicios ( nombre ),
          pagos ( estado, monto_total, monto_prestador, comision, mp_payment_id, updated_at )
        `)
        .eq("id", reservaId)
        .maybeSingle();
      if (error) throw error;
      type Row = {
        id: string; fecha: string; hora: string; direccion: string; estado: string; nota: string | null;
        total: number; comision: number; created_at: string; completada_at: string | null; modalidad: string | null;
        prestador_nombre: string | null; cliente_nombre: string | null; prestador_id: string;
        servicios: { nombre: string } | null;
        pagos: { estado: string; monto_total: number; monto_prestador: number; comision: number; mp_payment_id: string | null; updated_at: string }[] | null;
      };
      return (data as unknown as Row | null) ?? null;
    },
  });
}

function ComprobantePage() {
  const { reservaId } = Route.useParams();
  const router = useRouter();
  const q = useComprobante(reservaId);

  if (q.isLoading) {
    return <AppShell><div className="py-16 text-center"><Loader2 className="size-5 mx-auto animate-spin text-muted-foreground" /></div></AppShell>;
  }
  const r = q.data;
  if (!r) {
    return (
      <AppShell>
        <div className="px-5 pt-16 text-center">
          <h1 className="text-xl font-bold">Reserva no encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">No tienes acceso a esta reserva o no existe.</p>
          <Link to="/reservas" className="inline-block mt-6 btn-secondary">Mis reservas</Link>
        </div>
      </AppShell>
    );
  }

  const pago = r.pagos?.find((p) => p.estado === "pagado") ?? r.pagos?.[0] ?? null;
  const tarifa = r.comision ?? (pago?.comision ?? 0);
  const precio = Math.max(0, (r.total ?? 0) - tarifa);
  const numero = r.id.slice(0, 8).toUpperCase();
  const emitido = r.completada_at ?? r.created_at;

  return (
    <AppShell>
      <style>{`
        @media print {
          header, nav, footer, .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-sheet { border: none !important; box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      <header className="no-print px-5 pt-6 pb-2 flex items-center justify-between gap-3">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted" aria-label="Volver">
          <ArrowLeft className="size-5" />
        </button>
        <button
          type="button" onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111827] text-white text-sm font-semibold"
        >
          <Printer className="size-4" /> Imprimir / Guardar PDF
        </button>
      </header>

      <div className="px-5 pb-10">
        <article className="print-sheet card p-6 sm:p-8 max-w-2xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <HomieIcon size={36} />
              <HomieWordmark className="text-2xl" />
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Comprobante de servicio</div>
              <div className="font-bold text-lg">Nº {numero}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <Dato label="Fecha de emisión" value={new Date(emitido).toLocaleDateString("es-CL")} />
            <Dato label="Estado" value={ESTADO_LABEL[r.estado] ?? r.estado} />
            <Dato label="Servicio" value={r.servicios?.nombre ?? "Servicio"} />
            <Dato label="Modalidad" value={MODALIDAD_LABEL[r.modalidad ?? "domicilio"] ?? "A domicilio"} />
            <Dato label="Profesional" value={r.prestador_nombre ?? "—"} />
            <Dato label="Cliente" value={r.cliente_nombre ?? "—"} />
            <Dato label="Fecha del servicio" value={`${fechaLarga(r.fecha)} · ${String(r.hora).slice(0, 5)}`} />
            <Dato label="Dirección" value={r.direccion || "—"} />
          </div>

          {r.nota && (
            <div className="mt-4 text-sm">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Nota</div>
              <p className="mt-0.5 text-[#374151]">{r.nota}</p>
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-[#F5F5F0] border border-border p-4 text-sm space-y-2">
            <Fila label="Precio del servicio" value={formatCLP(precio)} />
            <Fila label="Tarifa de servicio Homie" value={formatCLP(tarifa)} />
            <div className="h-px bg-border my-1" />
            <Fila label="Total pagado por el cliente" value={formatCLP(r.total)} bold />
            <Fila label="Estado de pago" value={pago ? (PAGO_LABEL[pago.estado] ?? pago.estado) : "Sin registro de pago"} />
            {pago?.mp_payment_id && <Fila label="Ref. Mercado Pago" value={pago.mp_payment_id} mono />}
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
            Documento informativo emitido por Homie como registro del servicio contratado a través de la plataforma.
            No reemplaza boleta o factura. El profesional es responsable de emitir el documento tributario que corresponda.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Reserva {r.id} · Generado el {new Date().toLocaleDateString("es-CL")}
          </p>
        </article>
      </div>
    </AppShell>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 font-medium text-[#111827]">{value}</div>
    </div>
  );
}

function Fila({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? "font-bold" : "text-muted-foreground"}>{label}</span>
      <span className={`${bold ? "font-bold text-base" : ""} ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
