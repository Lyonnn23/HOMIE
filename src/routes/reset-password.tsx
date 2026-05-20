import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nueva contraseña — Homie" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase emite PASSWORD_RECOVERY al abrir el link del email.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Si ya estamos en la sesión de recovery (recarga), también validar.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) { setErr("Mínimo 6 caracteres"); return; }
    if (password !== confirm) { setErr("Las contraseñas no coinciden"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    setTimeout(() => navigate({ to: "/" }), 1500);
  }

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_260)] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-center">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Crea una contraseña segura para tu cuenta.
        </p>

        {done ? (
          <div className="mt-8 p-5 rounded-2xl bg-white border border-border text-center text-sm">
            Contraseña actualizada. Redirigiendo...
          </div>
        ) : !ready ? (
          <div className="mt-8 p-5 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            Validando link de recuperación...
            <Link to="/forgot-password" className="block mt-3 text-foreground font-medium underline">
              Solicitar uno nuevo
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
