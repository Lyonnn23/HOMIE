import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flame, Phone, Navigation, Clock, MapPin, RefreshCw, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/gas")({
  head: () => ({ meta: [{ title: "Gas cerca de ti — Homie" }, { name: "description", content: "Distribuidoras de gas abiertas cerca de tu ubicación, para pedidos de última hora." }] }),
  component: GasPage,
});

interface Lugar {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  telefono: string | null;
  horario: string | null;
  direccion: string | null;
  marca: string | null;
  distanciaKm: number;
  abierto: boolean | null; // null = no se pudo determinar
}

const SANTIAGO = { lat: -33.4489, lng: -70.6693 };

function GasPage() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState(false);
  const [radio, setRadio] = useState(5000);

  useEffect(() => {
    if (!("geolocation" in navigator)) { setGeoErr(true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeoErr(true),
      { timeout: 8000 },
    );
  }, []);

  const center = pos ?? SANTIAGO;
  const q = useQuery({
    queryKey: ["gas", center.lat.toFixed(3), center.lng.toFixed(3), radio],
    enabled: !!pos || geoErr,
    staleTime: 60 * 60 * 1000, // se refresca cada 1 hora
    refetchInterval: 60 * 60 * 1000,
    queryFn: () => buscarGas(center, radio),
  });

  const lugares = q.data ?? [];
  const abiertos = lugares.filter((l) => l.abierto !== false);

  return (
    <AppShell>
      <header className="px-5 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B00]/15 text-[#C2410C] text-xs font-bold">
          <Flame className="size-3.5" /> Servicio de emergencia
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Gas cerca de ti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Distribuidoras de gas licuado cerca de tu ubicación. Llama directo o pide cómo llegar. Se actualiza cada hora.
        </p>
      </header>

      <div className="px-5 mt-4 flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="size-3.5" />
          {pos ? "Tu ubicación" : geoErr ? "Sin ubicación: mostrando Santiago centro" : "Obteniendo ubicación..."}
        </span>
        <select value={radio} onChange={(e) => setRadio(Number(e.target.value))} className="ml-auto border border-border rounded-lg px-2 py-1 bg-white">
          <option value={2000}>2 km</option>
          <option value={5000}>5 km</option>
          <option value={10000}>10 km</option>
        </select>
        <button onClick={() => q.refetch()} className="p-1.5 rounded-lg border border-border bg-white" aria-label="Actualizar">
          <RefreshCw className={`size-3.5 ${q.isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {q.isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Buscando distribuidoras...</p>}
        {q.isError && (
          <div className="p-4 rounded-2xl bg-[#FEF3C7] text-sm text-[#92400E] flex gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" /> No pudimos cargar el listado. Revisa tu conexión e intenta de nuevo.
          </div>
        )}
        {!q.isLoading && !q.isError && lugares.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No encontramos distribuidoras en este radio. Prueba con 10 km.</p>
        )}
        {abiertos.length > 0 && <h2 className="section-title pt-2">Abiertas o sin horario informado</h2>}
        {abiertos.map((l) => <LugarCard key={l.id} l={l} />)}
        {lugares.some((l) => l.abierto === false) && <h2 className="section-title pt-4">Cerradas ahora</h2>}
        {lugares.filter((l) => l.abierto === false).map((l) => <LugarCard key={l.id} l={l} />)}

        <p className="pt-6 text-[11px] text-muted-foreground">
          Datos de OpenStreetMap. Los horarios pueden variar; confirma por teléfono antes de ir.
          ¿Eres distribuidor y no apareces? <Link to="/registro" search={{ tipo: "prestador" }} className="underline">Súmate a Homie</Link>.
        </p>
      </div>
    </AppShell>
  );
}

function LugarCard({ l }: { l: Lugar }) {
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;
  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{l.nombre}</div>
          <div className="text-xs text-muted-foreground">{l.marca ? `${l.marca} · ` : ""}{l.distanciaKm.toFixed(1)} km{l.direccion ? ` · ${l.direccion}` : ""}</div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          l.abierto === true ? "bg-[#00C28820] text-[#00754F]" : l.abierto === false ? "bg-[#FF3B6B1A] text-[#B3123F]" : "bg-muted text-muted-foreground"
        }`}>
          {l.abierto === true ? "Abierto" : l.abierto === false ? "Cerrado" : "Horario no informado"}
        </span>
      </div>
      {l.horario && <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="size-3.5" />{l.horario}</div>}
      <div className="mt-3 flex gap-2">
        {l.telefono ? (
          <a href={`tel:${l.telefono.replace(/\s/g, "")}`} className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-[#111827] text-white text-sm font-semibold">
            <Phone className="size-4" /> Llamar
          </a>
        ) : (
          <span className="flex-1 inline-flex items-center justify-center h-11 rounded-xl bg-muted text-muted-foreground text-xs">Sin teléfono</span>
        )}
        <a href={maps} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-border text-sm font-semibold">
          <Navigation className="size-4" /> Cómo llegar
        </a>
      </div>
    </div>
  );
}

async function buscarGas(c: { lat: number; lng: number }, radio: number): Promise<Lugar[]> {
  const query = `[out:json][timeout:20];
    (
      node["shop"="gas"](around:${radio},${c.lat},${c.lng});
      way["shop"="gas"](around:${radio},${c.lat},${c.lng});
      node["amenity"="fuel"]["fuel:lpg"="yes"](around:${radio},${c.lat},${c.lng});
      node["name"~"gas|lipigas|abastible|gasco",i]["shop"](around:${radio},${c.lat},${c.lng});
    );
    out center tags;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error("overpass");
  const json = (await res.json()) as { elements: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
  const seen = new Set<string>();
  const out: Lugar[] = [];
  for (const el of json.elements) {
    const lat = el.lat ?? el.center?.lat; const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const t = el.tags ?? {};
    const nombre = t.name ?? t.brand ?? "Distribuidora de gas";
    const key = `${nombre}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) continue; seen.add(key);
    const horario = t.opening_hours ?? null;
    out.push({
      id: `${el.type}-${el.id}`, nombre, lat, lng,
      telefono: t.phone ?? t["contact:phone"] ?? t.mobile ?? null,
      horario,
      direccion: [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ") || null,
      marca: t.brand ?? null,
      distanciaKm: distKm(c.lat, c.lng, lat, lng),
      abierto: abiertoAhora(horario),
    });
  }
  return out.sort((a, b) => a.distanciaKm - b.distanciaKm);
}

