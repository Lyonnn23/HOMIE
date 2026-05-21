import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Check, X, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/verificaciones")({
  head: () => ({ meta: [{ title: "Verificaciones — Admin" }] }),
  component: AdminVerificaciones,
});

interface VerifRow {
  id: string;
  prestador_id: string;
  foto_carnet_frente: string | null;
  foto_carnet_reverso: string | null;
  foto_selfie: string | null;
  certificados: string[];
  estado: string;
  motivo_rechazo: string | null;
  created_at: string;
  prestadores: { usuario_id: string; categoria_id: string; usuarios: { nombre: string; email: string | null } | null } | null;
}

function AdminVerificaciones() {
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

  const verifsQ = useQuery({
    queryKey: ["admin-verifs"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<VerifRow[]> => {
      const { data, error } = await supabase
        .from("verificaciones_prestador")
        .select("*, prestadores ( usuario_id, categoria_id, usuarios ( nombre, email ) )")
        .eq("estado", "pendiente")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VerifRow[];
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

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-[#111827] text-white px-5 py-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="size-6 text-[#EF9F27]" /> Verificaciones</h1>
        <p className="text-sm text-white/70 mt-1">{verifsQ.data?.length ?? 0} pendientes</p>
      </header>

      <main className="px-5 py-6 max-w-3xl mx-auto space-y-4">
        {verifsQ.isLoading && <div className="text-center py-12"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
        {verifsQ.data && verifsQ.data.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-white rounded-2xl border border-[#E5E7EB]">
            No hay verificaciones pendientes.
          </div>
        )}
        {verifsQ.data?.map((v) => (
          <VerifCard key={v.id} v={v} onResolved={() => qc.invalidateQueries({ queryKey: ["admin-verifs"] })} />
        ))}
      </main>
    </div>
  );
}

function VerifCard({ v, onResolved }: { v: VerifRow; onResolved: () => void }) {
  const [showRechazo, setShowRechazo] = useState(false);
  const [motivo, setMotivo] = useState("");

  const aprobar = useMutation({
    mutationFn: async () => {
      const { error: e1 } = await supabase.from("verificaciones_prestador").update({ estado: "aprobado", motivo_rechazo: null }).eq("id", v.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("prestadores").update({ verificado: true, verificado_identidad: true }).eq("id", v.prestador_id);
      if (e2) throw e2;
    },
    onSuccess: onResolved,
  });

  const rechazar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("verificaciones_prestador").update({ estado: "rechazado", motivo_rechazo: motivo }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: onResolved,
  });

  const nombre = v.prestadores?.usuarios?.nombre ?? "Sin nombre";
  const email = v.prestadores?.usuarios?.email ?? "—";

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-[#111827]">{nombre}</div>
          <div className="text-xs text-[#6B7280]">{email} · {v.prestadores?.categoria_id}</div>
          <div className="text-xs text-[#9CA3AF] mt-1">{new Date(v.created_at).toLocaleString("es-CL")}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SignedImg path={v.foto_carnet_frente} label="Frente" />
        <SignedImg path={v.foto_carnet_reverso} label="Reverso" />
        <SignedImg path={v.foto_selfie} label="Selfie" />
      </div>

      {v.certificados.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Certificados</div>
          <div className="flex flex-wrap gap-2">
            {v.certificados.map((c, i) => <SignedLink key={i} path={c} label={`Cert ${i + 1}`} />)}
          </div>
        </div>
      )}

      {showRechazo && (
        <div className="mt-4">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo del rechazo (se enviará al prestador)"
            rows={3}
            className="w-full p-3 rounded-xl border border-[#E5E7EB] text-sm outline-none focus:border-[#FF3B6B]"
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {showRechazo ? (
          <>
            <button onClick={() => setShowRechazo(false)} className="flex-1 h-11 rounded-xl bg-white border border-[#E5E7EB] text-sm font-semibold">Cancelar</button>
            <button
              onClick={() => rechazar.mutate()}
              disabled={!motivo.trim() || rechazar.isPending}
              className="flex-1 h-11 rounded-xl bg-[#FF3B6B] text-white text-sm font-semibold disabled:opacity-50"
            >
              Confirmar rechazo
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setShowRechazo(true)} className="flex-1 h-11 rounded-xl bg-[#FF3B6B] text-white text-sm font-semibold flex items-center justify-center gap-1">
              <X className="size-4" /> Rechazar
            </button>
            <button
              onClick={() => aprobar.mutate()}
              disabled={aprobar.isPending}
              className="flex-1 h-11 rounded-xl bg-[#00C288] text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Check className="size-4" /> Aprobar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function useSignedUrl(path: string | null) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    queryFn: async () => {
      const { data } = await supabase.storage.from("verificaciones").createSignedUrl(path!, 60 * 10);
      return data?.signedUrl ?? null;
    },
  });
}

function SignedImg({ path, label }: { path: string | null; label: string }) {
  const { data: url } = useSignedUrl(path);
  return (
    <div>
      <div className="aspect-square rounded-xl overflow-hidden bg-[#F5F5F0] border border-[#E5E7EB]">
        {url ? <img src={url} alt={label} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-[10px] text-[#9CA3AF]">{label}</div>}
      </div>
      <div className="text-[10px] text-center mt-1 text-[#6B7280]">{label}</div>
    </div>
  );
}

function SignedLink({ path, label }: { path: string; label: string }) {
  const { data: url } = useSignedUrl(path);
  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-[#111827] text-white text-xs font-semibold">
      {label}
    </a>
  );
}
