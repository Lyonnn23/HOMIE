import { beforeAll, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";

function readRows<T>(query: string): T[] {
  const result = Bun.spawnSync(["lovable", "supabase", "query", query, "--json"]);
  if (result.exitCode !== 0) throw new Error("Could not verify growth rules.");
  return (JSON.parse(result.stdout.toString()) as { rows: T[] }).rows;
}

function client(authenticated = true) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const sessionText = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const session = sessionText ? JSON.parse(sessionText) as { access_token?: string } : null;
  if (!url || !key || (authenticated && !session?.access_token)) throw new Error("Project configuration and an app session are required.");
  return createClient(url, key, {
    global: authenticated ? { headers: { Authorization: `Bearer ${session?.access_token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Check = { conname: string; definition: string };
type FunctionInfo = { name: string; definition: string; anon: boolean; authenticated: boolean };
type State = {
  functions: FunctionInfo[];
  checks: Check[];
  tables: { name: string; rls: boolean; anon: boolean; service: boolean; read: boolean }[];
  supportColumns: { column_name: string; privilege_type: string }[];
  policies: { policyname: string; qual: string | null; with_check: string | null }[];
  defaults: { column_name: string; column_default: string }[];
  missingCodes: number;
  chatPrivate: boolean;
  cron: { schedule: string; active: boolean }[];
  launch: { tipo: string; valor: number; tope: number; minimo: number; usos_max: number; usos_por_usuario: number; solo_primera_compra: boolean; activo: boolean; expiryDays: number };
};
let state: State;
let allowed: Record<string, boolean | null>;

beforeAll(() => {
  const [row] = readRows<{ state: State }>(`SELECT json_build_object(
    'functions', (SELECT json_agg(json_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid),
      'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE')))
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
      AND p.proname IN ('validar_cupon','usar_codigo_referido','bono_referidor','enviar_recordatorios','protect_usuario_crecimiento','protect_reserva_cupon','aplicar_cupon_reserva')),
    'checks', (SELECT json_agg(json_build_object('conname',conname,'definition',pg_get_constraintdef(oid))) FROM pg_constraint
      WHERE contype='c' AND conrelid IN ('public.calificaciones_cliente'::regclass,'public.soporte_mensajes'::regclass)),
    'tables', (SELECT json_agg(json_build_object('name',relname,'rls',relrowsecurity,'anon',has_table_privilege('anon',oid,'SELECT'),
      'service',has_table_privilege('service_role',oid,'SELECT,INSERT,UPDATE,DELETE'),'read',has_table_privilege('authenticated',oid,'SELECT')))
      FROM pg_class WHERE oid IN ('public.config_privada'::regclass,'public.calificaciones_cliente'::regclass,'public.cupones'::regclass,'public.cupon_usos'::regclass,'public.soporte_mensajes'::regclass)),
    'supportColumns', (SELECT json_agg(json_build_object('column_name',column_name,'privilege_type',privilege_type))
      FROM information_schema.column_privileges WHERE table_schema='public' AND table_name='soporte_mensajes' AND grantee='authenticated' AND privilege_type='UPDATE'),
    'policies', (SELECT json_agg(json_build_object('policyname',policyname,'qual',qual,'with_check',with_check)) FROM pg_policies
      WHERE (schemaname='public' AND tablename IN ('calificaciones_cliente','soporte_mensajes')) OR (schemaname='storage' AND policyname IN ('chat owner insert','chat participantes leen'))),
    'defaults', (SELECT json_agg(json_build_object('column_name',column_name,'column_default',column_default)) FROM information_schema.columns WHERE table_schema='public'
      AND ((table_name='reservas' AND column_name IN ('recordatorio_enviado','aviso_pago_enviado','aviso_resena_enviado','descuento')) OR (table_name='usuarios' AND column_name IN ('bono_referido_pagado','calificaciones_cliente_count')))),
    'missingCodes', (SELECT count(*) FROM public.usuarios WHERE codigo_referido IS NULL OR codigo_referido !~ '^[A-Z0-9]{6}$'),
    'chatPrivate', (SELECT NOT public FROM storage.buckets WHERE id='chat'),
    'cron', (SELECT json_agg(json_build_object('schedule',schedule,'active',active)) FROM cron.job WHERE jobname='homie_recordatorios'),
    'launch', (SELECT json_build_object('tipo',tipo,'valor',valor,'tope',tope,'minimo',minimo,'usos_max',usos_max,'usos_por_usuario',usos_por_usuario,
      'solo_primera_compra',solo_primera_compra,'activo',activo,'expiryDays',round(extract(epoch FROM (vence_at-created_at))/86400)) FROM public.cupones WHERE codigo='HOMIE20')
  ) AS state`);
  if (!row) throw new Error("Missing growth schema.");
  state = row.state;
  const cases = [
    { field: "puntaje", name: "calificaciones_cliente_puntaje_check", values: ["0", "1", "5", "6"] },
    { field: "comentario", name: "calificaciones_cliente_comentario_check", values: ["NULL::text", "repeat('x',300)", "repeat('x',301)"] },
    { field: "contenido", name: "soporte_mensajes_contenido_check", values: ["''::text", "'x'::text", "repeat('x',2000)", "repeat('x',2001)"] },
  ];
  const expressions = cases.flatMap(({ field, name, values }) => {
    const constraint = state.checks.find((c) => c.conname === name);
    if (!constraint?.definition.startsWith("CHECK (")) throw new Error(`Missing constraint ${name}`);
    return values.map((v, i) => `(SELECT ${constraint.definition.slice(6)} FROM (VALUES (${v})) input(${field})) AS ${field}_${i}`);
  });
  const [evaluated] = readRows<Record<string, boolean | null>>(`SELECT ${expressions.join(", ")}`);
  if (!evaluated) throw new Error("Missing constraint results.");
  allowed = evaluated;
}, 60000);

function definition(name: string) {
  const fn = state.functions.find((f) => f.name === name);
  if (!fn) throw new Error(`Missing function ${name}`);
  return fn.definition;
}

test("growth tables are private, RLS-enabled and service accessible", () => {
  expect(state.tables).toHaveLength(5);
  for (const t of state.tables) {
    expect(t.rls).toBe(true);
    expect(t.anon).toBe(false);
    expect(t.service).toBe(true);
    expect(t.read).toBe(t.name !== "config_privada");
  }
});

test("clients can update only the support read flag, not staff identity or message content", () => {
  expect(state.supportColumns).toEqual([{ column_name: "leido", privilege_type: "UPDATE" }]);
});

test("client ratings allow only 1 to 5 inclusive", () => {
  expect([allowed.puntaje_0, allowed.puntaje_1, allowed.puntaje_2, allowed.puntaje_3]).toEqual([false, true, true, false]);
});

test("client rating comments are optional with a 300-character maximum", () => {
  expect([allowed.comentario_0, allowed.comentario_1, allowed.comentario_2]).toEqual([true, true, false]);
});

test("support messages require 1 to 2000 characters", () => {
  expect([allowed.contenido_0, allowed.contenido_1, allowed.contenido_2, allowed.contenido_3]).toEqual([false, true, true, false]);
});

test("only the completed booking's professional can rate its actual client", () => {
  const policy = state.policies.find((p) => p.policyname === "prestador califica cliente");
  expect(policy?.with_check).toContain("r.cliente_id = calificaciones_cliente.cliente_id");
  expect(policy?.with_check).toContain("r.prestador_id = calificaciones_cliente.prestador_id");
  expect(policy?.with_check).toContain("'completada'::reserva_estado");
  expect(policy?.with_check).toContain("usuario_id = current_usuario_id()");
});

test("chat photos remain private and both upload and download require a booking relationship", () => {
  expect(state.chatPrivate).toBe(true);
  for (const name of ["chat owner insert", "chat participantes leen"]) {
    const p = state.policies.find((p) => p.policyname === name);
    const expr = p?.with_check ?? p?.qual ?? "";
    expect(expr).toContain("r.id");
    expect(expr).toContain("r.cliente_id = current_usuario_id()");
    expect(expr).toContain("usuario_id = current_usuario_id()");
  }
});

test("reminders check every 15 minutes with a single active job", () => {
  expect(state.cron).toEqual([{ schedule: "*/15 * * * *", active: true }]);
});

test("new reminder and referral flags are false and counts and discounts are zero", () => {
  expect(Object.fromEntries(state.defaults.map((c) => [c.column_name, c.column_default]))).toEqual({
    recordatorio_enviado: "false", aviso_pago_enviado: "false", aviso_resena_enviado: "false", descuento: "0", bono_referido_pagado: "false", calificaciones_cliente_count: "0",
  });
});

test("every existing user received a six-character invitation code", () => {
  expect(state.missingCodes).toBe(0);
});

test("HOMIE20 gives 20 percent capped at 10000 CLP, minimum 10000, 500 uses, once per user, first purchase, 90 days", () => {
  expect(state.launch).toEqual({ tipo: "porcentaje", valor: 20, tope: 10000, minimo: 10000, usos_max: 500, usos_por_usuario: 1, solo_primera_compra: true, activo: true, expiryDays: 90 });
});

test("referral entry is restricted to the first seven days and awards 3000 CLP above 10000 for 60 days", () => {
  const body = definition("usar_codigo_referido");
  expect(body.match(/interval '(\d+) days'/g)).toEqual(["interval '7 days'", "interval '60 days'"]);
  const values = body.match(/'monto',\s*(\d+),\s*(\d+),\s*v_me.id,\s*(true)/);
  expect(values?.slice(1)).toEqual(["3000", "10000", "true"]);
  expect(body).toContain("v_ref.id = v_me.id");
});

test("inviter receives 3000 CLP above 10000 for 90 days only after paid completion", () => {
  const body = definition("bono_referidor");
  expect(body.match(/'monto',\s*(\d+),\s*(\d+),\s*v_cli.referido_por/)?.slice(1)).toEqual(["3000", "10000"]);
  expect(body.match(/interval '(\d+) days'/)?.[1]).toBe("90");
  expect(body).toContain("NEW.estado <> 'completada'");
  expect(body).toContain("reserva_id = NEW.id AND estado = 'pagado'");
  expect(body).toContain("v_cli.bono_referido_pagado");
});

test("concurrent coupon and referral claims serialize on the user and coupon rows", () => {
  expect((definition("aplicar_cupon_reserva").match(/FOR UPDATE/g) ?? []).length).toBe(2);
  expect(definition("usar_codigo_referido")).toContain("FOR UPDATE");
  expect(definition("bono_referidor")).toContain("FOR UPDATE");
});

test("derived referral benefits, client ratings and booking discounts cannot be edited as ordinary profile data", () => {
  const profile = definition("protect_usuario_crecimiento");
  for (const name of ["referido_por", "bono_referido_pagado", "calificacion_cliente", "calificaciones_cliente_count", "codigo_referido"]) {
    expect(profile).toContain(`NEW.${name} IS DISTINCT FROM OLD.${name}`);
  }
  const booking = definition("protect_reserva_cupon");
  expect(booking).toContain("NEW.descuento IS DISTINCT FROM OLD.descuento");
  expect(booking).toContain("NEW.cupon_codigo IS DISTINCT FROM OLD.cupon_codigo");
});

test("anonymous callers cannot validate or redeem coupons or read admin metrics", async () => {
  const anon = client(false);
  const results = await Promise.all([
    anon.rpc("validar_cupon", { _codigo: "HOMIE20", _precio: 10000 }),
    anon.rpc("usar_codigo_referido", { _codigo: "INVALID" }),
    anon.rpc("admin_embudo", { _dias: 7 }),
    anon.rpc("admin_serie_diaria", { _dias: 7 }),
  ]);
  expect(results.map((r) => r.error?.code)).toEqual(["42501", "42501", "42501", "42501"]);
});

test("ordinary authenticated callers cannot run the automatic reminder sender", async () => {
  const { error } = await client().rpc("enviar_recordatorios");
  expect(error?.code).toBe("42501");
});

test("coupon validation rejects nonpositive prices", async () => {
  for (const precio of [0, -1]) {
    const { data, error } = await client().rpc("validar_cupon", { _codigo: "HOMIE20", _precio: precio });
    expect(error).toBeNull();
    expect(data?.[0]).toMatchObject({ valido: false, descuento: 0 });
  }
});

test("coupon validation rejects services below the 10000 CLP minimum", async () => {
  const { data, error } = await client().rpc("validar_cupon", { _codigo: "HOMIE20", _precio: 9999 });
  expect(error).toBeNull();
  expect(data?.[0]).toMatchObject({ valido: false, descuento: 0 });
});

test("authenticated users can read permitted coupons and support without errors", async () => {
  const results = await Promise.all([client().from("cupones").select("codigo").limit(1), client().from("soporte_mensajes").select("id").limit(1)]);
  expect(results.map((r) => r.error)).toEqual([null, null]);
});