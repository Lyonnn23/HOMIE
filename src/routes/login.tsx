import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { HomieLogo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Ingresar — Homie" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setErr(error.message);
    else navigate({ to: "/" });
  }

  async function onGoogle() {
    setErr(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) setErr(res.error.message);
  }

  const fieldClass =
    "w-full h-12 px-4 rounded-2xl bg-white border border-[#E5E7EB] outline-none transition focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20 text-[#111827]";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <HomieLogo size={48} inverted={false} withTagline />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-center text-[#111827]">
          Bienvenido de vuelta
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1">
          Ingresa con tu cuenta para continuar
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-[#111827]"
              aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-[#111827] text-white font-semibold disabled:opacity-60"
          >
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-[#EF9F27]">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex-1 h-px bg-[#E5E7EB]" />
          o continúa con
          <span className="flex-1 h-px bg-[#E5E7EB]" />
        </div>

        <button
          onClick={onGoogle}
          className="w-full h-12 rounded-2xl bg-white border border-[#E5E7EB] font-semibold flex items-center justify-center gap-3 hover:bg-[#F5F5F0] transition text-[#111827]"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1A6.7 6.7 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continuar con Google
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="font-semibold text-[#EF9F27]">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
