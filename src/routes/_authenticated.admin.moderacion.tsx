import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Ban, ChevronDown, ChevronRight, Loader2, ShieldAlert, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/moderacion")({
  head: () => ({ meta: [
    { name: "description", content: "Eventos de moderación por usuario: lenguaje ofensivo, contacto fuera de la app y spam." },
    { property: "og:title", content: "Moderación — Homie" },
    { property: "og:description", content: "Eventos de moderación por usuario." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Moderación — Homie" }] }),
  component: AdminModeracion,
});

interface ResumenRow {
  usuario_id: string;
  nombre: string;
  email: string | null;
  tipo: string;
  eventos: number;
  ultimo: string;
  motivos: string[];
}

interface EventoRow {
  id: string;
  origen: string;
  texto: string | null;
  motivo: string;
  created_at: string;
}

const MOTIVO_LABEL: Record<string, string> = {
  ofensivo: "Ofensivo",
  contacto_sin_pago: "Contacto sin pago",
  resena_corta: "Reseña corta",
  resena_url: "Enlace en reseña",
  resena_duplicada: "Reseña duplicada",
  ia_ofensivo: "Ofensivo (IA)",
  ia_contacto: "Contacto (IA)",
  ia_spam: "Spam (IA)",
  ia_amenaza: "Amenaza (IA)",
};

const ORIGEN_LABEL: Record<string, string> = {
  chat: "Chat",
  resena: "Reseña",
  respuesta: "Respuesta",
  solicitud: "Solicitud",
  cotizacion: "Cotización",
  perfil: "Perfil",
};

function motivoCls(m: string): string {
  if (m.includes("amenaza") || m.includes("ofensivo")) return "bg-[#FF3B6B20] text-[#FF3B6B]";
  if (m.includes("contacto")) return "bg-[#EF9F2720] text-[#9A6412]";
  return "bg-[#F3F4F6] text-[#374151]";
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AdminModeracion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState<string | null>(null);

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

  const resumenQ = useQuery({
    queryKey: ["admin-moderacion-resumen"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<ResumenRow[]> => {
      const { data, error } = await supabase
        .from("moderacion_resumen")
        .select("usuario_id, nombre, email, tipo, eventos, ultimo, motivos")
        .order("eventos", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as ResumenRow[]) ?? [];
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

  const filas = resumenQ.data ?? [];

  return (
    <AppShell>
      <div className="px-5 py-6 max-w-4xl mx-auto space-y-6">
        <header>
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Panel de administración
          </Link>
          <h1 className="title-2 mt-2 flex items-center gap-2"><ShieldAlert className="size-6 text-[#EF9F27]" /> Moderación</h1>
          <p className="lead mt-1">Usuarios con mensajes bloqueados por lenguaje ofensivo, intento de contacto fuera de la app o spam. Ordenados por cantidad de eventos.</p>
        </header>

        {resumenQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
        {resumenQ.error && (
          <div className="card p-4 text-sm text-[#FF3B6B]">No se pudo cargar: {(resumenQ.error as Error).message}</div>
        )}
        {resumenQ.data && filas.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted-foreground">Sin eventos de moderación. Todo en orden.</div>
        )}

        {filas.length > 0 && (
          <ul className="space-y-2">
            {filas.map((f) => (
              <li key={f.usuario_id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAbierto(abierto === f.usuario_id ? null : f.usuario_id)}
                  aria-expanded={abierto === f.usuario_id}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <span className={`size-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${f.eventos >= 5 ? "bg-[#FF3B6B20] text-[#FF3B6B]" : f.eventos >= 2 ? "bg-[#EF9F2720] text-[#9A6412]" : "bg-[#F3F4F6] text-[#111827]"}`}>
                    {f.eventos}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm text-[#111827] truncate">
                      {f.nombre || "Sin nombre"}
                      <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151] align-middle">
                        {f.tipo === "prestador" ? "Profesional" : "Cliente"}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">{f.email ?? "—"} · último {fechaCorta(f.ultimo)}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {f.motivos.map((m) => (
                        <span key={m} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${motivoCls(m)}`}>{MOTIVO_LABEL[m] ?? m}</span>
                      ))}
                    </span>
                  </span>
                  {abierto === f.usuario_id ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                </button>
                {abierto === f.usuario_id && (
                  <DetalleUsuario
                    row={f}
                    onSuspendido={() => qc.invalidateQueries({ queryKey: ["admin-prestadores"] })}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function DetalleUsuario({ row, onSuspendido }: { row: ResumenRow; onSuspendido: () => void }) {
  const eventosQ = useQuery({
    queryKey: ["admin-moderacion-eventos", row.usuario_id],
    queryFn: async (): Promise<EventoRow[]> => {
      const { data, error } = await supabase
        .from("moderacion_eventos")
        .select("id, origen, texto, motivo, created_at")
        .eq("usuario_id", row.usuario_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as EventoRow[]) ?? [];
    },
  });

  const prestadorQ = useQuery({
    queryKey: ["admin-moderacion-prestador", row.usuario_id],
    enabled: row.tipo === "prestador",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestadores")
        .select("id, suspendido")
        .eq("usuario_id", row.usuario_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const suspender = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("prestadores")
        .update({ suspendido: true })
        .eq("usuario_id", row.usuario_id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No se encontró el perfil profesional");
    },
    onSuccess: () => {
      toast.success("Profesional suspendido. Ya no aparece en las búsquedas.");
      prestadorQ.refetch();
      onSuspendido();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo suspender"),
  });

  return (
    <div className="border-t border-border bg-[#FAFAF7] p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {row.tipo === "prestador" && (
          <button
            type="button"
            disabled={suspender.isPending || prestadorQ.data?.suspendido === true}
            onClick={() => { if (confirm(`¿Suspender a ${row.nombre || "este profesional"}? Dejará de aparecer en Homie hasta que lo reactives.`)) suspender.mutate(); }}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#FF3B6B] text-white text-sm font-semibold disabled:opacity-50"
          >
            {suspender.isPending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
            {prestadorQ.data?.suspendido ? "Ya suspendido" : "Suspender profesional"}
          </button>
        )}
        <Link to="/admin/prestadores" className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white border border-border text-sm font-semibold text-[#111827]">
          <Users className="size-4" /> Ver en Profesionales
        </Link>
      </div>

      {eventosQ.isLoading && <div className="py-4 text-center"><Loader2 className="size-4 mx-auto animate-spin" /></div>}
      {eventosQ.error && <p className="text-xs text-[#FF3B6B]">No se pudieron cargar los eventos.</p>}
      {eventosQ.data && (
        <ul className="space-y-2">
          {eventosQ.data.map((e) => (
            <li key={e.id} className="rounded-xl bg-white border border-border p-3">
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${motivoCls(e.motivo)}`}>{MOTIVO_LABEL[e.motivo] ?? e.motivo}</span>
                <span className="text-muted-foreground">{ORIGEN_LABEL[e.origen] ?? e.origen}</span>
                <span className="ml-auto text-muted-foreground">{fechaCorta(e.created_at)}</span>
              </div>
              {e.texto && <p className="mt-1.5 text-sm text-[#374151] whitespace-pre-wrap break-words">{e.texto}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
