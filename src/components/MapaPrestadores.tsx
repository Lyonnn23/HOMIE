import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { formatCLP, getCategory, type CategoryId } from "@/data/services";

export interface MapaItem {
  id: string;
  name: string;
  categoryId: CategoryId;
  lat: number | null;
  lng: number | null;
  rating: number;
  pricePerHour: number;
  disponibleAhora: boolean;
  matchedService?: string | null;
}

const SANTIAGO: [number, number] = [-33.4489, -70.6693];

/**
 * Mapa con los prestadores (Leaflet + OpenStreetMap, sin API key).
 * Solo se renderiza en el cliente; Leaflet se importa de forma diferida.
 */
export function MapaPrestadores({ items, className = "" }: { items: MapaItem[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // CSS de Leaflet desde CDN (evita configurar el bundler)
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (cancelled || !ref.current || mapRef.current) return;
      const map = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView(SANTIAGO, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            L.circleMarker(here, { radius: 8, color: "#fff", weight: 2, fillColor: "#2563EB", fillOpacity: 1 })
              .addTo(map)
              .bindTooltip("Estás aquí");
            map.setView(here, 13);
          },
          () => {},
          { enableHighAccuracy: false, timeout: 5000 },
        );
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const layer = layerRef.current;
      const map = mapRef.current;
      if (!layer || !map) return;
      layer.clearLayers();
      const pts: [number, number][] = [];
      for (const it of items) {
        if (it.lat == null || it.lng == null) continue;
        const cat = getCategory(it.categoryId);
        const color = it.disponibleAhora ? (cat?.bg ?? "#EF9F27") : "#9CA3AF";
        const icon = L.divIcon({
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
                   <span style="transform:rotate(45deg);color:#fff;font:700 11px Inter,sans-serif">${it.rating.toFixed(1)}</span>
                 </div>`,
        });
        const m = L.marker([it.lat, it.lng], { icon }).addTo(layer);
        m.bindPopup(
          `<div style="font:14px Inter,sans-serif;min-width:160px">
             <b>${escapeHtml(it.name)}</b><br/>
             <span style="color:#6B7280;font-size:12px">${escapeHtml(it.matchedService ?? cat?.name ?? "")}</span><br/>
             <span style="font-weight:700">${formatCLP(it.pricePerHour)}</span>
             <span style="font-size:11px;color:${it.disponibleAhora ? "#00754F" : "#B3123F"}"> · ${it.disponibleAhora ? "Disponible" : "Ocupado"}</span><br/>
             <button data-id="${it.id}" style="margin-top:8px;padding:8px 12px;border-radius:10px;background:#111827;color:#fff;border:0;font-weight:600;cursor:pointer">Ver perfil</button>
           </div>`,
        );
        m.on("popupopen", (e) => {
          const el = (e.popup.getElement() as HTMLElement | null)?.querySelector<HTMLButtonElement>("button[data-id]");
          el?.addEventListener("click", () => navigate({ to: "/prestador/$id", params: { id: it.id }, search: { service: it.matchedService ?? undefined } }));
        });
        pts.push([it.lat, it.lng]);
      }
      if (pts.length > 0) map.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 14 });
    })();
  }, [items, navigate]);

  const sinUbicacion = items.filter((i) => i.lat == null || i.lng == null).length;

  return (
    <div className={className}>
      <div ref={ref} className="h-[420px] w-full rounded-2xl overflow-hidden border border-border bg-muted" />
      {sinUbicacion > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {sinUbicacion} profesional{sinUbicacion === 1 ? "" : "es"} sin ubicación publicada no aparece{sinUbicacion === 1 ? "" : "n"} en el mapa.
        </p>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
