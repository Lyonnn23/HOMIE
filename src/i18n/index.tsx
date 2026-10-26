import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import es from "./es";
import en from "./en";
import ht from "./ht";
import pt from "./pt";

export type Idioma = "es" | "en" | "ht" | "pt";
export const IDIOMAS: { id: Idioma; nombre: string; nativo: string }[] = [
  { id: "es", nombre: "Español", nativo: "Español" },
  { id: "en", nombre: "Inglés", nativo: "English" },
  { id: "ht", nombre: "Creole haitiano", nativo: "Kreyòl ayisyen" },
  { id: "pt", nombre: "Portugués", nativo: "Português" },
];

/** Diccionario plano: clave → texto. `es` es la fuente de verdad; los demás caen a `es` si falta una clave. */
export type Diccionario = Record<string, string>;
const DICCIONARIOS: Record<Idioma, Diccionario> = { es, en, ht, pt };

const KEY = "homie_idioma";

function detectar(): Idioma {
  try {
    const guardado = localStorage.getItem(KEY) as Idioma | null;
    if (guardado && DICCIONARIOS[guardado]) return guardado;
    const nav = (navigator.language || "es").toLowerCase();
    if (nav.startsWith("en")) return "en";
    if (nav.startsWith("pt")) return "pt";
    if (nav.startsWith("ht") || nav.startsWith("fr-ht")) return "ht";
  } catch { /* SSR o storage bloqueado */ }
  return "es";
}

type Ctx = {
  idioma: Idioma;
  setIdioma: (i: Idioma) => void;
  /** t("clave", { nombre: "Ana" }) → texto con {nombre} reemplazado. Devuelve la clave si no existe. */
  t: (clave: string, vars?: Record<string, string | number>) => string;
};
const I18nCtx = createContext<Ctx>({ idioma: "es", setIdioma: () => {}, t: (k) => es[k] ?? k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>("es");
  useEffect(() => { setIdiomaState(detectar()); }, []);
  useEffect(() => {
    try { document.documentElement.lang = idioma === "ht" ? "ht" : idioma === "es" ? "es-CL" : idioma === "pt" ? "pt-BR" : "en"; } catch { /* noop */ }
  }, [idioma]);
  const setIdioma = useCallback((i: Idioma) => {
    setIdiomaState(i);
    try { localStorage.setItem(KEY, i); } catch { /* noop */ }
  }, []);
  const t = useCallback((clave: string, vars?: Record<string, string | number>) => {
    let txt = DICCIONARIOS[idioma][clave] ?? es[clave] ?? clave;
    if (vars) for (const [k, v] of Object.entries(vars)) txt = txt.split(`{${k}}`).join(String(v));
    return txt;
  }, [idioma]);
  const value = useMemo(() => ({ idioma, setIdioma, t }), [idioma, setIdioma, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT() { return useContext(I18nCtx); }
