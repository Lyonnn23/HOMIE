/**
 * Convierte errores técnicos (Supabase, red, fetch) en mensajes claros en español.
 * Uso: toast.error(mensajeError(e, "No se pudo guardar"))
 */

const MAPA: Array<[RegExp, string]> = [
  [/invalid login credentials|invalid_credentials/i, "Correo o contraseña incorrectos."],
  [/email not confirmed/i, "Aún no confirmas tu correo. Revisa tu bandeja de entrada."],
  [/user already registered|already been registered|already exists/i, "Ya existe una cuenta con este correo. Intenta iniciar sesión."],
  [/password should be at least|password.*too short|weak password/i, "La contraseña debe tener al menos 6 caracteres."],
  [/invalid email|unable to validate email/i, "El correo no es válido."],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Demasiados intentos. Espera un momento e inténtalo de nuevo."],
  [/token has expired|otp_expired|expired/i, "El enlace venció. Pide uno nuevo."],
  [/same password|different from the old password/i, "La nueva contraseña debe ser distinta a la anterior."],
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed/i, "Sin conexión. Revisa tu internet e inténtalo de nuevo."],
  [/jwt|not authenticated|unauthorized|401/i, "Tu sesión expiró. Vuelve a iniciar sesión."],
  [/permission denied|row-level security|403|forbidden/i, "No tienes permiso para hacer esto."],
  [/duplicate key|unique constraint|23505/i, "Ese registro ya existe."],
  [/payload too large|413|file size|exceeds the maximum/i, "El archivo es demasiado grande."],
  [/timeout|timed out|504/i, "El servidor tardó demasiado. Inténtalo de nuevo."],
  [/5\d\d|internal server error/i, "Tuvimos un problema en el servidor. Inténtalo en unos minutos."],
];

/** True si el mensaje ya está en español (heurística simple). */
function pareceEspanol(msg: string): boolean {
  return /[áéíóúñ¿¡]|\b(no se pudo|no pudimos|ingresa|debes|intenta|correo|contraseña|reserva|código)\b/i.test(msg);
}

export function mensajeError(e: unknown, fallback = "Algo salió mal. Inténtalo de nuevo."): string {
  const raw =
    typeof e === "string" ? e
    : e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
      ? (e as { message: string }).message
      : "";
  if (!raw) return fallback;
  for (const [re, texto] of MAPA) if (re.test(raw)) return texto;
  if (pareceEspanol(raw)) return raw;
  return fallback;
}
