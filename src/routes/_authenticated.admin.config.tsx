import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/config")({
  head: () => ({ meta: [
    { name: "description", content: "Configuración de cobros de Homie: comisiones, periodo gratis, Premium y ranking." },
    { property: "og:title", content: "Configuración de cobros — Admin Homie" },
    { property: "og:description", content: "Configuración de cobros de Homie: comisiones, periodo gratis, Premium y ranking." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Configuración de cobros — Admin Homie" }] }),
  component: AdminConfig,
});

interface ConfigRow { clave: string; valor: number; descripcion: string | null }

type Formato = "fraccion" | "dias" | "rating" | "entero";

/** Explicación y formato de cada clave conocida. Las claves nuevas se muestran igual, sin explicación. */
const CLAVES: Record<string, { titulo: string; formato: Formato; ayuda: string }> = {
  comision_normal: {
    titulo: "Comisión normal",
    formato: "fraccion",
    ayuda: "Fracción que Homie descuenta del pago al profesional por cada servicio completado, después del periodo gratis y sin Premium. 0.15 = 15%. El cliente nunca paga este monto: paga exactamente el precio del profesional.",
  },
  comision_premium: {
    titulo: "Comisión Premium",
    formato: "fraccion",
    ayuda: "Fracción descontada a profesionales con Homie Premium vigente, después del periodo gratis. 0.12 = 12%. Debe ser menor que la comisión normal para que Premium tenga sentido.",
  },
  comision_gratis: {
    titulo: "Comisión durante el periodo gratis",
    formato: "fraccion",
    ayuda: "Fracción descontada durante los primeros meses desde la verificación. Nota: Mercado Pago cobra ~3,5% + IVA por cada pago; con 0 Homie absorbe ese costo. 0.04 cubre aproximadamente el costo de Mercado Pago sin ganancia para Homie.",
  },
  dias_gratis: {
    titulo: "Días sin comisión",
    formato: "dias",
    ayuda: "Días de periodo gratis desde que el perfil queda verificado (90 = 3 meses). Se aplica a los profesionales que se verifiquen desde ahora; los ya verificados mantienen su fecha.",
  },
  premium_trial_dias: {
    titulo: "Días de prueba Premium",
    formato: "dias",
    ayuda: "Días de Homie Premium gratis que recibe cada profesional al verificarse (90 = 3 meses). Mientras dura la prueba tiene el destacado dorado y, cuando termine el periodo gratis, la comisión Premium.",
  },
  ranking_min_rating_premium: {
    titulo: "Calificación mínima para que Premium empuje",
    formato: "rating",
    ayuda: "Premium solo suma puntos en el ranking si el profesional tiene al menos esta calificación promedio (ej. 4.0). Evita que un perfil malo compre posición.",
  },
  ranking_min_resenas_premium: {
    titulo: "Reseñas mínimas para que Premium empuje",
    formato: "entero",
    ayuda: "Cantidad mínima de reseñas para que el empuje Premium aplique (ej. 3). Con menos reseñas, Premium solo cambia la apariencia del perfil.",
  },
};

const ORDEN = Object.keys(CLAVES);

function formatear(valor: number, formato: Formato) {
  switch (formato) {
    case "fraccion": return `${Math.round(valor * 10000) / 100}%`;
    case "dias": return `${valor} ${valor === 1 ? "día" : "días"}`;
    case "rating": return `${valor.toFixed(1)} ★`;
    default: return String(valor);
  }
}

function stepDe(formato: Formato) {
  return formato === "fraccion" ? "0.01" : formato === "rating" ? "0.1" : "1";
}

function validar(valor: number, formato: Formato): string | null {
  if (!Number.isFinite(valor) || valor < 0) return "Debe ser un número mayor o igual a 0";
  if (formato === "fraccion" && valor > 1) return "Es una fracción: usa 0.15 para 15%";
  if (formato === "rating" && valor > 5) return "La calificación va de 0 a 5";
  if ((formato === "dias" || formato === "entero") && !Number.isInteger(valor)) return "Debe ser un número entero";
  return null;
}

function AdminConfig() {
  const { user } = useAuth();

  const isAdminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).in("role", ["admin", "superadmin"]);
      return (data ?? []).length > 0;
    },
  });

  const configQ = useQuery({
    queryKey: ["admin-config-publica"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<ConfigRow[]> => {
      const { data, error } = await supabase.from("config_publica").select("clave, valor, descripcion");
      if (error) throw error;
      const rows = (data ?? []).map((r) => ({ ...r, valor: Number(r.valor) }));
      rows.sort((a, b) => {
        const ia = ORDEN.indexOf(a.clave); const ib = ORDEN.indexOf(b.clave);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.clave.localeCompare(b.clave);
      });
      return rows;
    },
  });

  if (isAdminQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  }
  if (!isAdminQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta sección es solo para administradores.</p>
          <Link to="/" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-[#111827] text-white text-sm font-semibold">Ir al inicio</Link>
        </div>
      </div>
    );
  }

  const rows = configQ.data ?? [];
  const get = (clave: string) => rows.find((r) => r.clave === clave)?.valor;
  const normal = get("comision_normal") ?? 0.15;
  const premium = get("comision_premium") ?? 0.12;
  const gratis = get("comision_gratis") ?? 0;

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-[#111827] text-white px-5 py-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"><ArrowLeft className="size-3.5" /> Panel</Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 mt-2"><SlidersHorizontal className="size-6 text-[#EF9F27]" /> Configuración de cobros</h1>
        <p className="text-sm text-white/70 mt-1">
          Los cambios aplican de inmediato a las reservas nuevas (la BD lee estos valores con <code className="font-mono">cfg()</code>). No afectan reservas ya creadas.
        </p>
      </header>

      <main className="px-5 py-6 max-w-3xl mx-auto space-y-4">
        <section className="card p-4 text-sm">
          <div className="font-semibold text-[#111827]">Cómo funciona el modelo</div>
          <ul className="mt-2 space-y-1 text-muted-foreground text-xs list-disc pl-4">
            <li>El cliente paga exactamente el precio del profesional (menos cupón). Nunca se le suma un recargo.</li>
            <li>La comisión se descuenta del pago al profesional: 0% hasta que termina su periodo gratis, luego {formatear(normal, "fraccion")} (o {formatear(premium, "fraccion")} con Premium).</li>
            <li>Durante el periodo gratis la comisión es {formatear(gratis, "fraccion")}. Mercado Pago cobra ~3,5% + IVA por cada pago; si está en 0, Homie absorbe ese costo.</li>
            <li>Premium cambia la apariencia (dorado) siempre, pero solo empuja en el ranking con buena reputación.</li>
          </ul>
        </section>

        {configQ.isLoading ? (
          <div className="p-8 text-center"><Loader2 className="size-5 mx-auto animate-spin text-muted-foreground" /></div>
        ) : configQ.error ? (
          <div className="card p-4 text-sm text-[#B3123F]">No se pudo cargar la configuración: {(configQ.error as Error).message}</div>
        ) : rows.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted-foreground">
            La tabla <code className="font-mono">config_publica</code> está vacía. Aplica la migración de cobros para crear los valores iniciales.
          </div>
        ) : (
          <section className="space-y-3">
            {rows.map((r) => <FilaConfig key={r.clave} row={r} />)}
          </section>
        )}
      </main>
    </div>
  );
}

