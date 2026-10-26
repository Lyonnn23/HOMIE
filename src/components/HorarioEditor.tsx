import { useT } from "@/i18n";

export type DiaKey = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

// Type alias (no interface) para que sea asignable al tipo Json de Supabase.
export type DiaHorario = {
  activo: boolean;
  desde: string; // "HH:MM"
  hasta: string; // "HH:MM"
};

export type Horario = Record<DiaKey, DiaHorario>;

/** `label` en español (fuente de verdad); `clave` es la clave i18n "horario.*" para t(). */
export const DIAS: { key: DiaKey; label: string; clave: string }[] = [
  { key: "lun", label: "Lunes", clave: "horario.lun" },
  { key: "mar", label: "Martes", clave: "horario.mar" },
  { key: "mie", label: "Miércoles", clave: "horario.mie" },
  { key: "jue", label: "Jueves", clave: "horario.jue" },
  { key: "vie", label: "Viernes", clave: "horario.vie" },
  { key: "sab", label: "Sábado", clave: "horario.sab" },
  { key: "dom", label: "Domingo", clave: "horario.dom" },
];

type TFn = (clave: string, vars?: Record<string, string | number>) => string;

export function defaultHorario(): Horario {
  const base = (activo: boolean): DiaHorario => ({ activo, desde: "09:00", hasta: "18:00" });
  return {
    lun: base(true), mar: base(true), mie: base(true), jue: base(true), vie: base(true),
    sab: base(false), dom: base(false),
  };
}

/** Normaliza un valor jsonb (posiblemente vacío o parcial) a un Horario completo. */
export function parseHorario(raw: unknown): Horario {
  const def = defaultHorario();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return def;
  const obj = raw as Record<string, unknown>;
  for (const { key } of DIAS) {
    const d = obj[key];
    if (d && typeof d === "object" && !Array.isArray(d)) {
      const dd = d as Record<string, unknown>;
      def[key] = {
        activo: typeof dd.activo === "boolean" ? dd.activo : def[key].activo,
        desde: typeof dd.desde === "string" ? dd.desde : def[key].desde,
        hasta: typeof dd.hasta === "string" ? dd.hasta : def[key].hasta,
      };
    }
  }
  return def;
}

/** Devuelve un mensaje de error (traducido si se pasa `t`, español por defecto) o null si el horario es válido. */
export function validarHorario(h: Horario, t?: TFn): string | null {
  const activos = DIAS.filter((d) => h[d.key].activo);
  if (activos.length === 0) return t ? t("horario.errNinguno") : "Activa al menos un día de atención.";
  for (const d of activos) {
    const { desde, hasta } = h[d.key];
    const dia = (t ? t(d.clave) : d.label).toLowerCase();
    if (!desde || !hasta) return t ? t("horario.errIncompleto", { dia }) : `Completa el horario del ${dia}.`;
    if (desde >= hasta) return t ? t("horario.errOrden", { dia }) : `En ${dia}, la hora de inicio debe ser menor que la de término.`;
  }
  return null;
}

export function HorarioEditor({
  value, onChange, compact,
}: { value: Horario; onChange: (h: Horario) => void; compact?: boolean }) {
  const { t } = useT();
  function set(key: DiaKey, patch: Partial<DiaHorario>) {
    onChange({ ...value, [key]: { ...value[key], ...patch } });
  }
  function copiarATodos(key: DiaKey) {
    const src = value[key];
    const next = { ...value };
    for (const d of DIAS) {
      if (next[d.key].activo) next[d.key] = { ...next[d.key], desde: src.desde, hasta: src.hasta };
    }
    onChange(next);
  }

  return (
    <div className="rounded-2xl bg-white border border-border divide-y divide-border overflow-hidden">
      {DIAS.map(({ key, clave }) => {
        const d = value[key];
        return (
          <div key={key} className={`flex flex-wrap items-center gap-3 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
            <button
              type="button"
              onClick={() => set(key, { activo: !d.activo })}
              aria-pressed={d.activo}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                d.activo ? "bg-[#00C288]" : "bg-[#E5E7EB]"
              }`}
            >
              <span className={`inline-block size-4 rounded-full bg-white shadow transition ${d.activo ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className={`w-20 text-sm font-medium ${d.activo ? "text-[#111827]" : "text-muted-foreground"}`}>{t(clave)}</span>
            {d.activo ? (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="time"
                  value={d.desde}
                  onChange={(e) => set(key, { desde: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-foreground/30"
                />
                <span className="text-xs text-muted-foreground">{t("horario.a")}</span>
                <input
                  type="time"
                  value={d.hasta}
                  onChange={(e) => set(key, { hasta: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-foreground/30"
                />
                <button
                  type="button"
                  title={t("horario.copiarTitle")}
                  onClick={() => copiarATodos(key)}
                  className="hidden sm:inline text-[11px] text-[#EF9F27] font-semibold hover:underline"
                >
                  {t("horario.copiar")}
                </button>
              </div>
            ) : (
              <span className="ml-auto text-xs text-muted-foreground">{t("horario.cerrado")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
