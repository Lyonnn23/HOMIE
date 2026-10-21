import { Link } from "@tanstack/react-router";
import { Zap, ChevronRight } from "lucide-react";

/**
 * Banner "Homie Ya": urgencias estilo Uber. Lleva a /ya.
 * Coral sobre pizarra oscura para que destaque sobre cualquier fondo.
 */
export function HomieYaBanner({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/ya"
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-[#111827] p-4 text-white ring-2 ring-[#FF3B6B] transition hover:bg-[#1F2937] ${className}`}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FF3B6B]">
        <span className="absolute inset-0 rounded-xl bg-[#FF3B6B] opacity-60 animate-ping" />
        <Zap className="relative size-5 fill-white text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase tracking-wide text-[#FF3B6B]">¿Es urgente?</div>
        <div className="truncate text-sm font-bold">Homie Ya — un profesional disponible acepta en minutos</div>
        <div className="text-[11px] text-white/60">Cerrajero, fuga de agua, luz, gas, auto, enfermera, vet, limpieza</div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-white/60 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
