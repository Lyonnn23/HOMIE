import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/admin/cupones")({
  head: () => ({ meta: [
    { name: "description", content: "Cupones de descuento y campañas de Homie." },
    { property: "og:title", content: "Cupones — Admin Homie" },
    { property: "og:description", content: "Cupones de descuento y campañas de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Cupones — Admin Homie" }] }),
  component: AdminCupones,
});

interface Cupon {
  codigo: string;
  descripcion: string | null;
  tipo: string;
  valor: number;
  tope: number | null;
  minimo: number;
  usos_max: number | null;
  usos_por_usuario: number;
  usos: number;
  solo_primera_compra: boolean;
  usuario_id: string | null;
  activo: boolean;
  vence_at: string | null;
  created_at: string;
}

const FORM_INICIAL = {
  codigo: "",
  descripcion: "",
  tipo: "porcentaje" as "monto" | "porcentaje",
  valor: "",
  tope: "",
  minimo: "0",
  usos_max: "",
  usos_por_usuario: "1",
  solo_primera_compra: false,
  vence_at: "",
};

function AdminCupones() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(FORM_INICIAL);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState<"campanas" | "personales" | "todos">("campanas");

  const isAdminQ = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).in("role", ["admin", "superadmin"]);
      return (data ?? []).length > 0;
    },
  });

  const cuponesQ = useQuery({
    queryKey: ["admin-cupones"],
    enabled: isAdminQ.data === true,
    queryFn: async (): Promise<Cupon[]> => {
      const { data, error } = await supabase.from("cupones").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cupon[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ codigo, activo }: { codigo: string; activo: boolean }) => {
      const { error } = await supabase.from("cupones").update({ activo }).eq("codigo", codigo);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cupones"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const crear = useMutation({
    mutationFn: async () => {
      const codigo = form.codigo.trim().toUpperCase().replace(/\s+/g, "");
      if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) throw new Error("Código: 3 a 30 letras, números, guion o guion bajo");
      const valor = Number(form.valor);
      if (!Number.isInteger(valor) || valor <= 0) throw new Error("El valor debe ser un entero mayor que 0");
      if (form.tipo === "porcentaje" && valor > 100) throw new Error("El porcentaje no puede superar 100");
      const tope = form.tope.trim() ? Number(form.tope) : null;
      const minimo = form.minimo.trim() ? Number(form.minimo) : 0;
      const usos_max = form.usos_max.trim() ? Number(form.usos_max) : null;
      const usos_por_usuario = form.usos_por_usuario.trim() ? Number(form.usos_por_usuario) : 1;
      for (const [k, v] of [["tope", tope], ["mínimo", minimo], ["usos máximos", usos_max], ["usos por usuario", usos_por_usuario]] as const) {
        if (v !== null && (!Number.isInteger(v) || v < 0)) throw new Error(`Revisa el campo ${k}`);
      }
      const { error } = await supabase.from("cupones").insert({
        codigo,
        descripcion: form.descripcion.trim() || null,
        tipo: form.tipo,
        valor,
        tope,
        minimo,
        usos_max,
        usos_por_usuario: Math.max(1, usos_por_usuario),
        solo_primera_compra: form.solo_primera_compra,
        vence_at: form.vence_at ? new Date(form.vence_at + "T23:59:59").toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cupón creado");
      setForm(FORM_INICIAL);
      setMostrarForm(false);
      qc.invalidateQueries({ queryKey: ["admin-cupones"] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  const todos = cuponesQ.data ?? [];
  const campanas = todos.filter((c) => !c.usuario_id);
  const personales = todos.filter((c) => !!c.usuario_id);
  const visibles = filtro === "campanas" ? campanas : filtro === "personales" ? personales : todos;
  const usosTotales = todos.reduce((a, c) => a + c.usos, 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    crear.mutate();
  }

  const input = "w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-sm outline-none focus:border-[#111827]/40";

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-[#111827] text-white px-5 py-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"><ArrowLeft className="size-3.5" /> Panel</Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 mt-2"><Ticket className="size-6 text-[#EF9F27]" /> Cupones</h1>
        <p className="text-sm text-white/70 mt-1">{campanas.length} campañas · {personales.length} personales (referidos) · {usosTotales} usos en total</p>
      </header>

      <main className="px-5 py-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2" role="tablist" aria-label="Filtrar">
            {([["campanas", "Campañas"], ["personales", "Personales"], ["todos", "Todos"]] as const).map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={filtro === k}
                onClick={() => setFiltro(k)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${filtro === k ? "bg-[#111827] text-white border-[#111827]" : "bg-white text-[#111827] border-[#E5E7EB]"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => setMostrarForm((v) => !v)} className="btn-primary btn-sm inline-flex items-center gap-1.5">
            <Plus className="size-4" /> Nuevo cupón
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-medium text-[#374151]">
              Código
              <input className={input + " mt-1 uppercase"} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="HOMIE20" required maxLength={30} />
            </label>
            <label className="text-xs font-medium text-[#374151]">
              Descripción (la ve el cliente)
              <input className={input + " mt-1"} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="20% en tu primera reserva" maxLength={120} />
            </label>
            <label className="text-xs font-medium text-[#374151]">
              Tipo
              <select className={input + " mt-1"} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "monto" | "porcentaje" })}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (CLP)</option>
              </select>
            </label>
            <label className="text-xs font-medium text-[#374151]">
              Valor {form.tipo === "porcentaje" ? "(%)" : "(CLP)"}
              <input className={input + " mt-1"} type="number" min={1} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </label>
            {form.tipo === "porcentaje" && (
              <label className="text-xs font-medium text-[#374151]">
                Tope de descuento (CLP, opcional)
                <input className={input + " mt-1"} type="number" min={0} value={form.tope} onChange={(e) => setForm({ ...form, tope: e.target.value })} placeholder="10000" />
              </label>
            )}
            <label className="text-xs font-medium text-[#374151]">
              Compra mínima (CLP)
              <input className={input + " mt-1"} type="number" min={0} value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-[#374151]">
              Usos máximos (vacío = ilimitado)
              <input className={input + " mt-1"} type="number" min={1} value={form.usos_max} onChange={(e) => setForm({ ...form, usos_max: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-[#374151]">
              Usos por usuario
              <input className={input + " mt-1"} type="number" min={1} value={form.usos_por_usuario} onChange={(e) => setForm({ ...form, usos_por_usuario: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-[#374151]">
              Vence el (opcional)
              <input className={input + " mt-1"} type="date" value={form.vence_at} onChange={(e) => setForm({ ...form, vence_at: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-[#374151] flex items-center gap-2 self-end pb-2">
              <input type="checkbox" checked={form.solo_primera_compra} onChange={(e) => setForm({ ...form, solo_primera_compra: e.target.checked })} className="size-4 accent-[#EF9F27]" />
              Solo primera compra
            </label>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => { setMostrarForm(false); setForm(FORM_INICIAL); }} className="btn-secondary btn-sm">Cancelar</button>
              <button type="submit" disabled={crear.isPending} className="btn-primary btn-sm inline-flex items-center gap-1.5">
                {crear.isPending && <Loader2 className="size-4 animate-spin" />} Crear cupón
              </button>
            </div>
          </form>
        )}

        {cuponesQ.isLoading && <div className="text-center py-8"><Loader2 className="size-5 mx-auto animate-spin" /></div>}
        {cuponesQ.error && <div className="card p-4 text-sm text-[#FF3B6B]">{(cuponesQ.error as Error).message}</div>}
        {!cuponesQ.isLoading && visibles.length === 0 && (
          <div className="card p-6 text-sm text-muted-foreground text-center">No hay cupones en esta vista.</div>
        )}

        <div className="space-y-2">
          {visibles.map((c) => {
            const vencido = !!c.vence_at && new Date(c.vence_at) < new Date();
            const agotado = c.usos_max !== null && c.usos >= c.usos_max;
            const vigente = c.activo && !vencido && !agotado;
            return (
              <div key={c.codigo} className={`card p-4 flex items-start gap-3 ${!vigente ? "opacity-70" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#111827]">{c.codigo}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[10px] font-semibold text-[#374151]">
                      {c.tipo === "porcentaje" ? `${c.valor}%${c.tope ? ` (tope ${formatCLP(c.tope)})` : ""}` : formatCLP(c.valor)}
                    </span>
                    {c.usuario_id && <span className="px-2 py-0.5 rounded-full bg-[#FFF6E5] text-[10px] font-semibold text-[#B45309]">personal</span>}
                    {c.solo_primera_compra && <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[10px] font-semibold text-[#0E7490]">1ª compra</span>}
                    {vencido && <span className="px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[10px] font-semibold text-[#B91C1C]">vencido</span>}
                    {agotado && <span className="px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[10px] font-semibold text-[#B91C1C]">agotado</span>}
                  </div>
                  {c.descripcion && <div className="text-sm text-[#374151] mt-1">{c.descripcion}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Usos: <span className="font-semibold text-[#111827]">{c.usos}</span>{c.usos_max !== null ? ` / ${c.usos_max}` : ""} · {c.usos_por_usuario} por usuario
                    {c.minimo > 0 ? ` · mínimo ${formatCLP(c.minimo)}` : ""}
                    {c.vence_at ? ` · vence ${new Date(c.vence_at).toLocaleDateString("es-CL")}` : " · sin vencimiento"}
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={c.activo}
                  aria-label={`Cupón ${c.codigo} ${c.activo ? "activo" : "inactivo"}`}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ codigo: c.codigo, activo: !c.activo })}
                  className={`relative w-12 h-7 rounded-full transition shrink-0 ${c.activo ? "bg-[#EF9F27]" : "bg-[#E5E7EB]"}`}
                >
                  <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${c.activo ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
