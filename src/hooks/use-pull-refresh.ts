import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const UMBRAL = 70; // px
const MAX = 110;

interface Opciones {
  /** Claves a invalidar; sin esto se invalida todo. */
  queryKey?: readonly unknown[];
  /** Acción personalizada; por defecto invalidateQueries. */
  onRefresh?: () => Promise<unknown> | unknown;
  /** Desactivar (por ejemplo en escritorio). */
  disabled?: boolean;
}

/**
 * Pull-to-refresh con eventos touch. Solo actúa cuando la página está en el
 * tope (scrollY === 0) y el gesto es vertical hacia abajo.
 * Devuelve `distancia` (px de arrastre, para dibujar el indicador) y `refrescando`.
 */
export function usePullRefresh({ queryKey, onRefresh, disabled }: Opciones = {}) {
  const qc = useQueryClient();
  const [distancia, setDistancia] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const inicioY = useRef<number | null>(null);
  const activo = useRef(false);
  const refrescandoRef = useRef(false);
  const distanciaRef = useRef(0);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;
    // Solo en pantallas táctiles.
    let esTactil = false;
    try { esTactil = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window; } catch { /* no-op */ }
    if (!esTactil) return;

    const onStart = (e: TouchEvent) => {
      if (refrescandoRef.current) return;
      if (window.scrollY > 0) { inicioY.current = null; return; }
      inicioY.current = e.touches[0]?.clientY ?? null;
      activo.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (inicioY.current === null || refrescandoRef.current) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = y - inicioY.current;
      if (delta <= 0 || window.scrollY > 0) {
        if (activo.current) { activo.current = false; distanciaRef.current = 0; setDistancia(0); }
        return;
      }
      activo.current = true;
      // Resistencia: el indicador se mueve más lento que el dedo.
      const d = Math.min(MAX, delta * 0.5);
      distanciaRef.current = d;
      setDistancia(d);
    };
    const onEnd = () => {
      if (inicioY.current === null) return;
      inicioY.current = null;
      if (!activo.current) return;
      activo.current = false;
      const d = distanciaRef.current;
      distanciaRef.current = 0;
      if (d >= UMBRAL && !refrescandoRef.current) {
        refrescandoRef.current = true;
        setRefrescando(true);
        setDistancia(UMBRAL * 0.8);
        void Promise.resolve(onRefresh ? onRefresh() : qc.invalidateQueries(queryKey ? { queryKey } : undefined))
          .catch(() => {})
          .finally(() => {
            refrescandoRef.current = false;
            setRefrescando(false);
            setDistancia(0);
          });
      } else {
        setDistancia(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, qc, onRefresh, JSON.stringify(queryKey ?? null)]);

  return { distancia, refrescando, listo: distancia >= UMBRAL };
}
