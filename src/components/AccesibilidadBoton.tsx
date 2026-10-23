import { useEffect, useRef, useState } from "react";
import { Accessibility, Square, Volume2, X } from "lucide-react";
import { useAccesibilidad } from "@/hooks/use-accesibilidad";
import { SelectorTema } from "./SelectorTema";

export function AccesibilidadBoton() {
  const [open, setOpen] = useState(false);
  const { modoFacil, lecturaVoz, setModoFacil, setLecturaVoz, hablar, detener, vozSoportada } = useAccesibilidad();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Escape cierra y devuelve el foco al botón
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    // Enfocar el primer control del panel
    const first = panelRef.current?.querySelector<HTMLElement>("button, [tabindex]");
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const leerPantalla = () => {
    try {
      const texto = document.querySelector("main")?.innerText ?? "";
      hablar(texto);
    } catch {
      /* no-op */
    }
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar opciones de accesibilidad"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="accesibilidad-titulo"
          className="fixed right-4 left-4 bottom-[calc(10rem+env(safe-area-inset-bottom,0px))] sm:left-auto sm:w-[360px] z-50 rounded-2xl bg-white border border-border shadow-xl p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="accesibilidad-titulo" className="font-bold text-base text-[#111827]">
              Accesibilidad
            </h2>
            <button
              type="button"
              onClick={() => { setOpen(false); triggerRef.current?.focus(); }}
              aria-label="Cerrar"
              className="size-9 rounded-full flex items-center justify-center hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="p-3 rounded-2xl border border-border bg-white">
              <span className="block font-semibold text-sm text-[#111827]">Apariencia</span>
              <span className="block text-xs text-muted-foreground">Sistema, claro u oscuro</span>
              <SelectorTema className="mt-2" />
            </div>
            <ToggleRow
              label="Modo fácil"
              hint="Letras grandes, más contraste"
              checked={modoFacil}
              onChange={setModoFacil}
            />
            <ToggleRow
              label="Leer en voz alta"
              hint={vozSoportada ? "Escucha el contenido de la pantalla" : "No disponible en este navegador"}
              checked={lecturaVoz}
              disabled={!vozSoportada}
              onChange={setLecturaVoz}
            />
          </div>

          {lecturaVoz && vozSoportada && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={leerPantalla}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold text-sm"
              >
                <Volume2 className="size-4" /> Leer esta pantalla
              </button>
              <button
                type="button"
                onClick={detener}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-border font-semibold text-sm"
              >
                <Square className="size-4" /> Detener
              </button>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Pensado para adultos mayores y personas con discapacidad visual o auditiva. Todo el contenido también
            está disponible en texto.
          </p>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Opciones de accesibilidad"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="fixed right-4 z-50 size-14 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] rounded-full bg-[#111827] text-white border-2 border-[#EF9F27] shadow-lg flex items-center justify-center hover:bg-[#1F2937]"
      >
        <Accessibility className="size-7" aria-hidden="true" />
      </button>
    </>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-white text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block font-semibold text-sm text-[#111827]">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`shrink-0 relative w-12 h-7 rounded-full transition-colors ${checked ? "bg-[#EF9F27]" : "bg-[#D1D5DB]"}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${checked ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}
