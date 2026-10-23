import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuración de Capacitor para Homie (modo "URL remota").
 *
 * La app nativa NO empaqueta el sitio: el WebView carga la web en vivo (SSR en
 * Cloudflare). `www/index.html` es solo una pantalla de respaldo que se muestra
 * si el servidor remoto no responde.
 *
 * ── Cómo cambiar al dominio final (p. ej. https://app.homie.cl) ──────────────
 * 1. Cambia `URL_PRODUCCION` abajo (o exporta CAP_SERVER_URL antes de `npx cap sync`).
 * 2. Actualiza el host del intent-filter de App Links en
 *    android/app/src/main/AndroidManifest.xml (android:host="...").
 * 3. Actualiza el entitlement Associated Domains en iOS: `applinks:app.homie.cl`.
 * 4. Publica en el nuevo dominio:
 *      /.well-known/assetlinks.json                 (Android)
 *      /.well-known/apple-app-site-association      (iOS)
 * 5. Ejecuta `npx cap sync` y vuelve a compilar ambas apps.
 * Ver docs/MOBILE.md para el paso a paso completo.
 */
const URL_PRODUCCION = "https://task-match-me.lovable.app";

const config: CapacitorConfig = {
  appId: "cl.homie.app",
  appName: "Homie",
  webDir: "www",
  server: {
    url: process.env.CAP_SERVER_URL ?? URL_PRODUCCION,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#111827",
      launchAutoHide: true,
      launchShowDuration: 1500,
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#111827",
      overlaysWebView: false,
    },
    // @capacitor/keyboard no está instalado aún; si se agrega, esta config aplica
    // (resize "native" mantiene la vista y deja que el sistema mueva el contenido).
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
