/**
 * Convierte errores técnicos (Supabase, red, fetch) en mensajes claros.
 * Uso: toast.error(mensajeError(e, "No se pudo guardar"))
 * Con i18n: mensajeError(e, t("x.fallback"), t) → usa las claves "error.*" del diccionario.
 */

type T = (clave: string, vars?: Record<string, string | number>) => string;

/** [patrón, clave i18n "error.*", texto en español (fallback)] */
const MAPA: Array<[RegExp, string, string]> = [
  [/invalid login credentials|invalid_credentials/i, "error.credenciales", "Correo o contraseña incorrectos."],
  [/email not confirmed/i, "error.emailNoConfirmado", "Aún no confirmas tu correo. Revisa tu bandeja de entrada."],
  [/user already registered|already been registered|already exists/i, "error.yaRegistrado", "Ya existe una cuenta con este correo. Intenta iniciar sesión."],
  [/password should be at least|password.*too short|weak password/i, "error.passwordCorta", "La contraseña debe tener al menos 6 caracteres."],
  [/invalid email|unable to validate email/i, "error.emailInvalido", "El correo no es válido."],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "error.rateLimit", "Demasiados intentos. Espera un momento e inténtalo de nuevo."],
  [/token has expired|otp_expired|expired/i, "error.expirado", "El enlace venció. Pide uno nuevo."],
  [/same password|different from the old password/i, "error.mismaPassword", "La nueva contraseña debe ser distinta a la anterior."],
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed/i, "error.red", "Sin conexión. Revisa tu internet e inténtalo de nuevo."],
  [/jwt|not authenticated|unauthorized|401/i, "error.sesion", "Tu sesión expiró. Vuelve a iniciar sesión."],
  [/permission denied|row-level security|403|forbidden/i, "error.permiso", "No tienes permiso para hacer esto."],
  [/duplicate key|unique constraint|23505/i, "error.duplicado", "Ese registro ya existe."],
  [/payload too large|413|file size|exceeds the maximum/i, "error.archivoGrande", "El archivo es demasiado grande."],
  [/timeout|timed out|504/i, "error.timeout", "El servidor tardó demasiado. Inténtalo de nuevo."],
  [/5\d\d|internal server error/i, "error.servidor", "Tuvimos un problema en el servidor. Inténtalo en unos minutos."],
];

/** True si el mensaje ya está en español (heurística simple). */
function pareceEspanol(msg: string): boolean {
  return /[áéíóúñ¿¡]|\b(no se pudo|no pudimos|ingresa|debes|intenta|correo|contraseña|reserva|código)\b/i.test(msg);
}

export function mensajeError(e: unknown, fallback?: string, t?: T): string {
  const fb = fallback ?? (t ? t("error.generico") : "Algo salió mal. Inténtalo de nuevo.");
  const raw =
    typeof e === "string" ? e
    : e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
      ? (e as { message: string }).message
      : "";
  if (!raw) return fb;
  for (const [re, clave, texto] of MAPA) {
    if (re.test(raw)) {
      if (t) { const tr = t(clave); if (tr !== clave) return tr; }
      return texto;
    }
  }
  if (pareceEspanol(raw)) return raw;
  return fb;
}
