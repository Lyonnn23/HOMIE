import { beforeAll, expect, test } from "bun:test";

type Column = { table_name: string; column_name: string; column_default: string | null; is_nullable: string };
type Constraint = { conname: string; definition: string };

function readRows<T>(query: string): T[] {
  const result = Bun.spawnSync(["lovable", "supabase", "query", query, "--json"]);
  if (result.exitCode !== 0) throw new Error("Could not verify the service-card schema.");
  return (JSON.parse(result.stdout.toString()) as { rows: T[] }).rows;
}

let columns: Column[];
let checks: Constraint[];
let allowed: Record<string, boolean | null>;

beforeAll(() => {
  const [schema] = readRows<{ columns: Column[]; checks: Constraint[] }>(`
    SELECT
      (SELECT json_agg(c) FROM (
        SELECT table_name, column_name, column_default, is_nullable
        FROM information_schema.columns WHERE table_schema = 'public'
        AND ((table_name = 'prestador_servicios' AND column_name IN
          ('unidad','duracion_min','garantia_dias','materiales_incluidos','no_incluye'))
          OR (table_name = 'prestadores' AND column_name IN
          ('especialidades','comunas_cobertura','radio_km','idiomas','tiene_vehiculo','herramientas_propias','emite_boleta','formas_pago_extra')))
      ) c) AS columns,
      (SELECT json_agg(c) FROM (
        SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
        WHERE conrelid IN ('public.prestador_servicios'::regclass,'public.prestadores'::regclass)
        AND contype = 'c'
      ) c) AS checks
  `);
  if (!schema) throw new Error("Missing service-card schema.");
  columns = schema.columns;
  checks = schema.checks;
  const cases = [
    { field: "unidad", constraint: "prestador_servicios_unidad_check", values: ["'hora'", "'visita'", "'trabajo'", "'sesion'", "'dia'", "'m2'", "'semana'"] },
    { field: "duracion_min", constraint: "prestador_servicios_duracion_min_check", values: ["NULL::integer", "14", "15", "1440", "1441"] },
    { field: "garantia_dias", constraint: "prestador_servicios_garantia_dias_check", values: ["-1", "0", "365", "366"] },
    { field: "radio_km", constraint: "prestadores_radio_km_check", values: ["0", "1", "200", "201"] },
    { field: "incluye", constraint: "prestador_servicios_incluye_chk", values: ["NULL::text", "repeat('x',600)", "repeat('x',601)"] },
    { field: "no_incluye", constraint: "prestador_servicios_no_incluye_check", values: ["NULL::text", "repeat('x',400)", "repeat('x',401)"] },
  ];
  const expressions = cases.flatMap(({ field, constraint, values }) => {
    const check = checks.find((c) => c.conname === constraint);
    if (!check?.definition.startsWith("CHECK (")) throw new Error(`Missing constraint ${constraint}`);
    const expression = check.definition.slice(6);
    return values.map((value, i) => `(SELECT ${expression} FROM (VALUES (${value})) AS input(${field})) AS ${field}_${i}`);
  });
  const [evaluated] = readRows<Record<string, boolean | null>>(`SELECT ${expressions.join(", ")}`);
  if (!evaluated) throw new Error("Missing constraint evaluations.");
  allowed = evaluated;
}, 60000);

test("all thirteen service-card columns exist with the requested nullability", () => {
  expect(columns).toHaveLength(13);
  expect(columns.filter((c) => c.is_nullable === "YES").map((c) => c.column_name).sort()).toEqual(["duracion_min", "no_incluye"]);
});

test("service details default to per-job pricing, no warranty and no included materials", () => {
  const defaults = Object.fromEntries(columns.filter((c) => c.table_name === "prestador_servicios").map((c) => [c.column_name, c.column_default]));
  expect(defaults).toEqual({ unidad: "'trabajo'::text", duracion_min: null, garantia_dias: "0", materiales_incluidos: "false", no_incluye: null });
});

test("professional details default to 15 km, Spanish and own tools", () => {
  const defaults = Object.fromEntries(columns.filter((c) => c.table_name === "prestadores").map((c) => [c.column_name, c.column_default]));
  expect(defaults).toEqual({ especialidades: "'{}'::text[]", comunas_cobertura: "'{}'::text[]", radio_km: "15", idiomas: "'{español}'::text[]", tiene_vehiculo: "false", herramientas_propias: "true", emite_boleta: "false", formas_pago_extra: "'{}'::text[]" });
});

test("charging units allow only hora, visita, trabajo, sesion, dia and m2", () => {
  expect(Array.from({ length: 7 }, (_, i) => allowed[`unidad_${i}`])).toEqual([true, true, true, true, true, true, false]);
});

test("duration is optional or between 15 and 1440 minutes inclusive", () => {
  expect(Array.from({ length: 5 }, (_, i) => allowed[`duracion_min_${i}`])).toEqual([true, false, true, true, false]);
});

test("warranty permits 0 to 365 days inclusive", () => {
  expect(Array.from({ length: 4 }, (_, i) => allowed[`garantia_dias_${i}`])).toEqual([false, true, true, false]);
});

test("coverage permits 1 to 200 km inclusive", () => {
  expect(Array.from({ length: 4 }, (_, i) => allowed[`radio_km_${i}`])).toEqual([false, true, true, false]);
});

test("included work is optional and limited to 600 characters", () => {
  expect(Array.from({ length: 3 }, (_, i) => allowed[`incluye_${i}`])).toEqual([true, true, false]);
});

test("excluded work is optional and limited to 400 characters", () => {
  expect(Array.from({ length: 3 }, (_, i) => allowed[`no_incluye_${i}`])).toEqual([true, true, false]);
});