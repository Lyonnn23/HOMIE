import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "homie_accesibilidad";

interface AccesibilidadState {
  modoFacil: boolean;
  lecturaVoz: boolean;
}

interface AccesibilidadCtx extends AccesibilidadState {
  setModoFacil: (v: boolean) => void;
  setLecturaVoz: (v: boolean) => void;
  hablar: (texto: string) => void;
  detener: () => void;
  vozSoportada: boolean;
}

const DEFAULT_STATE: AccesibilidadState = { modoFacil: false, lecturaVoz: false };

const Ctx = createContext<AccesibilidadCtx>({
  ...DEFAULT_STATE,
  setModoFacil: () => {},
  setLecturaVoz: () => {},
  hablar: () => {},
  detener: () => {},
  vozSoportada: false,
});

function leerStorage(): AccesibilidadState {
  try {
    if (typeof window === "undefined") return DEFAULT_STATE;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AccesibilidadState>;
    return {
      modoFacil: !!parsed.modoFacil,
      lecturaVoz: !!parsed.lecturaVoz,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function guardarStorage(state: AccesibilidadState) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible */
  }
}

function sintesisDisponible(): boolean {
  try {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
  } catch {
    return false;
  }
}

export function AccesibilidadProvider({ children }: { children: ReactNode }) {
  // Siempre parte con el default para que el render en servidor y el primer render
  // en cliente coincidan; luego se hidrata desde localStorage.
  const [state, setState] = useState<AccesibilidadState>(DEFAULT_STATE);
  const [hidratado, setHidratado] = useState(false);
  const [vozSoportada, setVozSoportada] = useState(false);

  useEffect(() => {
    setState(leerStorage());
    setVozSoportada(sintesisDisponible());
    setHidratado(true);
  }, []);

  // Persistir y aplicar atributo en <html>
  useEffect(() => {
    if (!hidratado) return;
    guardarStorage(state);
    try {
      const el = document.documentElement;
      if (state.modoFacil) el.setAttribute("data-modo-facil", "1");
      else el.removeAttribute("data-modo-facil");
    } catch {
      /* sin DOM */
    }
  }, [state, hidratado]);

  const setModoFacil = useCallback((v: boolean) => setState((s) => ({ ...s, modoFacil: v })), []);
  const setLecturaVoz = useCallback((v: boolean) => setState((s) => ({ ...s, lecturaVoz: v })), []);

  const detener = useCallback(() => {
    try {
      if (sintesisDisponible()) window.speechSynthesis.cancel();
    } catch {
      /* no-op */
    }
  }, []);

  const hablar = useCallback((texto: string) => {
    try {
      if (!sintesisDisponible()) return;
      const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
      if (!limpio) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utt = new window.SpeechSynthesisUtterance(limpio);
      const voces = synth.getVoices();
      const voz =
        voces.find((v) => v.lang?.toLowerCase() === "es-cl") ??
        voces.find((v) => v.lang?.toLowerCase() === "es-es") ??
        voces.find((v) => v.lang?.toLowerCase().startsWith("es"));
      if (voz) {
        utt.voice = voz;
        utt.lang = voz.lang;
      } else {
        utt.lang = "es-CL";
      }
      utt.rate = 0.95;
      synth.speak(utt);
    } catch {
      /* no-op */
    }
  }, []);

  // Al desactivar lectura por voz, detener cualquier lectura en curso
  useEffect(() => {
    if (!state.lecturaVoz) detener();
  }, [state.lecturaVoz, detener]);

  return (
    <Ctx.Provider
      value={{
        modoFacil: state.modoFacil,
        lecturaVoz: state.lecturaVoz,
        setModoFacil,
        setLecturaVoz,
        hablar,
        detener,
        vozSoportada,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAccesibilidad() {
  return useContext(Ctx);
}
