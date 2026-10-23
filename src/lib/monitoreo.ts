/**
 * Monitoreo de errores con Sentry (solo navegador).
 * Se activa únicamente si VITE_SENTRY_DSN está definido; de lo contrario todas
 * las funciones son no-op. Nunca lanza.
 */
import * as Sentry from "@sentry/react";

const DSN: string | undefined =
  (import.meta.env.VITE_SENTRY_DSN as string | undefined) || undefined;

let iniciado = false;

function enNavegador(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function monitoreoActivo(): boolean {
  return iniciado;
}

/** Inicializa Sentry una sola vez, solo en el cliente y si hay DSN. */
export function iniciarMonitoreo(): void {
  if (iniciado || !DSN || !enNavegador()) return;
  try {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      release: (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
      // Session Replay desactivado (privacidad y peso del bundle).
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: false,
      ignoreErrors: [
        "ResizeObserver loop",
        "Load failed",
        "Failed to fetch",
        "NetworkError",
        "AbortError",
      ],
    });
    try {
      const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
      const plataforma = cap?.getPlatform?.();
      if (plataforma) Sentry.setTag("plataforma", plataforma);
    } catch {
      /* ignorar */
    }
    iniciado = true;
  } catch (e) {
    console.warn("[monitoreo] no se pudo iniciar Sentry", e);
  }
}

/** Reporta un error a Sentry (si está activo) y lo registra en consola. */
export function reportarError(e: unknown, contexto?: Record<string, unknown>): void {
  try {
    console.error(e);
    if (!iniciado) return;
    Sentry.captureException(e, contexto ? { extra: contexto } : undefined);
  } catch {
    /* nunca lanzar */
  }
}

/** Asocia los eventos al usuario autenticado (solo id; sin PII). */
export function setUsuarioMonitoreo(userId: string | null | undefined): void {
  try {
    if (!iniciado) return;
    Sentry.setUser(userId ? { id: userId } : null);
  } catch {
    /* ignorar */
  }
}

/** ErrorBoundary de Sentry, reutilizable aunque Sentry no esté inicializado. */
export const ErrorBoundaryMonitoreo = Sentry.ErrorBoundary;
