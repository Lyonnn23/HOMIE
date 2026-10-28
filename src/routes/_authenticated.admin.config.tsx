import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/config")({
  head: () => ({ meta: [
    { name: "description", content: "Configuración de cobros de Homie: comisiones, periodo gratis, Premium y ranking." },
    { property: "og:title", content: "Configuración de cobros — Admin Homie" },
    { property: "og:description", content: "Configuración de cobros de Homie: comisiones, periodo gratis, Premium y ranking." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Configuración de cobros — Admin Homie" }] }),
  component: AdminConfig,
});

function AdminConfig() {
  const { user } = useAuth();
  const adminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "superadmin"]);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });
  const configQ = useQuery({
    queryKey: ["admin-config-publica"],
    enabled: adminQ.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("config_publica").select("clave, valor, descripcion");
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = [...(configQ.data ?? [])].sort((a, b) => Object.keys(CAMPOS).indexOf(a.clave) - Object.keys(CAMPOS).indexOf(b.clave));
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-5 py-8">
        {adminQ.isLoading ? <Loader2 className="mx-auto size-5 animate-spin" aria-label="Cargando" />
          : adminQ.error ? <p role="alert" className="text-destructive">No se pudo comprobar el acceso.</p>
          : !adminQ.data ? <><h1 className="title-2">Acceso restringido</h1><p className="mt-2 text-muted-foreground">Esta sección es solo para administradores.</p></>
          : <>
            <Button asChild variant="link" className="px-0"><Link to="/admin"><ArrowLeft /> Panel de administración</Link></Button>
            <h1 className="title-2 mt-3">Configuración de cobros</h1>
            {configQ.isLoading ? <Loader2 className="mt-6 size-5 animate-spin" />
              : configQ.error ? <p role="alert" className="mt-6 text-destructive">No se pudo cargar la configuración.</p>
              : <div className="mt-6 divide-y divide-border">{rows.map((row) => <FilaConfig key={row.clave} row={row} />)}</div>}
          </>}
      </main>
    </AppShell>
  );
}

const CAMPOS: Record<string, { titulo: string; formato: "porcentaje" | "dias" | "rating" | "entero" }> = {
  comision_normal: { titulo: "Comisión normal", formato: "porcentaje" },
  comision_premium: { titulo: "Comisión Premium", formato: "porcentaje" },
  comision_gratis: { titulo: "Comisión durante el periodo gratis", formato: "porcentaje" },
  dias_gratis: { titulo: "Días sin comisión", formato: "dias" },
  premium_trial_dias: { titulo: "Días de prueba Premium", formato: "dias" },
  ranking_min_rating_premium: { titulo: "Calificación mínima para el ranking Premium", formato: "rating" },
  ranking_min_resenas_premium: { titulo: "Reseñas mínimas para el ranking Premium", formato: "entero" },
};

function FilaConfig({ row }: { row: { clave: string; valor: number; descripcion: string | null } }) {
  const qc = useQueryClient();
  const campo = CAMPOS[row.clave];
  const porcentaje = campo?.formato === "porcentaje";
  const actual = porcentaje ? Number(row.valor) * 100 : Number(row.valor);
  const [texto, setTexto] = useState(String(actual));
  useEffect(() => { setTexto(String(actual)); }, [actual]);
  const mostrado = Number(texto);
  const valor = porcentaje ? mostrado / 100 : mostrado;
  const invalido = texto.trim() === "" || !Number.isFinite(valor) || valor < 0
    || (porcentaje && valor > 1) || (campo?.formato === "rating" && valor > 5)
    || ((campo?.formato === "dias" || campo?.formato === "entero") && !Number.isInteger(valor));
  const guardar = useMutation({
    mutationFn: async () => {
      if (invalido) throw new Error("Revisa el valor ingresado.");
      const { data, error } = await supabase.from("config_publica").update({ valor }).eq("clave", row.clave).select("clave");
      if (error) throw error;
      if (!data?.length) throw new Error("No se pudo guardar el cambio.");
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      for (const key of ["admin-config-publica", "config-cobros", "prestador-comision", "prestador-pro", "prestador-row"]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: () => toast.error("No se pudo guardar la configuración."),
  });
  const titulo = campo?.titulo ?? row.clave;
  return <form className="flex flex-wrap items-center gap-3 py-5" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
    <div className="min-w-0 flex-1 basis-64"><label htmlFor={`config-${row.clave}`} className="font-semibold text-sm">{titulo}</label>
      <p className="mt-1 text-xs text-muted-foreground">{row.descripcion}</p></div>
    <div className="flex items-center gap-2"><Input id={`config-${row.clave}`} aria-label={titulo} type="number" min={0}
      max={porcentaje ? 100 : campo?.formato === "rating" ? 5 : undefined}
      step={campo?.formato === "rating" || porcentaje ? 0.1 : 1} className="w-24 tabular-nums" value={texto} onChange={(e) => setTexto(e.target.value)} />
      {porcentaje && <span className="text-muted-foreground">%</span>}
      <Button type="submit" size="icon" aria-label={`Guardar ${titulo}`} title={`Guardar ${titulo}`} disabled={invalido || valor === Number(row.valor) || guardar.isPending}>
        {guardar.isPending ? <Loader2 className="animate-spin" /> : <Save />}
      </Button></div>
  </form>;
}
