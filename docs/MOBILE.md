# Homie en Android e iOS (Capacitor)

Esta guía explica, paso a paso y sin asumir conocimientos de programación, cómo
convertir Homie en una app para Google Play y App Store.

## ¿Cómo funciona?

La app nativa es una "cáscara" (shell) que abre la web de Homie dentro de un
WebView. **No empaqueta el sitio**: siempre carga la versión en vivo que está
publicada en Cloudflare/Lovable. Ventajas:

- Cada vez que publicas la web, la app se actualiza sola, sin pasar por las tiendas.
- Solo hay que volver a subir la app a las tiendas cuando cambie algo nativo
  (permisos, plugins, ícono, dominio).

Lo nativo (cámara, ubicación, vibración, compartir, push, botón atrás) está en
`src/lib/nativo.ts` y funciona igual en la web normal (usa las APIs del navegador
cuando no está dentro de la app).

---

## 1. Requisitos

### Para Android (Windows, Mac o Linux)

| Qué                                | Dónde                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| Node.js 20 o superior              | https://nodejs.org (versión LTS)                              |
| Java 17 (JDK)                      | https://adoptium.net (Temurin 17)                             |
| Android Studio (incluye SDK)       | https://developer.android.com/studio                          |
| Cuenta Google Play Console (USD 25 única vez) | https://play.google.com/console                    |

Después de instalar Android Studio: abre **More Actions → SDK Manager** y
asegúrate de tener instalado **Android 14 (API 34)** y **Android SDK Build-Tools**.

### Para iOS

