import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, RefreshCw } from "lucide-react";
import { escucharRed } from "@/lib/nativo";

/**
 * Banner fijo superior que aparece cuando no hay conexión.
 * Se monta en AppShell (lo hace otro cambio); aquí solo se exporta.
 */
export default function OfflineBanner() {
  const queryClient = useQueryClient();
  const [conectado, setConectado] = useState(true);
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => escucharRed(setConectado), []);

  // Al recuperar conexión, refresca lo que haya quedado con error/obsoleto.
  useEffect(() => {
    if (conectado) void queryClient.refetchQueries({ type: "active" }).catch(() => {});
  }, [conectado, queryClient]);

  async function reintentar() {
    setReintentando(true);
    try {
      await queryClient.refetchQueries();
      if (typeof navigator !== "undefined" && navigator.onLine) setConectado(true);
    } catch {
      /* seguimos offline */
    } finally {
      setReintentando(false);
    }
  }

  if (conectado) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between gap-3 bg-[#111827] px-4 py-2.5 text-sm text-white shadow-md"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.625rem)" }}
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="size-4 shrink-0 text-[#EF9F27]" aria-hidden />
        <span>Sin conexión. Reintentando…</span>
      </span>
      <button
        type="button"
        onClick={reintentar}
        disabled={reintentando}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-60"
      >
        <RefreshCw className={`size-3.5 ${reintentando ? "animate-spin" : ""}`} aria-hidden />
        Reintentar
      </button>
    </div>
  );
}

export { OfflineBanner };
