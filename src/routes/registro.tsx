import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Crear cuenta — Homie" }] }),
  component: RegistroPage,
});

function RegistroPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "prestador">("cliente");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nombre, tipo },
      },
    });
    setSubmitting(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (!data.session) {
      setErr("Revisa tu email para confirmar la cuenta.");
      return;
    }
    if (tipo === "prestador") navigate({ to: "/onboarding-prestador" });
    else navigate({ to: "/" });
  }

  async function onGoogle() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) setErr(res.error.message);
  }

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_260)] flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-center">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Únete a Homie en menos de un minuto
        </p>

        <div className="mt-6 p-1 rounded-2xl bg-white border border-border grid grid-cols-2 text-sm font-medium">
          {(["cliente", "prestador"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`py-2.5 rounded-xl transition ${
                tipo === t ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              {t === "cliente" ? "Soy cliente" : "Soy prestador"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            required
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-60"
          >
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex-1 h-px bg-border" /> o <span className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={onGoogle}
          className="w-full h-12 rounded-2xl bg-white border border-border font-medium flex items-center justify-center gap-2"
        >
          <svg className="size-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.7 6.7 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continuar con Google
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-foreground font-medium underline">
            Ingresa
          </Link>
        </p>
      </div>
    </div>
  );
}
