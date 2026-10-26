import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { aplicarTemaGuardado } from "@/hooks/use-tema";
import { mensajeError } from "@/lib/errores";
import { evento } from "@/lib/analitica";

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

  // Tema (claro/oscuro) también en pantallas sin AppShell.
  useEffect(() => { aplicarTemaGuardado(); }, []);

  // Analítica: "sesion_iniciada" una vez por sesión del navegador.
  useEffect(() => {
    if (!usuario?.id) return;
    try {
      if (sessionStorage.getItem("homie_sesion_ev") === usuario.id) return;
      sessionStorage.setItem("homie_sesion_ev", usuario.id);
    } catch { /* sin sessionStorage: igual se registra */ }
    evento("sesion_iniciada", { tipo: usuario.tipo });
  }, [usuario?.id, usuario?.tipo]);

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
        toast.error(`Código de invitación: ${mensajeError(error, "no se pudo aplicar.")}`);
        return;
      }
      toast.success(`¡Tienes $3.000 de regalo! Usa el cupón ${data} en tu primera reserva.`);
      qc.invalidateQueries({ queryKey: ["referido-info"] });
      qc.invalidateQueries({ queryKey: ["cupones"] });
    })();
  }, [usuario?.id, qc]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground" role="status" aria-live="polite">
        <span className="inline-flex items-center gap-2">
          <span className="size-4 rounded-full border-2 border-[#EF9F27] border-t-transparent animate-spin" aria-hidden="true" />
          Cargando…
        </span>
      </div>
    );
  }

  return <Outlet />;
}
