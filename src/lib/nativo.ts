/**
 * Helpers "nativos" seguros para web, SSR y Capacitor.
 *
 * Todos los imports de @capacitor/* son dinámicos: el bundle web nunca falla si
 * un plugin no está presente, y en SSR (Cloudflare) no se toca `window`.
 * Ninguna función lanza: ante cualquier error devuelven un valor neutro.
 */

type Vibracion = "ligero" | "exito" | "error";

function enNavegador(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

let cacheNativo: boolean | null = null;

/** Detección síncrona: Capacitor inyecta `window.Capacitor` en el WebView nativo. */
export function esNativo(): boolean {
  if (cacheNativo !== null) return cacheNativo;
  if (!enNavegador()) return false;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    cacheNativo = !!cap?.isNativePlatform?.();
  } catch {
    cacheNativo = false;
  }
  return cacheNativo;
}

/** "android" | "ios" | "web" */
export function plataforma(): "android" | "ios" | "web" {
  if (!enNavegador()) return "web";
  try {
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const p = cap?.getPlatform?.();
    return p === "android" || p === "ios" ? p : "web";
  } catch {
    return "web";
  }
}

/** Importa un plugin de Capacitor solo si estamos en nativo. */
async function plugin<T>(cargar: () => Promise<T>): Promise<T | null> {
  if (!esNativo()) return null;
  try {
    return await cargar();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Haptics                                                             */
/* ------------------------------------------------------------------ */

export async function vibrar(tipo: Vibracion = "ligero"): Promise<void> {
  const mod = await plugin(() => import("@capacitor/haptics"));
  if (mod) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = mod;
      if (tipo === "ligero") await Haptics.impact({ style: ImpactStyle.Light });
      else if (tipo === "exito") await Haptics.notification({ type: NotificationType.Success });
      else await Haptics.notification({ type: NotificationType.Error });
      return;
    } catch {
      /* cae al fallback */
    }
  }
  if (!enNavegador()) return;
  try {
    const patron = tipo === "ligero" ? 10 : tipo === "exito" ? [15, 40, 15] : [40, 60, 40];
    navigator.vibrate?.(patron);
  } catch {
    /* ignorar */
  }
}

/* ------------------------------------------------------------------ */
/* Compartir                                                           */
/* ------------------------------------------------------------------ */

export interface DatosCompartir {
  titulo?: string;
  texto?: string;
  url?: string;
}

/** Share nativo → Web Share API → portapapeles. Devuelve true si se compartió/copió. */
export async function compartir({ titulo, texto, url }: DatosCompartir): Promise<boolean> {
  const mod = await plugin(() => import("@capacitor/share"));
  if (mod) {
    try {
      await mod.Share.share({ title: titulo, text: texto, url, dialogTitle: titulo });
      return true;
    } catch {
      return false; // el usuario canceló
    }
  }
  if (!enNavegador()) return false;
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: titulo, text: texto, url });
      return true;
    }
  } catch {
    return false;
  }
  try {
    const contenido = [texto, url].filter(Boolean).join(" ");
    if (contenido && navigator.clipboard) {
      await navigator.clipboard.writeText(contenido);
      return true;
    }
  } catch {
    /* ignorar */
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Cámara                                                              */
/* ------------------------------------------------------------------ */

/**
 * Abre la cámara nativa y devuelve un File listo para subir.
 * En web devuelve null: el llamador debe usar <input type="file" capture>.
 */
export async function tomarFoto(): Promise<File | null> {
  const mod = await plugin(() => import("@capacitor/camera"));
  if (!mod) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = mod;
    const foto = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      correctOrientation: true,
      promptLabelHeader: "Foto",
      promptLabelPhoto: "Elegir de la galería",
      promptLabelPicture: "Tomar foto",
      promptLabelCancel: "Cancelar",
    });
    if (!foto.webPath) return null;
    const res = await fetch(foto.webPath);
    const blob = await res.blob();
    const ext = foto.format || "jpeg";
    return new File([blob], `foto-${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` });
  } catch {
    return null; // cancelado o sin permiso
  }
}

/* ------------------------------------------------------------------ */
/* Ubicación                                                           */
/* ------------------------------------------------------------------ */

export interface Coordenadas {
  lat: number;
  lng: number;
  precision?: number;
}

