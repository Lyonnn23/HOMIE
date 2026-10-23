import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

/** Clave de localStorage donde /registro guarda el código de invitación hasta el primer login. */
export const HOMIE_REF_KEY = "homie_ref";

function AuthGate() {
  const { user, usuario, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const refAplicado = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  // Código de invitación pendiente (guardado en /registro): se canjea una vez que existe la fila de usuarios.
  useEffect(() => {
    if (!usuario?.id || refAplicado.current) return;
    let code: string | null = null;
    try { code = localStorage.getItem(HOMIE_REF_KEY); } catch { code = null; }
    if (!code?.trim()) return;
    refAplicado.current = true;
    (async () => {
      const { data, error } = await supabase.rpc("usar_codigo_referido", { _codigo: code!.trim().toUpperCase() });
      try { localStorage.removeItem(HOMIE_REF_KEY); } catch { /* ignore */ }
      if (error) {
        toast.error(`Código de invitación: ${error.message}`);
        return;
      }
      toast.success(`¡Tienes $3.000 de regalo! Usa el cupón ${data} en tu primera reserva.`);
      qc.invalidateQueries({ queryKey: ["referido-info"] });
      qc.invalidateQueries({ queryKey: ["cupones"] });
    })();
  }, [usuario?.id, qc]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  return <Outlet />;
}
