import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "light" | "dark" | "system";

const STORAGE_KEY = "homie_tema";
const META_LIGHT = "#111827"; // header oscuro en ambos modos
const META_DARK = "#0F131B";

interface TemaCtx {
  /** Preferencia guardada: light | dark | system. */
  tema: Tema;
  /** Tema efectivamente aplicado (resuelve "system"). */
  temaEfectivo: "light" | "dark";
  setTema: (t: Tema) => void;
}

const Ctx = createContext<TemaCtx>({ tema: "system", temaEfectivo: "light", setTema: () => {} });

function leerStorage(): Tema {
  try {
    if (typeof window === "undefined") return "system";
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
  } catch {
    return "system";
  }
}

function prefiereOscuro(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/** Aplica atributos en <html> y actualiza <meta name="theme-color">. */
function aplicar(tema: Tema) {
  try {
    const el = document.documentElement;
    el.setAttribute("data-theme-pref", tema);
    if (tema === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", tema);
    const oscuro = tema === "dark" || (tema === "system" && prefiereOscuro());
    el.style.colorScheme = oscuro ? "dark" : "light";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = oscuro ? META_DARK : META_LIGHT;
  } catch {
    /* sin DOM */
  }
}

/** Aplica el tema guardado sin provider (para pantallas fuera de AppShell). */
export function aplicarTemaGuardado() {
  aplicar(leerStorage());
}

/** Hook mínimo para pantallas sin AppShell (login, registro, legales). */
export function useTemaGuardado() {
  useEffect(() => { aplicarTemaGuardado(); }, []);
}

// Aplicación temprana al cargar el chunk en el cliente: reduce el "flash" claro.
if (typeof window !== "undefined") {
  try { aplicarTemaGuardado(); } catch { /* no-op */ }
}

export function TemaProvider({ children }: { children: ReactNode }) {
  // Parte en "system" para que SSR y primer render coincidan; luego hidrata.
  const [tema, setTemaState] = useState<Tema>("system");
  const [sistemaOscuro, setSistemaOscuro] = useState(false);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setTemaState(leerStorage());
    setSistemaOscuro(prefiereOscuro());
    setHidratado(true);
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = (e: MediaQueryListEvent) => setSistemaOscuro(e.matches);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    aplicar(tema);
    try { window.localStorage.setItem(STORAGE_KEY, tema); } catch { /* sin storage */ }
  }, [tema, hidratado, sistemaOscuro]);

  const setTema = useCallback((t: Tema) => setTemaState(t), []);
  const temaEfectivo: "light" | "dark" = tema === "dark" || (tema === "system" && sistemaOscuro) ? "dark" : "light";

  return <Ctx.Provider value={{ tema, temaEfectivo, setTema }}>{children}</Ctx.Provider>;
}

export function useTema() {
  return useContext(Ctx);
}

/** Control segmentado reutilizable: Sistema / Claro / Oscuro. */
export const OPCIONES_TEMA: { valor: Tema; label: string }[] = [
  { valor: "system", label: "Sistema" },
  { valor: "light", label: "Claro" },
  { valor: "dark", label: "Oscuro" },
];