| Opción A: con Mac                          | Opción B: sin Mac                               |
| ------------------------------------------ | ----------------------------------------------- |
| Mac con Xcode 15+ (App Store, gratis)      | Codemagic (https://codemagic.io) compila en la nube |
| CocoaPods: `sudo gem install cocoapods`    | Ver sección 9                                   |
| Cuenta Apple Developer (USD 99/año)        | Cuenta Apple Developer (USD 99/año)             |

---

## 2. Comandos básicos

Abre una terminal **dentro de la carpeta del proyecto** y ejecuta en orden:

```bash
npm install            # instala dependencias (solo la primera vez o si cambian)
npm run build          # compila la web (verifica que todo esté bien)
npx cap sync           # copia la configuración y plugins a android/ e ios/
npx cap open android   # abre el proyecto en Android Studio
npx cap open ios       # (solo Mac) abre el proyecto en Xcode
```

Atajos equivalentes: `npm run cap:sync`, `npm run cap:android`, `npm run cap:ios`.

> `npx cap sync` hay que ejecutarlo cada vez que cambies `capacitor.config.ts`
> o instales/quites un plugin `@capacitor/*`.

Para probar en un teléfono Android conectado por USB: activa "Depuración USB"
en el teléfono (Ajustes → Opciones de desarrollador), y en Android Studio pulsa
el botón **Run ▶** con tu dispositivo seleccionado.

---

## 3. Variables de entorno

Estas variables se configuran en el panel de Lovable/Cloudflare (son de la web,
no de la app nativa):

| Variable                | Para qué                                              |
| ----------------------- | ----------------------------------------------------- |
| `VITE_ONESIGNAL_APP_ID` | Push (web y nativo). Lo entrega OneSignal.            |
| `VITE_SENTRY_DSN`       | Reporte de errores. Lo entrega Sentry. Si está vacío, no se activa. |
| `VITE_APP_VERSION`      | Opcional, p. ej. `1.0.0`, para distinguir versiones en Sentry. |

Solo para generar la app apuntando a otro servidor (p. ej. pruebas):

```bash
CAP_SERVER_URL=https://staging.homie.cl npx cap sync
```

---

## 4. Generar el AAB firmado para Google Play

1. `npx cap open android`.
2. En Android Studio: **Build → Generate Signed Bundle / APK…**
3. Elige **Android App Bundle** → Next.
4. En *Key store path* pulsa **Create new…**:
   - Guarda el archivo (p. ej. `homie-release.jks`) **fuera del proyecto** y
     haz copia de seguridad: **si lo pierdes no podrás actualizar la app nunca más**.
   - Anota la contraseña del keystore y la del alias (usa `homie`).
   - Validez: 25+ años. Rellena nombre/organización.
5. Next → Build variant **release** → Create.
6. El archivo queda en `android/app/release/app-release.aab`.
7. En Play Console: **Crear app** → nombre "Homie", categoría *Estilo de vida*,
   idioma es-CL. Completa: ficha de la tienda (ícono 512×512, capturas,
   descripción), política de privacidad (`https://task-match-me.lovable.app/privacidad`),
   cuestionario de seguridad de datos, clasificación de contenido.
8. **Producción → Crear nueva versión → subir el .aab** → revisar → publicar.
   La primera revisión de Google puede tardar 1–7 días.

> Recomendación: activa **Play App Signing** (viene marcado por defecto). Google
> guarda la clave de firma final; tu `.jks` es la "clave de subida".

---

## 5. Obtener el SHA-256 para `assetlinks.json` (deep links Android)

Para que los enlaces `https://task-match-me.lovable.app/...` abran la app en vez
del navegador, Android verifica el archivo `public/.well-known/assetlinks.json`.

**Si usas Play App Signing (lo normal):**

1. Play Console → tu app → **Configuración → Integridad de la app → Firma de apps**.
2. Copia la **huella digital del certificado SHA-256** de "Certificado de clave de firma de la app".
3. Pégala en `public/.well-known/assetlinks.json` reemplazando el texto
   `REEMPLAZAR_CON_EL_SHA256...`. Puedes poner varias huellas (clave de subida y
   de firma) separadas por comas.
4. Publica la web. Verifica en:
   `https://task-match-me.lovable.app/.well-known/assetlinks.json`

**Para la clave local (pruebas/debug):**

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

Comprobar que Android acepta el enlace:

```bash
adb shell pm get-app-links cl.homie.app
```

---

## 6. Push nativo con OneSignal

Homie ya usa OneSignal en la web. La misma cuenta/App ID sirve para las apps;
solo hay que conectar Android (Firebase) e iOS (APNs) dentro de OneSignal.

### Android (Firebase Cloud Messaging)

1. Entra a https://console.firebase.google.com → **Agregar proyecto** → "Homie".
2. Agrega una app Android con el paquete **`cl.homie.app`**.
3. Descarga `google-services.json` y cópialo en **`android/app/google-services.json`**
   (el proyecto lo detecta automáticamente; no se sube a git).
4. En Firebase: **Configuración del proyecto → Cuentas de servicio → Generar nueva
   clave privada** (descarga un JSON).
5. En OneSignal: **Settings → Platforms → Google Android (FCM)** → sube ese JSON.
6. `npx cap sync` y vuelve a compilar la app.

### iOS (APNs)

1. En https://developer.apple.com → **Certificates, IDs & Profiles → Keys → +**:
   marca *Apple Push Notifications service (APNs)* → descarga el archivo `.p8`
   (solo se puede descargar una vez; guárdalo). Anota **Key ID** y **Team ID**.
2. En **Identifiers** crea/edita el App ID `cl.homie.app` y activa
   *Push Notifications* y *Associated Domains*.
3. En OneSignal: **Settings → Platforms → Apple iOS (APNs)** → sube el `.p8`,
   Key ID, Team ID y el Bundle ID `cl.homie.app`.
4. En Xcode: target **App → Signing & Capabilities → + Capability**:
   - **Push Notifications**
   - **Background Modes → Remote notifications** (ya está en `Info.plist`)
   - **Associated Domains** con el valor: `applinks:task-match-me.lovable.app`

### Verificar

En la app, inicia sesión: `src/lib/nativo.ts` llama a `OneSignal.initialize` y
`OneSignal.login(userId)`. En OneSignal → **Audience → Subscriptions** debería
aparecer el dispositivo con el *External ID* del usuario. Envía un push de prueba
desde **Messages → New Push**.

---

## 7. Deep links en iOS (Universal Links)

1. El archivo `public/.well-known/apple-app-site-association` ya existe. Edítalo y
   reemplaza **`TEAMID`** por tu Team ID de Apple (10 caracteres, lo ves en
   https://developer.apple.com/account → *Membership details*).
2. Debe servirse **sin extensión** y con `Content-Type: application/json`. El
   archivo `public/_headers` ya lo indica para Cloudflare. Comprueba con:
   ```bash
   curl -I https://task-match-me.lovable.app/.well-known/apple-app-site-association
   ```
   Debe responder `200` y `content-type: application/json`. Si Lovable/Cloudflare
   lo sirve como `application/octet-stream` o `text/html`, pide soporte para forzar
   el tipo JSON en esa ruta (o añade una regla de *Transform Rules → Response
   Headers* en el panel de Cloudflare).
3. En Xcode añade el entitlement **Associated Domains**: `applinks:task-match-me.lovable.app`.

---

## 8. Cambiar el dominio (p. ej. a `app.homie.cl`)

1. `capacitor.config.ts`: cambia `URL_PRODUCCION`.
2. `www/index.html`: cambia `URL_APP` (pantalla de respaldo).
3. `android/app/src/main/AndroidManifest.xml`: cambia `android:host="..."`.
4. Xcode → Associated Domains: `applinks:app.homie.cl`.
5. Publica en el nuevo dominio `/.well-known/assetlinks.json` y
   `/.well-known/apple-app-site-association` (ya están en `public/`).
6. `npx cap sync`, recompila y sube nuevas versiones a ambas tiendas.

> Importante: la URL remota debe ser **https** y servir el sitio completo. En
> Supabase → Authentication → URL Configuration agrega el nuevo dominio a
> *Redirect URLs* para que el login siga funcionando.

---

## 9. App iOS sin Mac: Codemagic

1. Sube el proyecto a GitHub (incluye las carpetas `ios/` y `android/`).
2. Crea cuenta en https://codemagic.io y conecta el repositorio
   (plan gratuito: 500 min/mes de build).
3. En Codemagic → **Teams → Integrations → App Store Connect**: crea una API key
   en https://appstoreconnect.apple.com/access/integrations/api (rol *App Manager*)
   y súbela (Issuer ID, Key ID, archivo `.p8`).
4. Crea el archivo `codemagic.yaml` en la raíz del proyecto:

```yaml
workflows:
  ios-release:
    name: Homie iOS
    instance_type: mac_mini_m2
    environment:
      node: 20
      xcode: latest
      cocoapods: default
      ios_signing:
        distribution_type: app_store
        bundle_identifier: cl.homie.app
      groups:
        - app_store_credentials   # Issuer ID, Key ID y .p8 creados en el paso 3
    scripts:
      - name: Instalar dependencias
        script: npm ci
      - name: Build web + sync
        script: |
          npm run build
          npx cap sync ios
      - name: Pods
        script: cd ios/App && pod install
      - name: Firmar y compilar
        script: |
          xcode-project use-profiles
          xcode-project build-ipa --workspace ios/App/App.xcworkspace --scheme App
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
```

5. En Codemagic activa **Automatic code signing** (crea certificados y perfiles
   por ti usando la API key de Apple).
6. Pulsa **Start new build**. Al terminar, la app aparece en **TestFlight**;
   instálala en tu iPhone desde la app TestFlight para probar.
7. Para publicar: App Store Connect → tu app → **+ Versión** → selecciona el build
   de TestFlight, completa ficha (capturas 6.7" y 6.5", descripción, privacidad)
   → **Enviar a revisión**.

> Alternativa: alquilar un Mac en la nube por horas (MacStadium, MacInCloud) y
> seguir los pasos de Xcode normalmente.

---

## 10. Reporte de errores (Sentry)

1. Crea cuenta en https://sentry.io → nuevo proyecto **React**.
2. Copia el **DSN** y configúralo como `VITE_SENTRY_DSN` en Lovable/Cloudflare.
3. Nada más: `src/lib/monitoreo.ts` se activa solo en el navegador cuando hay DSN.
   Los errores de la app nativa llegan con la etiqueta `plataforma: android|ios`.

---

## 11. Lista de pruebas en teléfono real (antes de publicar)

Prueba en al menos un Android (gama media) y un iPhone. Marca cada punto:

1. [ ] **Arranque**: splash oscuro (#111827) → la web carga en < 3 s con buena red.
2. [ ] **Sin internet al abrir**: aparece la pantalla de respaldo "Conectando con Homie…" y el botón *Reintentar* funciona al recuperar la red.
3. [ ] **Banner offline**: con la app abierta, activa modo avión → aparece "Sin conexión. Reintentando…"; al desactivarlo desaparece y los datos se refrescan.
4. [ ] **Teclado**: en login, registro, chat y "Solicitar", el campo enfocado nunca queda tapado por el teclado; el botón de enviar sigue visible o accesible con scroll.
5. [ ] **Safe areas**: nada queda debajo del notch/isla dinámica ni de la barra de gestos (barra inferior, botón "Pagar", banners).
6. [ ] **Barra de estado**: texto claro sobre fondo oscuro; no se superpone con el encabezado.
7. [ ] **Botón atrás (Android)**: desde cualquier pantalla vuelve a la anterior; en la portada, cierra/minimiza la app (no queda pantalla en blanco).
8. [ ] **Login y sesión**: inicia sesión, cierra la app por completo, vuelve a abrir → sigue conectado.
9. [ ] **Recuperar contraseña**: el enlace del correo abre la app (deep link) y permite cambiar la clave.
10. [ ] **Pago Mercado Pago ida y vuelta**: reservar → se abre Mercado Pago → pagar (modo sandbox) → vuelve a Homie en la pantalla de comprobante. Probar también *cancelar* el pago y volver.
11. [ ] **Doble tap**: pulsar rápido dos veces "Pagar" o "Publicar solicitud" crea **una sola** reserva/solicitud.
12. [ ] **Cámara**: adjuntar foto en "Solicitar" y en el chat: se pide permiso la primera vez, la foto se sube y se ve. Probar también "Elegir de la galería" y denegar el permiso (no debe romper nada).
13. [ ] **Ubicación**: en Buscar, "Usar mi ubicación" pide permiso y centra el mapa; denegar muestra un mensaje amable.
14. [ ] **Push**: tras iniciar sesión, el dispositivo aparece en OneSignal; un push de prueba llega con la app cerrada, en segundo plano y abierta; al tocarlo abre la pantalla correcta.
15. [ ] **Deep links**: tocar `https://task-match-me.lovable.app/prestador/...` desde WhatsApp abre la app directamente (Android: *App Links verificados*; iOS: *Universal Links*).
16. [ ] **Compartir**: "Compartir perfil"/"Invitar" abre la hoja nativa de compartir.
17. [ ] **Vibración**: feedback háptico al confirmar acciones (y no molesta en exceso).
18. [ ] **Red lenta (3G)**: con el simulador de red del teléfono o Chrome DevTools remoto en 3G: la app muestra estados de carga, no pantallas en blanco, y no duplica envíos.
19. [ ] **Rotación y multitarea**: rotar la pantalla y volver de otra app no pierde el formulario que se estaba llenando.
20. [ ] **Enlaces externos**: términos, privacidad, WhatsApp y Mercado Pago abren correctamente; al volver, la app sigue donde estaba.
21. [ ] **Cerrar sesión**: el dispositivo deja de recibir push de ese usuario (OneSignal logout).
22. [ ] **Accesibilidad**: tamaño de fuente grande del sistema no rompe el diseño; lector de pantalla (TalkBack/VoiceOver) lee los botones principales.

---

## 12. Problemas frecuentes

| Síntoma                                     | Solución                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| Pantalla blanca al abrir                     | Revisa que la URL de `capacitor.config.ts` sea https y responda; `npx cap sync`. |
| "cleartext not permitted"                    | La URL debe ser https (`cleartext: false` es intencional).               |
| Push no llega en Android                     | Falta `android/app/google-services.json` o el JSON de cuenta de servicio en OneSignal. |
| Push no llega en iOS                         | Falta capability *Push Notifications* o la key APNs en OneSignal. Probar en dispositivo real (no simulador). |
| Deep link abre el navegador                  | SHA-256 incorrecto en `assetlinks.json` / `TEAMID` sin reemplazar en AASA / archivo no servido como JSON. |
| Gradle falla por versión de Java             | Usa Java 17: en Android Studio → Settings → Build Tools → Gradle → *Gradle JDK* = 17. |
| Xcode: "No signing certificate"              | Inicia sesión con tu Apple ID en Xcode → Settings → Accounts y marca *Automatically manage signing*. |
