import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";

function client(authenticated = true) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const sessionText = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (!url || !key || (authenticated && !sessionText)) {
    throw new Error("Project configuration and an app session are required.");
  }
  const session = sessionText ? JSON.parse(sessionText) as { access_token?: string } : null;
  if (authenticated && !session?.access_token) throw new Error("Missing session token.");
  return createClient(url, key, {
    global: authenticated ? { headers: { Authorization: `Bearer ${session?.access_token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("monthly Pro costs 7990 CLP for 30 days", async () => {
  const { data, error } = await client(false).from("planes_pro").select("precio, dias").eq("id", "mensual").single();
  expect(error).toBeNull();
  expect(data).toEqual({ precio: 7990, dias: 30 });
});

test("annual Pro costs 69990 CLP for 365 days", async () => {
  const { data, error } = await client(false).from("planes_pro").select("precio, dias").eq("id", "anual").single();
  expect(error).toBeNull();
  expect(data).toEqual({ precio: 69990, dias: 365 });
});

test("providers without active Pro have a 15 percent commission", async () => {
  const { data, error } = await client(false).rpc("tasa_comision", { _prestador_id: "00000000-0000-0000-0000-000000000000" });
  expect(error).toBeNull();
  expect(Number(data)).toBe(0.15);
});

test("anonymous callers cannot activate free Pro", async () => {
  const { error } = await client(false).rpc("activar_prueba_pro");
  expect(error?.code).toBe("42501");
});

test("ordinary authenticated callers cannot mark Pro subscriptions paid", async () => {
  const { error } = await client().rpc("activar_pro_pagado", {
    _suscripcion_id: "00000000-0000-0000-0000-000000000000", _mp_payment_id: "permission-test",
  });
  expect(error?.code).toBe("42501");
});

test("authenticated callers can read permitted urgency rows", async () => {
  const { data, error } = await client().from("urgencias").select("id").limit(1);
  expect(error).toBeNull();
  expect(Array.isArray(data)).toBe(true);
});

test("authenticated callers can read service modalities", async () => {
  const { data, error } = await client().from("prestador_servicios").select("modalidades").limit(1);
  expect(error).toBeNull();
  expect(data?.length).toBe(1);
  expect(data?.[0]?.modalidades).toEqual(["domicilio"]);
});