export async function ubicacionActual(): Promise<Coordenadas | null> {
  const mod = await plugin(() => import("@capacitor/geolocation"));
  if (mod) {
    try {
      const perm = await mod.Geolocation.requestPermissions();
      if (perm.location === "denied") return null;
      const pos = await mod.Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precision: pos.coords.accuracy,
      };
    } catch {
      return null;
    }
  }
  if (!enNavegador() || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            precision: pos.coords.accuracy,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    } catch {
      resolve(null);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Barra de estado                                                     */
/* ------------------------------------------------------------------ */

export async function configurarBarraEstado(): Promise<void> {
  const mod = await plugin(() => import("@capacitor/status-bar"));
  if (!mod) return;
  try {
    const { StatusBar, Style } = mod;
    await StatusBar.setStyle({ style: Style.Dark });
    if (plataforma() === "android") {
      await StatusBar.setBackgroundColor({ color: "#111827" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch {
    /* ignorar */
  }
}

/* ------------------------------------------------------------------ */
/* Botón atrás (Android)                                               */
/* ------------------------------------------------------------------ */

interface RouterLike {
  history: { back: () => void };
  state?: { location?: { pathname?: string } };
}

/**
 * Botón físico "atrás": navega hacia atrás; en "/" minimiza/cierra la app.
 * Devuelve una función para quitar el listener.
 */
export async function manejarBotonAtras(router: RouterLike): Promise<() => void> {
  const mod = await plugin(() => import("@capacitor/app"));
  if (!mod) return () => {};
  try {
    const handle = await mod.App.addListener("backButton", ({ canGoBack }) => {
      const path = router.state?.location?.pathname ?? window.location.pathname;
      const raiz = path === "/" || path === "";
      if (!raiz && (canGoBack || window.history.length > 1)) router.history.back();
      else void mod.App.exitApp();
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/* Push nativo (OneSignal cordova plugin)                              */
/* ------------------------------------------------------------------ */

interface OneSignalNativo {
  initialize(appId: string): void;
  login(externalId: string): void;
  logout(): void;
  Notifications: {
    requestPermission(fallbackToSettings?: boolean): Promise<boolean>;
    hasPermission?(): boolean;
  };
}

function oneSignalNativo(): OneSignalNativo | null {
  if (!enNavegador()) return null;
  const os = (window as unknown as { plugins?: { OneSignal?: OneSignalNativo } }).plugins
    ?.OneSignal;
  return os ?? null;
}

let pushNativoIniciado = false;

/**
 * Inicializa OneSignal nativo (plugin cordova) y asocia el dispositivo al usuario.
 * No hace nada en web: ahí vive src/lib/push.ts.
 */
export async function iniciarPushNativo(userId?: string | null): Promise<void> {
  if (!esNativo()) return;
  const appId = (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined) || "";
  if (!appId) return;
  try {
    const os = oneSignalNativo();
    if (!os) return;
    if (!pushNativoIniciado) {
      os.initialize(appId);
      pushNativoIniciado = true;
      // Pedimos permiso tras iniciar; en iOS esto muestra el diálogo del sistema.
      void os.Notifications.requestPermission(false).catch(() => {});
    }
    if (userId) os.login(userId);
  } catch {
    /* push nunca bloquea */
  }
}

export function cerrarSesionPushNativo(): void {
  if (!esNativo()) return;
  try {
    oneSignalNativo()?.logout();
  } catch {
    /* ignorar */
  }
}

/* ------------------------------------------------------------------ */
/* Red                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Escucha cambios de conectividad. Llama a `cb(conectado)` de inmediato con el
 * estado actual y luego en cada cambio. Devuelve una función para desuscribirse.
 */
export function escucharRed(cb: (conectado: boolean) => void): () => void {
  if (!enNavegador()) return () => {};
  let cancelado = false;
  let quitarNativo: (() => void) | null = null;

  const onOnline = () => cb(true);
  const onOffline = () => cb(false);
  try {
    cb(typeof navigator.onLine === "boolean" ? navigator.onLine : true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  } catch {
    /* ignorar */
  }

  void plugin(() => import("@capacitor/network")).then(async (mod) => {
    if (!mod || cancelado) return;
    try {
      const estado = await mod.Network.getStatus();
      if (!cancelado) cb(estado.connected);
      const handle = await mod.Network.addListener("networkStatusChange", (s) => cb(s.connected));
      quitarNativo = () => void handle.remove();
      if (cancelado) quitarNativo();
    } catch {
      /* ignorar */
    }
  });

  return () => {
    cancelado = true;
    try {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    } catch {
      /* ignorar */
    }
    quitarNativo?.();
  };
}
