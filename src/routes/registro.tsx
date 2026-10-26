import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Home, Briefcase, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { HomieLogo } from "@/components/Logo";
import { groups, categoriesOfGroup } from "@/data/services";
import { mensajeError } from "@/lib/errores";
import { useTemaGuardado } from "@/hooks/use-tema";
import { useT } from "@/i18n";

export const Route = createFileRoute("/registro")({
  validateSearch: (s: Record<string, unknown>): { tipo?: "prestador"; ref?: string } => ({
    ...(s.tipo === "prestador" ? { tipo: "prestador" as const } : {}),
    ...(typeof s.ref === "string" && s.ref.trim() ? { ref: s.ref.trim().toUpperCase().slice(0, 12) } : {}),
  }),
  head: () => ({ meta: [
    { name: "description", content: "Crea tu cuenta de cliente o profesional en Homie." },
    { property: "og:title", content: "Crear cuenta — Homie" },
    { property: "og:description", content: "Crea tu cuenta de cliente o profesional en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Crear cuenta — Homie" }] }),
  component: RegistroPage,
});

function RegistroPage() {
  useTemaGuardado();
  const { t } = useT();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const search = Route.useSearch();
  const [tipo, setTipo] = useState<"cliente" | "prestador">(search.tipo ?? "cliente");
  const [refCode, setRefCode] = useState(search.ref ?? "");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [pendienteEmail, setPendienteEmail] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const fieldClass =
    "w-full h-12 px-4 rounded-2xl bg-white border border-[#E5E7EB] outline-none transition focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20 text-[#111827]";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirmPw) {
      setErr(t("registro.errPasswords"));
      return;
    }
    if (tipo === "prestador" && !categoriaId) {
      setErr(t("registro.errCategoria"));
      return;
    }
    setSubmitting(true);
    // El código de invitación se canjea tras el primer login (ver _authenticated.tsx), cuando ya existe la fila de usuarios.
    try {
      if (refCode.trim()) localStorage.setItem("homie_ref", refCode.trim().toUpperCase());
      else localStorage.removeItem("homie_ref");
    } catch { /* ignore */ }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nombre,
          tipo,
          categoria_id: tipo === "prestador" ? categoriaId : null,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setErr(mensajeError(error, t("registro.errCrear"), t));
      return;
    }
    if (!data.session) {
      setPendienteEmail(true);
      return;
    }

    if (tipo === "prestador") navigate({ to: "/onboarding-prestador" });
    else navigate({ to: "/" });
  }

  async function onGoogle() {
    try { if (refCode.trim()) localStorage.setItem("homie_ref", refCode.trim().toUpperCase()); } catch { /* ignore */ }
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) setErr(mensajeError(res.error, t("registro.errGoogle"), t));
  }

  if (pendienteEmail) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6"><HomieLogo size={44} inverted={false} /></div>
          <div className="mx-auto size-16 rounded-full bg-[#00C28820] flex items-center justify-center">
            <MailCheck className="size-8 text-[#00754F]" />
          </div>
          <h1 className="mt-5 title-2 text-[#111827]">{t("registro.confirmaCorreo")}</h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            {t("registro.enviamosEnlace", { email: "\u0000" }).split("\u0000").map((parte, i) => i === 0 ? <span key={i}>{parte}<b className="text-[#111827]">{email}</b></span> : <span key={i}>{parte}</span>)}
          </p>
          {tipo === "prestador" && (
            <div className="mt-5 p-4 rounded-2xl bg-[#F5F5F0] text-left text-sm text-[#374151]">
              <b className="text-[#111827]">{t("registro.siguientePaso")}</b> {t("registro.siguientePasoTexto")}
            </div>
          )}
          <p className="mt-4 text-xs text-[#9CA3AF]">{t("registro.noLlega")}</p>
          <Link to="/login" className="mt-6 inline-flex h-12 items-center justify-center px-6 rounded-2xl bg-[#111827] text-white font-semibold text-sm">
            {t("registro.yaConfirme")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <HomieLogo size={44} inverted={false} />
        </div>
        <h1 className="title-2 text-center text-[#111827]">
          {t("registro.titulo")}
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1">
          {t("registro.sub")}
        </p>

        {/* Tipo de cuenta */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { key: "cliente", label: t("registro.buscoServicios"), icon: Home },
            { key: "prestador", label: t("registro.ofrezcoServicios"), icon: Briefcase },
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
            placeholder={t("registro.nombre")}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={fieldClass}
          />
          <input
            type="email"
            required
            placeholder={t("registro.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              placeholder={t("registro.passwordMin")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-[#111827]"
              aria-label={showPw ? t("login.ocultarPassword") : t("login.mostrarPassword")}
            >
              {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            placeholder={t("registro.confirmarPassword")}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className={fieldClass}
          />

          <div>
            <input
              placeholder={t("registro.codigoInvitacion")}
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 12))}
              autoCapitalize="characters" autoCorrect="off" spellCheck={false}
              className={`${fieldClass} font-mono tracking-widest uppercase`}
            />
            {refCode && (
              <p className="mt-1 px-1 text-xs text-[#00754F]">{t("registro.regaloRef")}</p>
            )}
          </div>

          {/* Campos extra para prestador */}
          {tipo === "prestador" && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 px-1">
                  {t("registro.categoriaPrincipal")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {groups.flatMap((g) => [
                    <div key={`h-${g.id}`} className="col-span-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 mt-1">{g.name}</div>,
                    ...categoriesOfGroup(g.id).map((c) => {
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
                  }),
                  ])}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F5F5F0] p-4">
                <div className="text-sm font-bold text-[#111827]">{t("registro.despuesTitulo")}</div>
                <p className="text-xs text-[#6B7280] mt-1">{t("registro.despuesSub")}</p>
                <ol className="mt-3 space-y-2.5">
                  {[
                    [t("registro.paso1"), t("registro.paso1d")],
                    [t("registro.paso2"), t("registro.paso2d")],
                    [t("registro.paso3"), t("registro.paso3d")],
                    [t("registro.paso4"), t("registro.paso4d")],
                    [t("registro.paso5"), t("registro.paso5d")],
                  ].map(([tt, d], i) => (
                    <li key={tt} className="flex gap-3">
                      <span className="size-6 rounded-full bg-[#111827] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#111827] leading-tight">{tt}</span>
                        <span className="block text-xs text-[#6B7280]">{d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold disabled:opacity-60"
          >
            {submitting ? t("registro.creando") : t("registro.crear")}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex-1 h-px bg-[#E5E7EB]" />
          {t("login.oContinua")}
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
          {t("login.google")}
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t("registro.yaTienes")}{" "}
          <Link to="/login" className="font-semibold text-[#EF9F27]">
            {t("registro.ingresa")}
          </Link>
        </p>
      </div>
    </div>
  );
}
