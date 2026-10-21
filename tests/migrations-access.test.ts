import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";

function authenticatedClient() {
  const sessionText = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!sessionText || !url || !key) {
    throw new Error("An injected app session and the project configuration are required.");
  }
  const session = JSON.parse(sessionText) as { access_token?: string };
  if (!session.access_token) throw new Error("Missing session token.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("authenticated clients can read permitted requests without recursive policies", async () => {
  const { data, error } = await authenticatedClient().from("solicitudes").select("id").limit(1);
  expect(error?.code ?? null).toBeNull();
  expect(Array.isArray(data)).toBe(true);
});

test("authenticated clients can read permitted quotes without recursive policies", async () => {
  const { data, error } = await authenticatedClient().from("cotizaciones").select("id").limit(1);
  expect(error?.code ?? null).toBeNull();
  expect(Array.isArray(data)).toBe(true);
});