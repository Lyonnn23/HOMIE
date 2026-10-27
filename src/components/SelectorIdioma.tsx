import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { IDIOMAS, useT, type Idioma } from "@/i18n";
import { Bandera } from "./Bandera";

/** Selector de idioma con banderas. `compacto` muestra solo la bandera (header). */
export function SelectorIdioma({ compacto = false, className = "" }: { compacto?: boolean; className?: string }) {
  const { idioma, setIdioma, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function elegir(i: Idioma) {
    // I18nProvider persists the choice locally; usuarios.idioma is not deployed.
    setIdioma(i); setOpen(false);
  }
  const actual = IDIOMAS.find((x) => x.id === idioma);
  if (!actual) return null;

  if (!compacto) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className}`} role="radiogroup" aria-label={t("idioma.titulo")}>
        {IDIOMAS.map((i) => {
          const on = i.id === idioma;
          return (
            <button key={i.id} type="button" role="radio" aria-checked={on} onClick={() => elegir(i.id)}
              className={`flex items-center gap-2 p-3 rounded-2xl border text-left text-sm transition ${on ? "border-[#EF9F27] bg-[#EF9F27]/10 font-semibold" : "border-[#E5E7EB] bg-white"}`}>
              <Bandera idioma={i.id} size={24} />
              <span className="min-w-0"><span className="block leading-tight">{i.nativo}</span></span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t("idioma.titulo")}: ${actual.nativo}`}
        className="inline-flex items-center gap-1 h-9 px-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
        <Bandera idioma={idioma} size={20} />
        <ChevronDown className="size-3.5 opacity-80" />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#E5E7EB] shadow-lg overflow-hidden z-50 text-[#111827]">
          {IDIOMAS.map((i) => (
            <li key={i.id} role="option" aria-selected={i.id === idioma}>
              <button type="button" onClick={() => elegir(i.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-[#F5F5F0] ${i.id === idioma ? "font-semibold" : ""}`}>
                <Bandera idioma={i.id} size={22} /> {i.nativo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
