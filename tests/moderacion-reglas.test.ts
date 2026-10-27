import { expect, test } from "bun:test";
import { contieneContacto, contieneOfensivo } from "../src/lib/moderacion-reglas";

test("existing offensive language is blocked regardless of case or accents", () => {
  expect(contieneOfensivo("Eres un IMBÉCIL.")).toBe(true);
  expect(contieneOfensivo("ctm")).toBe(true);
});

test("respectful complaints and partial word matches are not blocked", () => {
  expect(contieneOfensivo("El servicio no quedó bien y necesito una solución.")).toBe(false);
  expect(contieneOfensivo("La computadora no funciona.")).toBe(false);
});

test("existing contact protection detects Chilean numbers, email, and off-app payment", () => {
  expect(contieneContacto("Llámame al +56 9 1234 5678")).toBe(true);
  expect(contieneContacto("Escríbeme a persona@example.com")).toBe(true);
  expect(contieneContacto("te lo dejo más barato por fuera")).toBe(true);
});

test("ordinary booking messages do not count as contact sharing", () => {
  expect(contieneContacto("Llego a las 15:30 para reparar la llave.")).toBe(false);
});