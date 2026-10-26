import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mensajeError } from "@/lib/errores";
import { useTemaGuardado } from "@/hooks/use-tema";
import { useT } from "@/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { name: "description", content: "Actualiza la contraseña de tu cuenta Homie." },
    { property: "og:title", content: "Nueva contraseña — Homie" },
    { property: "og:description", content: "Actualiza la contraseña de tu cuenta Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Nueva contraseña — Homie" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  useTemaGuardado();
  const { t } = useT();
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
    if (password.length < 6) { setErr(t("login.min6")); return; }
    if (password !== confirm) { setErr(t("registro.errPasswords")); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { setErr(mensajeError(error, t("login.errCambiar"), t)); return; }
    setDone(true);
    setTimeout(() => navigate({ to: "/" }), 1500);
  }

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_260)] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="title-1 text-center">{t("login.nuevaPassword")}</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {t("login.nuevaPasswordSub")}
        </p>

        {done ? (
          <div className="mt-8 p-5 rounded-2xl bg-white border border-border text-center text-sm">
            {t("login.passwordActualizada")}
          </div>
        ) : !ready ? (
          <div className="mt-8 p-5 rounded-2xl bg-white border border-border text-center text-sm text-muted-foreground">
            {t("login.validandoLink")}
            <Link to="/forgot-password" className="block mt-3 text-foreground font-medium underline">
              {t("login.solicitarNuevo")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder={t("login.nuevaPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder={t("registro.confirmarPassword")}
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
              {submitting ? t("login.guardando") : t("login.actualizarPassword")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
