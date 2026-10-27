import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/** Keep admin authorization when a screen depends on an undeployed schema. */
export function AdminUnavailable({ title, message }: { title: string; message: string }) {
  const { user } = useAuth();
  const adminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "superadmin"]);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-5 py-8">
        {adminQ.isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin" aria-label="Cargando" />
        ) : adminQ.error ? (
          <p role="alert" className="text-sm text-destructive">No se pudo comprobar el acceso. Inténtalo nuevamente.</p>
        ) : !adminQ.data ? (
          <>
            <h1 className="title-2">Acceso restringido</h1>
            <p className="mt-2 text-sm text-muted-foreground">Esta sección es solo para administradores.</p>
            <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm text-foreground">
              <ArrowLeft className="size-4" /> Ir al inicio
            </Link>
          </>
        ) : (
          <>
            <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowLeft className="size-4" /> Panel de administración
            </Link>
            <h1 className="title-2 mt-4">{title}</h1>
            <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>
          </>
        )}
      </main>
    </AppShell>
  );
}