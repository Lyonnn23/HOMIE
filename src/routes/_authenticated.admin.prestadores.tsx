import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Ban, ExternalLink, Loader2, Search, Star, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getCategory } from "@/data/services";

export const Route = createFileRoute("/_authenticated/admin/prestadores")({
  head: () => ({ meta: [
    { name: "description", content: "Administración de profesionales, verificación y estado de perfiles en Homie." },
    { property: "og:title", content: "Profesionales — Admin Homie" },
    { property: "og:description", content: "Administración de profesionales, verificación y estado de perfiles en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Profesionales — Admin Homie" }] }),
  component: AdminPrestadores,
});

interface PrestadorRow {
  id: string;
  nombre: string | null;
  categoria_id: string;
  comuna: string | null;
  verificado: boolean;
  suspendido: boolean;
  calificacion_promedio: number;
  resenas_count: number;
  usuarios: { email: string | null; created_at: string } | null;
}

type Filtro = "todos" | "verificados" | "sin_verificar" | "suspendidos";

function AdminPrestadores() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

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

  const prestadoresQ = useQuery({
    queryKey: ["admin-prestadores"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<PrestadorRow[]> => {
      const { data, error } = await supabase
        .from("prestadores")
        .select("id, nombre, categoria_id, comuna, verificado, suspendido, calificacion_promedio, resenas_count, usuarios ( email, created_at )")
        .order("nombre", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PrestadorRow[];
    },
  });

  const suspender = useMutation({
    mutationFn: async ({ id, suspendido }: { id: string; suspendido: boolean }) => {
      const { data, error } = await supabase.from("prestadores").update({ suspendido }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No se pudo actualizar el profesional.");
      return suspendido;
    },
    onSuccess: (suspendido) => {
      toast.success(suspendido ? "Cuenta suspendida" : "Cuenta reactivada");
      qc.invalidateQueries({ queryKey: ["admin-prestadores"] });
      qc.invalidateQueries({ queryKey: ["admin-resumen"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo actualizar"),
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (prestadoresQ.data ?? []).filter((p) => {
      if (filtro === "verificados" && !(p.verificado && !p.suspendido)) return false;
      if (filtro === "sin_verificar" && p.verificado) return false;
      if (filtro === "suspendidos" && !p.suspendido) return false;
      if (!q) return true;
      const cat = getCategory(p.categoria_id)?.name ?? p.categoria_id;
      return [p.nombre, p.usuarios?.email, p.comuna, cat].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [prestadoresQ.data, busqueda, filtro]);

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

  const FILTROS: { value: Filtro; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "verificados", label: "Verificados" },
    { value: "sin_verificar", label: "Sin verificar" },
    { value: "suspendidos", label: "Suspendidos" },
  ];

  return (
    <AppShell wide>
      <div className="container-landing py-6 space-y-6">
        <header>
          <Link to="/admin" className="text-xs text-muted-foreground hover:underline">← Panel de administración</Link>
          <h1 className="title-2 flex items-center gap-2 mt-1"><Users className="size-6 text-[#EF9F27]" /> Profesionales</h1>
          <p className="lead mt-1">{prestadoresQ.data?.length ?? 0} registrados · {filtrados.length} en la lista</p>
        </header>

        <div className="card p-3 flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, correo, comuna o categoría"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-[#E5E7EB] text-sm outline-none focus:border-[#111827]/30" />
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {FILTROS.map((f) => (
              <button key={f.value} type="button" onClick={() => setFiltro(f.value)}
                className={`h-10 px-3 rounded-xl text-xs font-semibold border transition ${
                  filtro === f.value ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-[#E5E7EB] text-[#111827] hover:border-[#9CA3AF]"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {prestadoresQ.isLoading && <div className="text-center py-12"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
        {prestadoresQ.error && <div className="card p-4 text-sm text-[#FF3B6B]">{(prestadoresQ.error as Error).message}</div>}

        {prestadoresQ.data && filtrados.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted-foreground">No hay profesionales que coincidan.</div>
        )}

        {filtrados.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead className="bg-[#F3F4F6] text-xs text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Profesional</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Categoría</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Estado</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Calificación</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Desde</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtrados.map((p) => {
                    const cat = getCategory(p.categoria_id);
                    return (
                      <tr key={p.id} className={`hover:bg-[#FAFAFA] ${p.suspendido ? "opacity-70" : ""}`}>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-[#111827]">{p.nombre ?? "Sin nombre"}</div>
                          <div className="text-xs text-muted-foreground">{p.usuarios?.email ?? "—"}{p.comuna ? ` · ${p.comuna}` : ""}</div>
                        </td>
                        <td className="px-4 py-2.5">{cat?.name ?? p.categoria_id}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {p.suspendido ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#FF3B6B1A] text-[#FF3B6B]">Suspendido</span>
                            ) : null}
                            {p.verificado ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#00C28820] text-[#00754F] inline-flex items-center gap-1"><BadgeCheck className="size-3" /> Verificado</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#FAC77540] text-[#854F0B]">Sin verificar</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1"><Star className="size-3.5 text-[#EF9F27] fill-[#EF9F27]" /> {p.calificacion_promedio.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground"> ({p.resenas_count})</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                          {p.usuarios?.created_at ? new Date(p.usuarios.created_at).toLocaleDateString("es-CL") : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            <Link to="/prestador/$id" params={{ id: p.id }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold hover:border-[#9CA3AF]">
                              <ExternalLink className="size-3.5" /> Perfil
                            </Link>
                            <Link to="/admin/verificaciones"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold hover:border-[#9CA3AF]">
                              <BadgeCheck className="size-3.5" /> Ver verificación
                            </Link>
                            <button type="button"
                              onClick={() => {
                                if (!p.suspendido && !window.confirm(`¿Suspender a ${p.nombre ?? "este profesional"}? Dejará de aparecer en las búsquedas.`)) return;
                                suspender.mutate({ id: p.id, suspendido: !p.suspendido });
                              }}
                              disabled={suspender.isPending}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                                p.suspendido ? "bg-[#00C288] text-white" : "border border-[#FF3B6B] text-[#FF3B6B]"
                              }`}>
                              <Ban className="size-3.5" /> {p.suspendido ? "Reactivar" : "Suspender"}
                            </button>
                          </div>
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
