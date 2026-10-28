import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { IDIOMAS, useT, type Idioma } from "@/i18n";
import { Bandera } from "./Bandera";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Selector de idioma con banderas. `compacto` muestra solo la bandera (header). */
export function SelectorIdioma({ compacto = false, className = "" }: { compacto?: boolean; className?: string }) {
  const { idioma, setIdioma, t } = useT();
  const { usuario } = useAuth();
  const guardado = useRef<Promise<void>>(Promise.resolve());
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
    setIdioma(i); setOpen(false);
    if (!usuario?.id) return;
    const usuarioId = usuario.id;
    // Serialize rapid selections so the last choice is the persisted preference.
    guardado.current = guardado.current.catch(() => {}).then(async () => {
      const { data, error } = await supabase.from("usuarios").update({ idioma: i }).eq("id", usuarioId).select("id");
      if (error || !data?.length) toast.error("No se pudo guardar el idioma en tu cuenta.");
    });
  }
  const actual = IDIOMAS.find((x) => x.id === idioma);
  if (!actual) return null;

  if (!compacto) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className}`} role="radiogroup" aria-label={t("idioma.titulo")}>
        {IDIOMAS.map((i) => {
          const on = i.id === idioma;
          return (
            <Button key={i.id} variant="outline" type="button" role="radio" aria-checked={on} onClick={() => elegir(i.id)}
              className={`h-auto justify-start gap-2 p-3 text-left text-sm whitespace-normal ${on ? "border-ring bg-accent font-semibold" : "border-border bg-background"}`}>
              <Bandera idioma={i.id} size={24} />
              <span className="min-w-0"><span className="block leading-tight">{i.nativo}</span></span>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <Button variant="ghost" type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t("idioma.titulo")}: ${actual.nativo}`}
        className="gap-1 h-9 px-2 text-inherit">
        <Bandera idioma={idioma} size={20} />
        <ChevronDown className="size-3.5 opacity-80" />
      </Button>
      {open && (
        <ul role="listbox" className="absolute right-0 mt-2 w-48 rounded-md bg-popover border border-border shadow-lg overflow-hidden z-50 text-popover-foreground">
          {IDIOMAS.map((i) => (
            <li key={i.id} role="option" aria-selected={i.id === idioma}>
              <Button variant="ghost" type="button" onClick={() => elegir(i.id)}
                className={`w-full h-auto justify-start gap-3 px-3 py-2.5 text-sm text-left ${i.id === idioma ? "font-semibold" : ""}`}>
                <Bandera idioma={i.id} size={22} /> {i.nativo}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
