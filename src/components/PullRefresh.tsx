import { Loader2, ArrowDown } from "lucide-react";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

interface Props {
  /** Claves a invalidar al soltar; sin esto se invalida todo. */
  queryKey?: readonly unknown[];
  onRefresh?: () => Promise<unknown> | unknown;
}

/**
 * Indicador de "desliza para actualizar". Colócalo al inicio del contenido
 * de la pantalla; solo se activa en pantallas táctiles.
 */
export function PullRefresh({ queryKey, onRefresh }: Props) {
  const { distancia, refrescando, listo } = usePullRefresh({ queryKey, onRefresh });
  const visible = distancia > 0 || refrescando;
  if (!visible) return null;
  return (
    <div
      aria-live="polite"
      className="flex items-center justify-center overflow-hidden text-[#6B7280] transition-[height] duration-150"
      style={{ height: refrescando ? 44 : Math.min(distancia, 60) }}
    >
      <span className="inline-flex items-center gap-2 text-xs font-medium">
        {refrescando ? (
          <><Loader2 className="size-4 animate-spin" /> Actualizando…</>
        ) : (
          <>
            <ArrowDown className={`size-4 transition-transform ${listo ? "rotate-180" : ""}`} />
            {listo ? "Suelta para actualizar" : "Desliza para actualizar"}
          </>
        )}
      </span>
    </div>
  );
}
