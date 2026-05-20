import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar contraseña — Homie" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_260)] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-center">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Te enviaremos un link a tu correo para crear una nueva contraseña.
        </p>

        {sent ? (
          <div className="mt-8 p-5 rounded-2xl bg-white border border-border text-center">
            <p className="text-sm">
              Si <span className="font-semibold">{email}</span> está registrado, recibirás un email con instrucciones en unos minutos.
            </p>
            <Link to="/login" className="block mt-4 text-sm font-medium underline">
              Volver al login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="mt-8 space-y-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
              />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-60"
              >
                {submitting ? "Enviando..." : "Enviar link"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-foreground font-medium underline">
                Volver al login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
