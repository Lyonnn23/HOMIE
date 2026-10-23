import { Monitor, Moon, Sun } from "lucide-react";
import { OPCIONES_TEMA, useTema, type Tema } from "@/hooks/use-tema";

const ICONOS: Record<Tema, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

/** Segmentado "Sistema / Claro / Oscuro" para cambiar la apariencia. */
export function SelectorTema({ className = "" }: { className?: string }) {
  const { tema, setTema } = useTema();
  return (
    <div role="radiogroup" aria-label="Apariencia" className={`inline-grid grid-cols-3 w-full rounded-xl bg-[#F3F4F6] p-1 ${className}`}>
      {OPCIONES_TEMA.map(({ valor, label }) => {
        const Icon = ICONOS[valor];
        const activo = tema === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => setTema(valor)}
            className={`h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activo ? "bg-background text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" /> {label}
          </button>
        );
      })}
    </div>
  );
}
