import { beforeAll, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";

function read<T>(query: string): T[] {
  const result = Bun.spawnSync(["lovable", "supabase", "query", query, "--json"]);
  if (result.exitCode !== 0) throw new Error("Could not verify premium rules.");
  return (JSON.parse(result.stdout.toString()) as { rows: T[] }).rows;
}

type State = {
  config: Record<string, number>;
  functions: { name: string; body: string }[];
  columns: string[];
  rls: boolean;
  policies: { cmd: string; qual: string | null; with_check: string | null }[];
  triggerOrder: string[];
  anonUpdate: boolean;
  anonSelect: boolean;
  authUpdate: boolean;
  paymentCheck: boolean;
};
let state: State;
function body(name: string) {
  const fn = state.functions.find((f) => f.name === name);
  if (!fn) throw new Error(`Missing ${name}`);
  return fn.body;
}

beforeAll(() => {
  const [row] = read<{ state: State }>(`SELECT json_build_object(
    'config',(SELECT json_object_agg(clave,valor) FROM public.config_publica),
    'functions',(SELECT json_agg(json_build_object('name',proname,'body',pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND proname IN ('al_verificar_prestador','tasa_comision','activar_prueba_pro','aplicar_cupon_reserva','fill_reserva_total','proteger_beneficios_premium','aceptar_cotizacion','puntaje_ranking')),
    'columns',(SELECT json_agg(column_name ORDER BY column_name) FROM information_schema.columns WHERE table_schema='public' AND table_name='prestadores' AND column_name IN ('verificado_at','comision_gratis_hasta')),
    'rls',(SELECT relrowsecurity FROM pg_class WHERE oid='public.config_publica'::regclass),
    'policies',(SELECT json_agg(json_build_object('cmd',cmd,'qual',qual,'with_check',with_check)) FROM pg_policies WHERE schemaname='public' AND tablename='config_publica'),
    'triggerOrder',(SELECT json_agg(tgname ORDER BY tgname) FROM pg_trigger WHERE tgrelid='public.prestadores'::regclass AND NOT tgisinternal),
    'anonSelect',has_table_privilege('anon','public.config_publica','SELECT'),
    'anonUpdate',has_table_privilege('anon','public.config_publica','UPDATE'),
    'authUpdate',has_table_privilege('authenticated','public.config_publica','UPDATE'),
    'paymentCheck',EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.pagos'::regclass AND conname='pagos_comision_check')) AS state`);
  if (!row) throw new Error("Missing premium schema.");
  state = row.state;
}, 60000);

test("verification grants 90 days without commission", () => {
  expect(state.config.dias_gratis).toBe(90);
  expect(state.config.comision_gratis).toBe(0);
  expect(state.columns).toEqual(["comision_gratis_hasta", "verificado_at"]);
  expect(body("al_verificar_prestador")).toContain("make_interval(days => v_dias)");
  expect(body("tasa_comision")).toContain("comision_gratis_hasta > now()");
});

test("Premium trial lasts 90 days and is claimed only once after verification", () => {
  expect(state.config.premium_trial_dias).toBe(90);
  expect(body("activar_prueba_pro")).toContain("FOR UPDATE");
  expect(body("activar_prueba_pro")).toContain("IF NOT p.verificado");
  expect(body("activar_prueba_pro")).toContain("IF p.pro_trial_usado");
  expect(body("activar_prueba_pro")).toContain("make_interval(days => v_trial)");
});

test("normal and Premium commissions are 15 and 12 percent after free period", () => {
  expect(state.config.comision_normal).toBe(0.15);
  expect(state.config.comision_premium).toBe(0.12);
  expect(body("tasa_comision")).toContain("public.es_pro(_prestador_id)");
  expect(body("tasa_comision")).toContain("public.cfg('comision_normal', 0.15)");
});

test("clients pay the service price without a commission surcharge", () => {
  expect(body("fill_reserva_total")).toContain("NEW.total := v_precio;");
  expect(body("fill_reserva_total")).not.toContain("NEW.total := v_precio +");
});

test("coupons deduct from the client price and can exceed Homie's commission", () => {
  const coupon = body("aplicar_cupon_reserva");
  expect(coupon).toContain("public.validar_cupon(NEW.cupon_codigo, NEW.total)");
  expect(coupon).toContain("GREATEST(NEW.total - v.descuento, 0)");
  expect((coupon.match(/FOR UPDATE/g) ?? []).length).toBe(2);
  expect(coupon).toContain("NEW.cliente_id IS DISTINCT FROM public.current_usuario_id()");
  expect(state.paymentCheck).toBe(false);
});

test("Premium ranking bonus requires a 4.0 rating and three reviews", () => {
  expect(state.config.ranking_min_rating_premium).toBe(4);
  expect(state.config.ranking_min_resenas_premium).toBe(3);
  expect(body("puntaje_ranking")).toContain("p.calificacion_promedio >= public.cfg");
  expect(body("puntaje_ranking")).toContain("p.resenas_count >= public.cfg");
});

test("configuration is publicly readable but all writes require administrator status", () => {
  expect(state.rls).toBe(true);
  expect(state.anonSelect).toBe(true);
  expect(state.anonUpdate).toBe(false);
  expect(state.authUpdate).toBe(true);
  expect(state.policies.filter((p) => p.cmd === "ALL")).toEqual([{ cmd: "ALL", qual: "is_admin()", with_check: "is_admin()" }]);
  expect(state.policies.filter((p) => p.cmd !== "SELECT" && p.cmd !== "ALL")).toHaveLength(0);
});

test("direct benefit forgery is blocked before verification grants any benefits", () => {
  const protection = body("proteger_beneficios_premium");
  for (const field of ["verificado_at", "comision_gratis_hasta", "pro_hasta", "pro_trial_usado", "verificado"]) {
    expect(protection).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`);
  }
  expect(protection).toContain("TG_OP = 'INSERT'");
  const guard = state.triggerOrder.indexOf("trg_00_proteger_beneficios_premium");
  expect(guard).toBeGreaterThanOrEqual(0);
  expect(guard).toBeLessThan(state.triggerOrder.indexOf("trg_al_verificar_prestador"));
});

test("accepted quotes retain their agreed price with serialized request acceptance", () => {
  const quote = body("aceptar_cotizacion");
  expect((quote.match(/FOR UPDATE/g) ?? []).length).toBe(2);
  expect(quote).toContain("c.precio, ROUND(c.precio * v_tasa)");
  expect(quote).toContain("set_config('homie.quote_reservation', v_reserva::text, true)");
  expect(body("fill_reserva_total")).toContain("NEW.id::text = current_setting('homie.quote_reservation', true)");
});

test("anonymous visitors can read the seven settings but cannot change commission", async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing app configuration.");
  const client = createClient(url,key,{auth:{persistSession:false}});
  const { data, error } = await client.from("config_publica").select("clave,valor");
  expect(error).toBeNull();
  expect(data).toHaveLength(7);
  const update = await client.from("config_publica").update({valor:0.99}).eq("clave","permission-test-no-row").select("clave");
  expect(update.error?.code === "42501" || update.data?.length === 0).toBe(true);
});