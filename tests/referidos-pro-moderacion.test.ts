import { beforeAll, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";

function read<T>(query: string): T[] {
  const result = Bun.spawnSync(["lovable", "supabase", "query", query, "--json"]);
  if (result.exitCode !== 0) throw new Error("Could not verify professional referrals and moderation.");
  return (JSON.parse(result.stdout.toString()) as { rows: T[] }).rows;
}

type State = {
  columns: { name: string; default: string; nullable: string }[];
  functions: { name: string; body: string }[];
  triggers: { table: string; name: string; body: string }[];
  rls: boolean; invoker: boolean; policies: { cmd: string; qual: string }[];
  authSelect: boolean; authInsert: boolean; anonSelect: boolean; serviceInsert: boolean;
  viewAuthSelect: boolean; viewAnonSelect: boolean;
  contact: { mobile: boolean; compact: boolean; email: boolean; outside: boolean; ordinary: boolean };
};
let state: State;
function body(name: string) {
  const value = state.functions.find((f) => f.name === name);
  if (!value) throw new Error(`Missing function ${name}`);
  return value.body;
}
beforeAll(() => {
  const [row] = read<{ state: State }>(`SELECT json_build_object(
    'columns',(SELECT json_agg(json_build_object('name',column_name,'default',column_default,'nullable',is_nullable)) FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name IN ('idioma','bono_referido_pro_pagado')),
    'functions',(SELECT json_agg(json_build_object('name',proname,'body',pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname IN ('bono_referido_profesional','proteger_bono_referido_pro','bloquear_contacto_sin_pago','bloquear_ofensivo_resena','bono_referidor')),
    'triggers',(SELECT json_agg(json_build_object('table',tgrelid::regclass::text,'name',tgname,'body',pg_get_triggerdef(oid))) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('trg_bono_referido_profesional','trg_00_proteger_bono_referido_pro','trg_bloquear_contacto')),
    'rls',(SELECT relrowsecurity FROM pg_class WHERE oid='public.moderacion_eventos'::regclass),
    'invoker',(SELECT 'security_invoker=true'=ANY(reloptions) FROM pg_class WHERE oid='public.moderacion_resumen'::regclass),
    'policies',(SELECT json_agg(json_build_object('cmd',cmd,'qual',qual)) FROM pg_policies WHERE schemaname='public' AND tablename='moderacion_eventos'),
    'authSelect',has_table_privilege('authenticated','public.moderacion_eventos','SELECT'),
    'authInsert',has_table_privilege('authenticated','public.moderacion_eventos','INSERT'),
    'anonSelect',has_table_privilege('anon','public.moderacion_eventos','SELECT'),
    'serviceInsert',has_table_privilege('service_role','public.moderacion_eventos','INSERT'),
    'viewAuthSelect',has_table_privilege('authenticated','public.moderacion_resumen','SELECT'),
    'viewAnonSelect',has_table_privilege('anon','public.moderacion_resumen','SELECT'),
    'contact',json_build_object('mobile',public.contiene_contacto('llama al 9 1234 5678'),'compact',public.contiene_contacto('912345678'),'email',public.contiene_contacto('prueba@example.test'),'outside',public.contiene_contacto('cerramos por fuera'),'ordinary',public.contiene_contacto('Nos vemos el martes a las diez'))) AS state`);
  if (!row) throw new Error("Missing deployed moderation schema.");
  state = row.state;
}, 60000);

test("professional referral bonus is awarded on the verification milestone", () => {
  expect(body("bono_referido_profesional")).toContain("NEW.verificado = true AND OLD.verificado IS DISTINCT FROM true");
  expect(state.triggers.find((t) => t.name === "trg_bono_referido_profesional")?.body).toContain("AFTER UPDATE OF verificado ON public.prestadores");
});
test("both professionals receive exactly 30 additional days without changing free commission dates", () => {
  const reward = body("bono_referido_profesional");
  expect(reward).toContain("interval '30 days'");
  expect(reward).toContain("WHERE id IN (NEW.id, v_ref_prestador.id)");
  expect(reward).toContain("GREATEST(COALESCE(pro_hasta, now()), now())");
  expect(reward).not.toContain("comision_gratis_hasta");
});
test("professional bonus claims are serialized and cannot repeat or self-refer", () => {
  const reward = body("bono_referido_profesional");
  expect(reward).toContain("FOR UPDATE");
  expect(reward).toContain("v_inv.bono_referido_pro_pagado");
  expect(reward).toContain("v_inv.referido_por = v_inv.id");
  expect(reward).toContain("bono_referido_pro_pagado = true");
});
test("browser writes cannot forge or reset professional bonus eligibility", () => {
  const guard = body("proteger_bono_referido_pro");
  expect(guard).toContain("TG_OP = 'INSERT'");
  expect(guard).toContain("NEW.bono_referido_pro_pagado IS DISTINCT FROM OLD.bono_referido_pro_pagado");
  expect(state.triggers.find((t) => t.name === "trg_00_proteger_bono_referido_pro")?.body).toContain("BEFORE INSERT OR UPDATE");
  expect(state.columns.find((c) => c.name === "bono_referido_pro_pagado")?.default).toBe("false");
});
test("client referral coupons still require a paid completed booking", () => {
  expect(body("bono_referidor")).toContain("NEW.estado <> 'completada'");
  expect(body("bono_referidor")).toContain("estado = 'pagado'");
});
test("contact is blocked before payment with PostgreSQL-compatible phone boundaries", () => {
  expect(state.contact).toEqual({ mobile: true, compact: true, email: true, outside: true, ordinary: false });
  expect(body("bloquear_contacto_sin_pago")).toContain("estado = 'pagado'");
  expect(body("bloquear_contacto_sin_pago")).toContain("RAISE EXCEPTION");
  expect(state.triggers.find((t) => t.name === "trg_bloquear_contacto")?.body).toContain("BEFORE INSERT ON public.mensajes");
});
test("moderation reads require administrator RLS and clients cannot insert events", () => {
  expect(state.rls).toBe(true);
  expect(state.policies).toEqual([{ cmd: "SELECT", qual: "is_admin()" }]);
  expect(state.authSelect).toBe(true);
  expect(state.authInsert).toBe(false);
  expect(state.anonSelect).toBe(false);
  expect(state.serviceInsert).toBe(true);
});
test("moderation summary preserves caller RLS and denies anonymous access", () => {
  expect(state.invoker).toBe(true);
  expect(state.viewAuthSelect).toBe(true);
  expect(state.viewAnonSelect).toBe(false);
});
test("account language defaults to Spanish and allows the four supported languages only", () => {
  expect(state.columns.find((c) => c.name === "idioma")).toEqual({ name: "idioma", default: "'es'::text", nullable: "NO" });
  const rows = read<{ body: string }>("SELECT pg_get_constraintdef(oid) AS body FROM pg_constraint WHERE conrelid='public.usuarios'::regclass AND conname='usuarios_idioma_check'");
  const constraint = rows[0]?.body;
  expect(constraint).toBeDefined();
  for (const language of ["es", "en", "ht", "pt"]) expect(constraint).toContain(`'${language}'::text`);
  expect(constraint).not.toContain("'fr'::text");
});
test("anonymous Data API cannot read moderation events or summaries", async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing public app configuration.");
  const client = createClient(url, key, { auth: { persistSession: false } });
  for (const table of ["moderacion_eventos", "moderacion_resumen"]) {
    const { error } = await client.from(table).select("usuario_id").limit(1);
    expect(error?.code).toBe("42501");
  }
});