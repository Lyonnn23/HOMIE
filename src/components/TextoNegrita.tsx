import { Fragment } from "react";

/** Renderiza un texto traducido con tramos en **negrita** (marcado doble asterisco). */
export function TextoNegrita({ texto }: { texto: string }) {
  const partes = texto.split("**");
  return (
    <>
      {partes.map((p, i) => (i % 2 === 1 ? <b key={i}>{p}</b> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}
