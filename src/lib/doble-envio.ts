import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Evita envíos dobles (doble tap, botón atrás + reenviar, red lenta).
 *
 * const [enviando, ejecutar] = useEnvioUnico();
 * <button disabled={enviando} onClick={() => ejecutar(async () => { ... })} />
 *
 * `ejecutar` ignora llamadas mientras una ejecución está en curso (usa un ref,
 * así protege incluso antes del re-render) y libera el estado al terminar,
 * también si la función lanza. Si el componente se desmonta (p. ej. tras
 * navegar), no actualiza estado.
 */
export function useEnvioUnico(): [
  boolean,
  <T>(fn: () => Promise<T> | T) => Promise<T | undefined>,
] {
  const [enviando, setEnviando] = useState(false);
  const ocupado = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const ejecutar = useCallback(async <T>(fn: () => Promise<T> | T): Promise<T | undefined> => {
    if (ocupado.current) return undefined;
    ocupado.current = true;
    setEnviando(true);
    try {
      return await fn();
    } finally {
      ocupado.current = false;
      if (montado.current) setEnviando(false);
    }
  }, []);

  return [enviando, ejecutar];
}
