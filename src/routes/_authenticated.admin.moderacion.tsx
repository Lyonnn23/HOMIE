import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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

function AdminModeracion() {
  const { user } = useAuth();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const adminQ = useQuery({
    queryKey: ["is-admin", user?.id], enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.from("user_roles").select("role")
        .eq("user_id", user.id).in("role", ["admin", "superadmin"]);
      if (error) throw error;
      return Boolean(data?.length);
    },
  });
  const resumen = useQuery({
    queryKey: ["moderacion-resumen", user?.id], enabled: adminQ.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("moderacion_resumen").select("usuario_id,nombre,tipo,eventos,ultimo,motivos")
        .order("ultimo", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const eventos = useQuery({
    queryKey: ["moderacion-eventos", user?.id, seleccionado], enabled: adminQ.data === true,
    queryFn: async () => {
      let q = supabase.from("moderacion_eventos").select("id,usuario_id,origen,texto,motivo,created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (seleccionado) q = q.eq("usuario_id", seleccionado);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  const nombres = new Map((resumen.data ?? []).map((r) => [r.usuario_id, r.nombre]));
  const cargando = resumen.isLoading || eventos.isLoading;
  return <AppShell><main className="mx-auto max-w-4xl px-5 py-8">
    {adminQ.isLoading ? <Loader2 className="size-5 animate-spin" aria-label="Cargando" />
      : adminQ.error ? <p role="alert" className="text-destructive">No se pudo comprobar el acceso.</p>
      : !adminQ.data ? <><h1 className="title-2">Acceso restringido</h1><p className="mt-2 text-muted-foreground">Esta sección es solo para administradores.</p></>
      : <>
        <Button asChild variant="link" className="px-0"><Link to="/admin"><ArrowLeft /> Panel de administración</Link></Button>
        <div className="mt-3 flex items-center justify-between gap-3"><h1 className="title-2">Moderación</h1>
          <Button variant="outline" size="icon" aria-label="Actualizar historial" title="Actualizar historial"
            disabled={resumen.isFetching || eventos.isFetching} onClick={() => { void resumen.refetch(); void eventos.refetch(); }}><RefreshCw /></Button></div>
        {cargando ? <Loader2 className="mt-8 size-5 animate-spin" aria-label="Cargando historial" />
          : resumen.error || eventos.error ? <p role="alert" className="mt-6 text-destructive">No se pudo cargar el historial.</p>
          : <>
            <section className="mt-8"><h2 className="font-semibold">Por usuario</h2>
              {!resumen.data?.length ? <p className="mt-3 text-sm text-muted-foreground">No hay eventos de moderación registrados.</p>
                : <ul className="mt-3 divide-y divide-border">{resumen.data.map((r) => <li key={r.usuario_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0"><p className="font-medium break-words">{r.nombre ?? "Usuario"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.eventos} eventos · {(r.motivos ?? []).map(motivoNombre).join(", ")}</p></div>
                  <Button variant={seleccionado === r.usuario_id ? "secondary" : "outline"} disabled={!r.usuario_id}
                    onClick={() => setSeleccionado(seleccionado === r.usuario_id ? null : r.usuario_id)}>Ver eventos</Button>
                </li>)}</ul>}
            </section>
            <section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">
              {seleccionado ? `Eventos de ${nombres.get(seleccionado) ?? "usuario"}` : "Eventos recientes"}</h2>
              {seleccionado && <Button variant="ghost" onClick={() => setSeleccionado(null)}>Ver todos</Button>}</div>
              <ul className="mt-3 divide-y divide-border">{(eventos.data ?? []).map((e) => <li key={e.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm"><ShieldAlert className="size-4 shrink-0 text-destructive" />
                  <span className="font-semibold">{motivoNombre(e.motivo)}</span><span className="text-muted-foreground">· {e.origen}</span></div>
                <p className="mt-2 text-sm whitespace-pre-wrap break-words">{e.texto}</p>
                <p className="mt-2 text-xs text-muted-foreground">{nombres.get(e.usuario_id) ?? "Usuario"} · {new Date(e.created_at).toLocaleString("es-CL")}</p>
              </li>)}</ul>
              {seleccionado && !eventos.data?.length && <p className="mt-3 text-sm text-muted-foreground">Sin eventos para este usuario.</p>}
            </section>
          </>}
      </>}
  </main></AppShell>;
}

function motivoNombre(motivo: string) {
  const nombres: Record<string, string> = {
    ofensivo: "Lenguaje ofensivo", contacto_sin_pago: "Contacto antes del pago", resena_corta: "Reseña demasiado corta",
    resena_url: "Enlace en reseña", resena_duplicada: "Reseña duplicada", ia_ofensivo: "Lenguaje ofensivo",
    ia_contacto: "Contacto fuera de Homie", ia_spam: "Spam", ia_amenaza: "Amenaza",
  };
  return nombres[motivo] ?? motivo;
}
