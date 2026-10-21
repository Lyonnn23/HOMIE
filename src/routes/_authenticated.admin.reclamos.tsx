import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Loader2, Scale, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/reclamos")({
  head: () => ({ meta: [
    { name: "description", content: "Revisión y respuesta a reclamos de clientes y profesionales en Homie." },
    { property: "og:title", content: "Reclamos — Admin Homie" },
    { property: "og:description", content: "Revisión y respuesta a reclamos de clientes y profesionales en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Reclamos — Admin Homie" }] }),
  component: AdminReclamos,
});

type Estado = "abierto" | "en_revision" | "resuelto" | "cerrado";

const ESTADOS: Estado[] = ["abierto", "en_revision", "resuelto", "cerrado"];

const ESTADO_LABEL: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const ESTADO_STYLE: Record<string, string> = {
  abierto: "bg-[#FAC77540] text-[#854F0B]",
  en_revision: "bg-blue-100 text-blue-800",
  resuelto: "bg-[#00C28820] text-[#00754F]",
  cerrado: "bg-[#F5F5F0] text-[#6B7280]",
};

interface ReclamoRow {
  id: string;
  autor_id: string;
  tipo: string;
  reserva_id: string | null;
  asunto: string;
  detalle: string;
  estado: string;
  respuesta_admin: string | null;
  respondido_at: string | null;
  created_at: string;
  autor: { nombre: string; email: string | null; tipo: string } | null;
}

