# Analítica de producto (PostHog)

Homie usa [PostHog](https://posthog.com) para medir el embudo de uso. Todo el código vive en
`src/lib/analitica.ts` y es **no-op** cuando no hay clave configurada, así que la app funciona
igual sin analítica.

## Configuración

1. Crea un proyecto en PostHog (plan gratuito: 1M eventos/mes).
2. En *Settings → Project → Project API key* copia la clave (`phc_...`).
3. Define las variables de entorno (en `.env` local y en el hosting):

```
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com   # opcional; usa https://eu.i.posthog.com si el proyecto está en la UE
```

Privacidad: no se envía PII (solo el `user_id` de Supabase y el tipo de cuenta), no hay
autocapture ni grabación de sesión, se respeta *Do Not Track* y la persistencia es
`localStorage+cookie`.

## Integración

- `src/router.tsx`: `iniciarAnalitica()` en el navegador y una vista de página (`$pageview`)
  por cada navegación resuelta.
- `src/hooks/use-auth.tsx`: `identificar(userId, { tipo })` al conocer el usuario y
  `resetAnalitica()` al cerrar sesión.

## Eventos

| Evento | Dónde se dispara | Propiedades |
| --- | --- | --- |
| `$pageview` | `src/router.tsx` (cada navegación) | `path` |
| `sesion_iniciada` | `src/routes/_authenticated.tsx` (una vez por sesión del navegador) | `tipo` |
| `reserva_creada` | `src/store/bookings.ts` → `useAddBooking` | `reserva_id`, `servicio_id`, `total`, `modalidad`, `con_cupon` |
| `solicitud_publicada` | `src/routes/_authenticated.solicitar.tsx` | `solicitud_id`, `categoria_id`, `urgente`, `fotos`, `con_presupuesto` |
| `cotizacion_enviada` | `src/routes/_authenticated.cotizar.tsx` | `solicitud_id`, `precio`, `precio_hasta` |
| `mensaje_enviado` | `src/routes/_authenticated.chat.$reservaId.tsx` (solo texto) | `reserva_id`, `rapido` |
| `resena_enviada` | `src/components/ReviewModal.tsx` | `reserva_id`, `calificacion`, `con_comentario`, `con_foto` |
| `premium_trial_activado` | `src/routes/_authenticated.pro.tsx` | `hasta` |
| `premium_pago_iniciado` | `src/routes/_authenticated.pro.tsx` | `plan` |

Pendientes (pantallas en traducción, agregar después): `registro_completado` (`/registro`),
`pago_iniciado` (reservar y reservas, al llamar `createPaymentPreference`), `urgencia_pedida` (`/ya`).

## Agregar un evento

```ts
import { evento } from "@/lib/analitica";
evento("nombre_en_snake_case", { propiedad: valor });
```

Usa nombres en español en `snake_case`, pasado (`reserva_creada`), y nunca incluyas nombres,
correos, teléfonos ni direcciones en las propiedades.
