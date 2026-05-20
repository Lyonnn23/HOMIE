import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HomieLogo } from "@/components/Logo";

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

  const fieldClass =
    "w-full h-12 px-4 rounded-2xl bg-white border border-[#E5E7EB] outline-none transition focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20 text-[#111827]";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <HomieLogo size={48} inverted={false} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-center text-[#111827]">
          Recuperar contraseña
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1">
          Te enviaremos un link para crear una nueva contraseña.
        </p>

        {sent ? (
          <div
            className="mt-8 p-5 rounded-2xl border text-center"
            style={{ borderColor: "#00C288", backgroundColor: "#00C28814", color: "#065F46" }}
          >
            <CheckCircle2 className="mx-auto size-7 mb-2" style={{ color: "#00C288" }} />
            <p className="text-sm font-medium">
              Si <span className="font-semibold">{email}</span> está registrado,
              recibirás las instrucciones en unos minutos.
            </p>
            <Link to="/login" className="block mt-4 text-sm font-semibold text-[#EF9F27]">
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
                className={fieldClass}
              />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-[#111827] text-white font-semibold disabled:opacity-60"
              >
                {submitting ? "Enviando..." : "Enviar instrucciones"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-500">
              <Link to="/login" className="font-semibold text-[#EF9F27]">
                Volver al login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
