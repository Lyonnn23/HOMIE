import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Ban, Check, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/reportes")({
  head: () => ({ meta: [{ title: "Reportes — Admin Homie" }] }),
  component: AdminReportes,
});

interface ReporteRow {
  id: string;
  reserva_id: string;
  reportante_id: string;
  reportado_id: string;
  motivo: string;
  descripcion: string | null;
  estado: string;
  created_at: string;
  reportante: { nombre: string } | null;
  reportado: { nombre: string; email: string | null } | null;
}

interface PrestadorReportado {
  prestador_id: string;
  usuario_id: string;
  nombre: string;
  email: string | null;
  total_reportes: number;
  suspendido: boolean;
}

function AdminReportes() {
  const { user } = useAuth();
  const qc = useQueryClient();

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

  const reportesQ = useQuery({
    queryKey: ["admin-reportes"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<ReporteRow[]> => {
      const { data, error } = await supabase
        .from("reportes")
        .select(`
          id, reserva_id, reportante_id, reportado_id, motivo, descripcion, estado, created_at,
          reportante:usuarios!reportes_reportante_id_fkey ( nombre ),
          reportado:usuarios!reportes_reportado_id_fkey ( nombre, email )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReporteRow[];
    },
  });

  // Agrupar prestadores con >=3 reportes
  const flagged = useQuery({
    queryKey: ["admin-flagged-prestadores", reportesQ.data?.length],
    enabled: !!reportesQ.data,
    queryFn: async (): Promise<PrestadorReportado[]> => {
      const counts = new Map<string, number>();
      for (const r of reportesQ.data ?? []) {
        if (r.estado === "pendiente") counts.set(r.reportado_id, (counts.get(r.reportado_id) ?? 0) + 1);
      }
      const flaggedIds = Array.from(counts.entries()).filter(([, c]) => c >= 3).map(([id]) => id);
      if (flaggedIds.length === 0) return [];
      const { data } = await supabase
        .from("prestadores")
        .select("id, usuario_id, suspendido, usuarios ( nombre, email )")
        .in("usuario_id", flaggedIds);
      type Row = { id: string; usuario_id: string; suspendido: boolean; usuarios: { nombre: string; email: string | null } | null };
      return ((data ?? []) as unknown as Row[]).map((p) => ({
        prestador_id: p.id,
        usuario_id: p.usuario_id,
        nombre: p.usuarios?.nombre ?? "Sin nombre",
        email: p.usuarios?.email ?? null,
        total_reportes: counts.get(p.usuario_id) ?? 0,
        suspendido: p.suspendido,
      }));
    },
  });

  const resolver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reportes").update({ estado: "resuelto" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reportes"] }),
  });

  const suspender = useMutation({
    mutationFn: async ({ prestadorId, suspender }: { prestadorId: string; suspender: boolean }) => {
      const { error } = await supabase.from("prestadores").update({ suspendido: suspender }).eq("id", prestadorId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reportes"] });
      qc.invalidateQueries({ queryKey: ["admin-flagged-prestadores"] });
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

  const pendientes = reportesQ.data?.filter((r) => r.estado === "pendiente") ?? [];
  const resueltos = reportesQ.data?.filter((r) => r.estado === "resuelto") ?? [];

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-[#111827] text-white px-5 py-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="size-6 text-[#EF9F27]" /> Reportes</h1>
        <p className="text-sm text-white/70 mt-1">{pendientes.length} pendientes · {resueltos.length} resueltos</p>
      </header>

      <main className="px-5 py-6 max-w-3xl mx-auto space-y-6">
        {flagged.data && flagged.data.length > 0 && (
          <section>
            <div className="p-4 rounded-2xl bg-[#FF3B6B]/10 border-2 border-[#FF3B6B]">
              <div className="flex items-center gap-2 text-[#FF3B6B] font-bold">
                <AlertTriangle className="size-5" /> Alerta: prestadores con 3+ reportes
              </div>
              <ul className="mt-3 space-y-2">
                {flagged.data.map((p) => (
                  <li key={p.prestador_id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E5E7EB]">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[#111827] truncate">{p.nombre}</div>
                      <div className="text-xs text-[#6B7280] truncate">{p.email} · {p.total_reportes} reportes pendientes</div>
                    </div>
                    <button
                      onClick={() => suspender.mutate({ prestadorId: p.prestador_id, suspender: !p.suspendido })}
                      disabled={suspender.isPending}
                      className={`shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 ${
                        p.suspendido ? "bg-white border border-[#E5E7EB] text-[#111827]" : "bg-[#FF3B6B] text-white"
                      }`}
                    >
                      <Ban className="size-3.5" /> {p.suspendido ? "Reactivar" : "Suspender cuenta"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Pendientes ({pendientes.length})</h2>
          {reportesQ.isLoading && <div className="text-center py-12"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
          {pendientes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-white rounded-2xl border border-[#E5E7EB]">
              No hay reportes pendientes.
            </div>
          ) : (
            <div className="space-y-3">
              {pendientes.map((r) => (
                <ReporteCard key={r.id} r={r} onResolve={() => resolver.mutate(r.id)} resolving={resolver.isPending} />
              ))}
            </div>
          )}
        </section>

        {resueltos.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Resueltos ({resueltos.length})</h2>
            <div className="space-y-3">
              {resueltos.slice(0, 10).map((r) => (
                <ReporteCard key={r.id} r={r} resolved />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ReporteCard({ r, onResolve, resolving, resolved }: { r: ReporteRow; onResolve?: () => void; resolving?: boolean; resolved?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl bg-white border ${resolved ? "border-[#E5E7EB] opacity-70" : "border-[#FF3B6B]/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-sm text-[#111827]">{r.motivo}</div>
          <div className="text-xs text-[#6B7280] mt-0.5">
            <strong>{r.reportante?.nombre ?? "Cliente"}</strong> reportó a <strong>{r.reportado?.nombre ?? "Prestador"}</strong>
          </div>
          <div className="text-[10px] text-[#9CA3AF] mt-1">{new Date(r.created_at).toLocaleString("es-CL")}</div>
        </div>
        <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold ${
          r.estado === "resuelto" ? "bg-[#00C28820] text-[#00754F]" : "bg-[#FAC77540] text-[#854F0B]"
        }`}>{r.estado}</span>
      </div>
      {r.descripcion && (
        <p className="mt-3 text-sm text-[#111827] bg-[#F5F5F0] p-3 rounded-xl">{r.descripcion}</p>
      )}
      {!resolved && onResolve && (
        <button
          onClick={onResolve}
          disabled={resolving}
          className="mt-3 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#00C288] text-white text-xs font-semibold disabled:opacity-50"
        >
          <Check className="size-3.5" /> Marcar resuelto
        </button>
      )}
    </div>
  );
}