function distKm(a: number, b: number, c: number, d: number) {
  const R = 6371, dLat = ((c - a) * Math.PI) / 180, dLng = ((d - b) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a * Math.PI) / 180) * Math.cos((c * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Interpretación simple de opening_hours (OSM): "24/7", "Mo-Fr 09:00-18:00; Sa 09:00-14:00". */
function abiertoAhora(oh: string | null): boolean | null {
  if (!oh) return null;
  if (/24\s*\/\s*7/.test(oh)) return true;
  const dias = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const now = new Date();
  const hoy = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  let decidido: boolean | null = null;
  for (const regla of oh.split(";")) {
    const r = regla.trim();
    const m = r.match(/^(?:([A-Za-z]{2}(?:-[A-Za-z]{2})?(?:,[A-Za-z]{2}(?:-[A-Za-z]{2})?)*)\s+)?(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (!m) continue;
    const [, diasTxt, h1, h2] = m;
    const aplica = !diasTxt || diasTxt.split(",").some((rango) => {
      const [d1, d2] = rango.split("-");
      const i1 = dias.indexOf(d1), i2 = d2 ? dias.indexOf(d2) : i1;
      if (i1 < 0 || i2 < 0) return false;
      return i1 <= i2 ? hoy >= i1 && hoy <= i2 : hoy >= i1 || hoy <= i2;
    });
    if (!aplica) continue;
    const toMin = (s: string) => { const [h, mm] = s.split(":").map(Number); return h * 60 + mm; };
    const a = toMin(h1), b = toMin(h2);
    decidido = a <= b ? mins >= a && mins <= b : mins >= a || mins <= b;
    if (decidido) return true;
  }
  return decidido;
}
