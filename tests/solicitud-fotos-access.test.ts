import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";

function clients() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const sessionText = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (!url || !key || !sessionText) throw new Error("App session and configuration required.");
  const session = JSON.parse(sessionText) as { access_token: string; user: { id: string } };
  const auth = { persistSession: false, autoRefreshToken: false };
  return {
    owner: createClient(url, key, { auth, global: { headers: { Authorization: `Bearer ${session.access_token}` } } }),
    anon: createClient(url, key, { auth }),
    userId: session.user.id,
  };
}

test("request photo uploader can sign their private file; anonymous visitors cannot read it", async () => {
  const { owner, anon, userId } = clients();
  const path = `${userId}/privacy-test-${crypto.randomUUID()}.txt`;
  try {
    const uploaded = await owner.storage.from("solicitudes").upload(path, new Blob(["private photo permission fixture"]));
    expect(uploaded.error).toBeNull();
    const signed = await owner.storage.from("solicitudes").createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    expect(typeof signed.data?.signedUrl).toBe("string");
    const anonymous = await anon.storage.from("solicitudes").createSignedUrl(path, 60);
    expect(anonymous.error).not.toBeNull();
    const publicRead = await fetch(anon.storage.from("solicitudes").getPublicUrl(path).data.publicUrl);
    expect(publicRead.ok).toBe(false);
  } finally {
    const removed = await owner.storage.from("solicitudes").remove([path]);
    expect(removed.error).toBeNull();
  }
});

test("request access helper does not grant access to unlinked files", async () => {
  const { owner } = clients();
  const { data, error } = await owner.rpc("puede_leer_foto_solicitud", {
    _object_path: `unrelated/${crypto.randomUUID()}.jpg`,
  });
  expect(error).toBeNull();
  expect(data).toBe(false);
});