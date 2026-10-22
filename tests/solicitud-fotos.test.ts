import { test, expect } from "bun:test";
import { solicitudFotoPath } from "../src/lib/solicitud-fotos";

const origin = "https://storage.example.com";
test("private photo paths remain paths, not public URLs", () => {
  expect(solicitudFotoPath("cliente/foto.jpg", origin)).toBe("cliente/foto.jpg");
});
test("legacy public request URLs are converted to private object paths", () => {
  expect(solicitudFotoPath(`${origin}/storage/v1/object/public/solicitudes/cliente/foto.jpg`, origin)).toBe("cliente/foto.jpg");
});
test("external photo URLs cannot bypass private storage", () => {
  expect(solicitudFotoPath("https://other.example.com/storage/v1/object/public/solicitudes/cliente/foto.jpg", origin)).toBeNull();
});
test("other buckets cannot supply request photos", () => {
  expect(solicitudFotoPath(`${origin}/storage/v1/object/public/avatars/cliente/foto.jpg`, origin)).toBeNull();
});
test("unsafe relative paths are rejected", () => {
  for (const value of ["../foto.jpg", "cliente/../foto.jpg", "cliente/foto.jpg?token=1", "/cliente/foto.jpg"]) {
    expect(solicitudFotoPath(value, origin)).toBeNull();
  }
});