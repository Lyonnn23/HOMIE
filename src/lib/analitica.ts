/**
 * Analítica de producto con PostHog (solo navegador).
 * Se activa únicamente si VITE_POSTHOG_KEY está definido; de lo contrario todas
 * las funciones son no-op. Respeta "Do Not Track" y nunca lanza.
 * Ver docs/ANALITICA.md para la lista de eventos.
 */
import posthog from "posthog-js";

const KEY: string | undefined = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) || undefined;
const HOST: string = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

let iniciado = false;

function enNavegador(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function doNotTrack(): boolean {
  try {
    const n = navigator as Navigator & { msDoNotTrack?: string };
    const w = window as Window & { doNotTrack?: string };
    return n.doNotTrack === "1" || w.doNotTrack === "1" || n.msDoNotTrack === "1";
  } catch {
    return false;
  }
}

export function analiticaActiva(): boolean {
  return iniciado;
}

/** Inicializa PostHog una sola vez, solo en el cliente y si hay clave. */
export function iniciarAnalitica(): void {
  if (iniciado || !KEY || !enNavegador() || doNotTrack()) return;
  try {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      respect_dnt: true,
      autocapture: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
    });
    iniciado = true;
  } catch (e) {
    console.warn("[analitica] no se pudo iniciar PostHog", e);
  }
}

/** Registra un evento de producto. */
export function evento(nombre: string, props?: Record<string, unknown>): void {
  if (!iniciado) return;
  try { posthog.capture(nombre, props); } catch { /* nunca bloquea */ }
}

/** Asocia la sesión al usuario (solo id y propiedades no sensibles). */
export function identificar(userId: string, props?: Record<string, unknown>): void {
  if (!iniciado) return;
  try { posthog.identify(userId, props); } catch { /* nunca bloquea */ }
}

/** Cierra la identidad (al cerrar sesión). */
export function resetAnalitica(): void {
  if (!iniciado) return;
  try { posthog.reset(); } catch { /* nunca bloquea */ }
}

/** Vista de página (el router la llama al resolver cada navegación). */
export function vistaPagina(path: string): void {
  if (!iniciado) return;
  try { posthog.capture("$pageview", { $current_url: path, path }); } catch { /* nunca bloquea */ }
}
