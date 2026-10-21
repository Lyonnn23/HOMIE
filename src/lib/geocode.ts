/**
 * Geocodificación con Nominatim (OpenStreetMap) + utilidades de distancia.
 * Uso responsable: 1 request por acción de usuario, sin bucles.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends GeoPoint {
  display: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 6000;

/**
 * Convierte una dirección (opcionalmente con comuna) a coordenadas.
 * Devuelve null si no se encuentra, si falla la red o si pasa el timeout.
 */
export async function geocodificar(direccion: string, comuna?: string): Promise<GeocodeResult | null> {
  const partes = [direccion?.trim(), comuna?.trim(), "Chile"].filter((x) => !!x);
  const q = partes.join(", ");
  if (!direccion?.trim() && !comuna?.trim()) return null;
  if (typeof fetch !== "function") return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${NOMINATIM}?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "Accept-Language": "es" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = data?.[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, display: first.display_name ?? q };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Distancia en km entre dos puntos (fórmula de haversine). */
export function distanciaKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
