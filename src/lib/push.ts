/**
 * Notificaciones push (OneSignal Web SDK v16), sin paquete npm.
 * Solo se activa en el navegador cuando VITE_ONESIGNAL_APP_ID está definido.
 * Todas las funciones son seguras de llamar: nunca lanzan ni bloquean.
 */

export type EstadoPush = "granted" | "denied" | "default" | "unsupported";

interface OneSignalLike {
  init(opts: Record<string, unknown>): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: {
    permission: boolean;
    permissionNative?: NotificationPermission;
    isPushSupported(): boolean;
    requestPermission(): Promise<void>;
    addEventListener?(ev: string, cb: (...a: unknown[]) => void): void;
  };
  Slidedown?: { promptPush(opts?: Record<string, unknown>): Promise<void> };
}

type Deferred = Array<(os: OneSignalLike) => void | Promise<void>>;

declare global {
  interface Window {
    OneSignalDeferred?: Deferred;
    OneSignal?: OneSignalLike;
  }
}

const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

export const PUSH_APP_ID: string | undefined = (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined) || undefined;

let iniciado = false;
let readyPromise: Promise<OneSignalLike | null> | null = null;

function enNavegador() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** ¿Está configurado y es posible usar push en este entorno? */
export function pushDisponible(): boolean {
  return enNavegador() && !!PUSH_APP_ID && "Notification" in window && "serviceWorker" in navigator;
}

/** Carga el SDK e inicializa OneSignal una sola vez. */
export function iniciarPush(): Promise<OneSignalLike | null> {
  if (!pushDisponible()) return Promise.resolve(null);
  if (readyPromise) return readyPromise;
  iniciado = true;
  readyPromise = new Promise<OneSignalLike | null>((resolve) => {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      if (!document.querySelector(`script[src="${SDK_URL}"]`)) {
        const s = document.createElement("script");
        s.src = SDK_URL;
        s.defer = true;
        s.onerror = () => resolve(null);
        document.head.appendChild(s);
      }
      // Si el SDK nunca carga (adblock, sin red), no dejamos promesas colgadas.
      const timeout = window.setTimeout(() => resolve(null), 15_000);
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId: PUSH_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: "/sw.js",
            serviceWorkerParam: { scope: "/" },
            notifyButton: { enable: false },
          });
          window.clearTimeout(timeout);
          resolve(OneSignal);
        } catch {
          window.clearTimeout(timeout);
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
  return readyPromise;
}

/** Asocia el dispositivo al usuario (external_id = auth user id). */
export async function loginPush(userId: string): Promise<void> {
  try {
    const os = await (iniciado ? readyPromise : iniciarPush());
    if (!os || !userId) return;
    await os.login(userId);
  } catch {
    /* nunca bloquear la sesión por push */
  }
}

/** Desasocia el dispositivo del usuario al cerrar sesión. */
export async function logoutPush(): Promise<void> {
  try {
    if (!iniciado || !readyPromise) return;
    const os = await readyPromise;
    if (!os) return;
    await os.logout();
  } catch {
    /* ignorar */
  }
}

/** Estado actual del permiso de notificaciones en este dispositivo. */
export function estadoPush(): EstadoPush {
  if (!pushDisponible()) return "unsupported";
  try {
    const p = window.Notification.permission;
    if (p === "granted" || p === "denied") return p;
    return "default";
  } catch {
    return "unsupported";
  }
}

/** Pide permiso (slidedown de OneSignal o prompt nativo). Devuelve el estado resultante. */
export async function pedirPermisoPush(): Promise<EstadoPush> {
  if (!pushDisponible()) return "unsupported";
  try {
    const os = await iniciarPush();
    if (os) {
      if (os.Slidedown?.promptPush) {
        await os.Slidedown.promptPush({ force: true });
      } else {
        await os.Notifications.requestPermission();
      }
    } else {
      await window.Notification.requestPermission();
    }
  } catch {
    try {
      await window.Notification.requestPermission();
    } catch {
      /* ignorar */
    }
  }
  return estadoPush();
}