function AdminReclamos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Estado | "todos">("abierto");

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

  const reclamosQ = useQuery({
    queryKey: ["admin-reclamos"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<ReclamoRow[]> => {
      const { data, error } = await supabase
        .from("reclamos")
        .select("id, autor_id, tipo, reserva_id, asunto, detalle, estado, respuesta_admin, respondido_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Omit<ReclamoRow, "autor">[];

      // Join manual con usuarios (nombre, email) — no depende de FK expuesta en PostgREST
      const ids = Array.from(new Set(rows.map((r) => r.autor_id)));
      const autores = new Map<string, ReclamoRow["autor"]>();
      if (ids.length > 0) {
        const { data: us } = await supabase.from("usuarios").select("id, nombre, email, tipo").in("id", ids);
        for (const u of (us ?? []) as { id: string; nombre: string; email: string | null; tipo: string }[]) {
          autores.set(u.id, { nombre: u.nombre, email: u.email, tipo: u.tipo });
        }
      }
      return rows.map((r) => ({ ...r, autor: autores.get(r.autor_id) ?? null }));
    },
  });

  const responder = useMutation({
    mutationFn: async ({ id, estado, respuesta }: { id: string; estado: Estado; respuesta: string }) => {
      const r = respuesta.trim();
      const { error } = await supabase
        .from("reclamos")
        .update({
          estado,
          respuesta_admin: r || null,
          respondido_at: r ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reclamo actualizado");
      qc.invalidateQueries({ queryKey: ["admin-reclamos"] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  const todos = reclamosQ.data ?? [];
  const counts = ESTADOS.reduce<Record<string, number>>((acc, e) => {
    acc[e] = todos.filter((r) => r.estado === e).length;
    return acc;
  }, {});
  const visibles = filtro === "todos" ? todos : todos.filter((r) => r.estado === filtro);

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-[#111827] text-white px-5 py-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="size-6 text-[#EF9F27]" /> Reclamos y sugerencias</h1>
        <p className="text-sm text-white/70 mt-1">
          {counts.abierto} abiertos · {counts.en_revision} en revisión · {counts.resuelto} resueltos · {counts.cerrado} cerrados
        </p>
      </header>

      <main className="px-5 py-6 max-w-3xl mx-auto space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Filtrar por estado">
          {(["todos", ...ESTADOS] as const).map((e) => (
            <button
              key={e}
              role="tab"
              aria-selected={filtro === e}
              onClick={() => setFiltro(e)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border ${
                filtro === e ? "bg-[#111827] text-white border-[#111827]" : "bg-white text-[#111827] border-[#E5E7EB]"
              }`}
            >
              {e === "todos" ? `Todos (${todos.length})` : `${ESTADO_LABEL[e]} (${counts[e]})`}
            </button>
          ))}
        </div>

        {reclamosQ.isLoading && <div className="text-center py-12"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
        {reclamosQ.error && (
          <div className="p-4 rounded-2xl bg-white border border-[#FF3B6B]/40 text-sm text-[#FF3B6B]">
            Error al cargar: {(reclamosQ.error as Error).message}
          </div>
        )}
        {!reclamosQ.isLoading && visibles.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-white rounded-2xl border border-[#E5E7EB]">
            No hay reclamos en este estado.
          </div>
        )}

        <div className="space-y-3">
          {visibles.map((r) => (
            <ReclamoItem
              key={r.id}
              r={r}
              saving={responder.isPending && responder.variables?.id === r.id}
              onSave={(estado, respuesta) => responder.mutate({ id: r.id, estado, respuesta })}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function ReclamoItem({
  r,
  saving,
  onSave,
}: {
  r: ReclamoRow;
  saving: boolean;
  onSave: (estado: Estado, respuesta: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<Estado>((ESTADOS.includes(r.estado as Estado) ? r.estado : "abierto") as Estado);
  const [respuesta, setRespuesta] = useState(r.respuesta_admin ?? "");
  const panelId = `reclamo-${r.id}`;

  return (
    <div className={`rounded-2xl bg-white border ${r.estado === "abierto" ? "border-[#EF9F27]/60" : "border-[#E5E7EB]"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide font-bold text-[#6B7280]">
            {r.tipo === "reclamo" ? "Reclamo" : "Sugerencia"}
          </div>
          <div className="font-bold text-sm text-[#111827] truncate">{r.asunto}</div>
          <div className="text-xs text-[#6B7280] mt-0.5 truncate">
            <strong>{r.autor?.nombre ?? "Usuario"}</strong>
            {r.autor?.tipo ? ` (${r.autor.tipo})` : ""}
            {r.autor?.email ? ` · ${r.autor.email}` : ""}
          </div>
          <div className="text-[10px] text-[#9CA3AF] mt-1">{new Date(r.created_at).toLocaleString("es-CL")}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${ESTADO_STYLE[r.estado] ?? ESTADO_STYLE.abierto}`}>
            {ESTADO_LABEL[r.estado] ?? r.estado}
          </span>
          <ChevronDown className={`size-4 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div id={panelId} className="px-4 pb-4 space-y-3 border-t border-[#E5E7EB] pt-3">
          <p className="text-sm text-[#111827] bg-[#F5F5F0] p-3 rounded-xl whitespace-pre-wrap">{r.detalle}</p>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-[#6B7280]">
            <dt className="font-semibold">Autor ID</dt>
            <dd className="font-mono break-all">{r.autor_id}</dd>
            <dt className="font-semibold">Reserva</dt>
            <dd className="font-mono break-all">{r.reserva_id ?? "—"}</dd>
            {r.respondido_at && (
              <>
                <dt className="font-semibold">Respondido</dt>
                <dd>{new Date(r.respondido_at).toLocaleString("es-CL")}</dd>
              </>
            )}
          </dl>

          <form
            onSubmit={(e) => { e.preventDefault(); onSave(estado, respuesta); }}
            className="space-y-2"
          >
            <label htmlFor={`${panelId}-estado`} className="block text-xs font-semibold text-[#111827]">Estado</label>
            <select
              id={`${panelId}-estado`}
              value={estado}
              onChange={(e) => setEstado(e.target.value as Estado)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
              ))}
            </select>

            <label htmlFor={`${panelId}-respuesta`} className="block text-xs font-semibold text-[#111827]">Respuesta al usuario</label>
            <textarea
              id={`${panelId}-respuesta`}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Explica qué revisaron y qué solución se tomó."
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm resize-y"
            />

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#111827] text-white text-xs font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
