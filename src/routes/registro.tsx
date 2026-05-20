import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Home, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { HomieLogo } from "@/components/Logo";
import { categories } from "@/data/services";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Crear cuenta — Homie" }] }),
  component: RegistroPage,
});

function RegistroPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [tipo, setTipo] = useState<"cliente" | "prestador">("cliente");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [precioHora, setPrecioHora] = useState<string>("");
  const [descripcion, setDescripcion] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldClass =
    "w-full h-12 px-4 rounded-2xl bg-white border border-[#E5E7EB] outline-none transition focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20 text-[#111827]";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirmPw) {
      setErr("Las contraseñas no coinciden");
      return;
    }
    if (tipo === "prestador" && !categoriaId) {
      setErr("Selecciona la categoría principal");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nombre,
          tipo,
          categoria_id: tipo === "prestador" ? categoriaId : null,
          precio_hora: tipo === "prestador" ? Number(precioHora) || 0 : null,
          descripcion: tipo === "prestador" ? descripcion : null,
        },
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <HomieLogo size={44} inverted={false} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-center text-[#111827]">
          Crear cuenta
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1">
          Únete a Homie en menos de un minuto
        </p>

        {/* Tipo de cuenta */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { key: "cliente", label: "Busco servicios", icon: Home },
            { key: "prestador", label: "Ofrezco servicios", icon: Briefcase },
          ].map(({ key, label, icon: Icon }) => {
            const active = tipo === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTipo(key as "cliente" | "prestador")}
                className="p-4 rounded-2xl bg-white text-left transition"
                style={{
                  border: `2px solid ${active ? "#EF9F27" : "#E5E7EB"}`,
                  boxShadow: active ? "0 0 0 4px #EF9F2722" : "none",
                }}
              >
                <div
                  className="size-9 rounded-xl flex items-center justify-center mb-2"
                  style={{
                    backgroundColor: active ? "#EF9F27" : "#F5F5F0",
                    color: active ? "#111827" : "#6B7280",
                  }}
                >
                  <Icon className="size-5" />
                </div>
                <div className="text-sm font-bold text-[#111827]">{label}</div>
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            required
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={fieldClass}
          />
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
              minLength={6}
              placeholder="Contraseña (mín. 6 caracteres)"
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
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            placeholder="Confirmar contraseña"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className={fieldClass}
          />

          {/* Campos extra para prestador */}
          {tipo === "prestador" && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 px-1">
                  Categoría principal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((c) => {
                    const active = categoriaId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoriaId(c.id)}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-white text-left transition"
                        style={{
                          border: `2px solid ${active ? c.bg : "#E5E7EB"}`,
                          backgroundColor: active ? `${c.bg}14` : "#fff",
                        }}
                      >
                        <span
                          className="size-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: c.bg }}
                        >
                          <c.icon className="size-4 text-white" />
                        </span>
                        <span className="text-xs font-semibold text-[#111827] leading-tight">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="number"
                min={0}
                step={1000}
                placeholder="Precio por hora (CLP)"
                value={precioHora}
                onChange={(e) => setPrecioHora(e.target.value)}
                className={fieldClass}
              />
              <textarea
                placeholder="Breve descripción de tu servicio"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5E7EB] outline-none transition focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20 text-[#111827] resize-none"
              />
            </div>
          )}

          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold disabled:opacity-60"
          >
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
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
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-semibold text-[#EF9F27]">
            Ingresa
          </Link>
        </p>
      </div>
    </div>
  );
}