function FilaConfig({ row }: { row: ConfigRow }) {
  const qc = useQueryClient();
  const meta = CLAVES[row.clave];
  const formato: Formato = meta?.formato ?? (Number.isInteger(row.valor) && row.valor > 1 ? "entero" : "fraccion");
  const [texto, setTexto] = useState(String(row.valor));

  useEffect(() => { setTexto(String(row.valor)); }, [row.valor]);

  const valor = Number(texto);
  const error = texto.trim() === "" ? "Ingresa un valor" : validar(valor, formato);
  const cambiado = !error && valor !== row.valor;

  const guardar = useMutation({
    mutationFn: async () => {
      if (error) throw new Error(error);
      const { error: e } = await supabase.from("config_publica").update({ valor }).eq("clave", row.clave);
      if (e) throw e;
    },
    onSuccess: () => {
      toast.success(`${meta?.titulo ?? row.clave}: ${formatear(valor, formato)}`);
      qc.invalidateQueries({ queryKey: ["admin-config-publica"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-[#111827]">{meta?.titulo ?? row.clave}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{row.clave}</div>
          <p className="mt-1.5 text-xs text-muted-foreground">{meta?.ayuda ?? row.descripcion ?? "Sin descripción."}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Actual</div>
          <div className="font-bold text-[#111827]">{formatear(row.valor, formato)}</div>
        </div>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          type="number" inputMode="decimal" min={0} step={stepDe(formato)} value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label={`Valor de ${meta?.titulo ?? row.clave}`}
          className="w-36 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-sm outline-none focus:border-[#111827]/40 tabular-nums"
        />
        <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
          {error ? <span className="text-[#B3123F]">{error}</span> : cambiado ? `Nuevo: ${formatear(valor, formato)}` : "Sin cambios"}
        </span>
        <button
          type="submit" disabled={!cambiado || guardar.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111827] text-white text-xs font-semibold disabled:opacity-40"
        >
          {guardar.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
        </button>
      </form>
    </div>
  );
}
