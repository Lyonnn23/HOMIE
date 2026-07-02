import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/direcciones")({
  head: () => ({ meta: [{ title: "Direcciones guardadas — Homie" }] }),
  component: DireccionesPage,
});

interface DireccionRow {
  id: string;
  etiqueta: string;
  direccion: string;
  comuna: string | null;
  detalle: string | null;
}

interface FormState {
  id?: string;
  etiqueta: string;
  direccion: string;
  comuna: string;
  detalle: string;
}

const EMPTY: FormState = { etiqueta: "", direccion: "", comuna: "", detalle: "" };

function DireccionesPage() {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const usuarioId = usuario?.id;
  const [form, setForm] = useState<FormState | null>(null);

  const { data: direcciones = [], isLoading } = useQuery({
    queryKey: ["direcciones", usuarioId],
    enabled: !!usuarioId,
    queryFn: async (): Promise<DireccionRow[]> => {
      const { data, error } = await supabase
        .from("direcciones_guardadas")
        .select("id, etiqueta, direccion, comuna, detalle")
        .eq("usuario_id", usuarioId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      if (!usuarioId) throw new Error("Inicia sesión");
      const payload = {
        etiqueta: f.etiqueta.trim(),
        direccion: f.direccion.trim(),
        comuna: f.comuna.trim() || null,
        detalle: f.detalle.trim() || null,
      };
      if (!payload.etiqueta || !payload.direccion) {
        throw new Error("Completa la etiqueta y la dirección");
      }
      if (f.id) {
        const { error } = await supabase
          .from("direcciones_guardadas")
          .update(payload)
          .eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("direcciones_guardadas")
          .insert({ ...payload, usuario_id: usuarioId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, f) => {
      toast.success(f.id ? "Dirección actualizada" : "Dirección guardada");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["direcciones", usuarioId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("direcciones_guardadas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dirección eliminada");
      qc.invalidateQueries({ queryKey: ["direcciones", usuarioId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Direcciones guardadas</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Guarda tus direcciones frecuentes para reservar más rápido.</p>
        </div>
        {!form && (
          <button
            onClick={() => setForm(EMPTY)}
            aria-label="Agregar dirección"
            className="shrink-0 mt-1 size-10 rounded-full bg-[#111827] text-white flex items-center justify-center"
          >
            <Plus className="size-5" />
          </button>
        )}
      </header>

      <div className="px-5 pb-10 space-y-3">
        {form && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
            className="p-4 rounded-2xl bg-white border border-[#E5E7EB] space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">{form.id ? "Editar dirección" : "Nueva dirección"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Cerrar" className="text-[#9CA3AF]">
                <X className="size-4" />
              </button>
            </div>
            <input
              value={form.etiqueta}
              onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
              placeholder="Etiqueta (ej: Casa, Trabajo)"
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F27]"
            />
            <input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Calle y número"
              maxLength={160}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F27]"
            />
            <input
              value={form.comuna}
              onChange={(e) => setForm({ ...form, comuna: e.target.value })}
              placeholder="Comuna (opcional)"
              maxLength={60}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F27]"
            />
            <input
              value={form.detalle}
              onChange={(e) => setForm({ ...form, detalle: e.target.value })}
              placeholder="Depto, casa, referencia (opcional)"
              maxLength={120}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F27]"
            />
            <button
              type="submit"
              disabled={save.isPending}
              className="w-full py-3 rounded-xl bg-[#111827] text-white font-semibold text-sm disabled:opacity-60"
            >
              {save.isPending ? "Guardando…" : form.id ? "Guardar cambios" : "Guardar dirección"}
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-[#F5F5F0] animate-pulse" />
            ))}
          </div>
        ) : direcciones.length === 0 && !form ? (
          <div className="py-16 text-center">
            <div className="mx-auto size-16 rounded-full bg-[#F5F5F0] flex items-center justify-center">
              <MapPin className="size-7 text-[#9CA3AF]" />
            </div>
            <h2 className="mt-4 font-semibold">Sin direcciones guardadas</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Agrega tu casa u oficina para no escribirla cada vez.</p>
            <button
              onClick={() => setForm(EMPTY)}
              className="inline-block mt-6 px-5 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm"
            >
              Agregar dirección
            </button>
          </div>
        ) : (
          direcciones.map((d) => (
            <div key={d.id} className="p-4 rounded-2xl bg-white border border-[#E5E7EB] flex items-start gap-3">
              <div className="mt-0.5 size-9 rounded-full bg-[#FEF3E2] flex items-center justify-center shrink-0">
                <MapPin className="size-4 text-[#EF9F27]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{d.etiqueta}</div>
                <div className="text-sm text-[#6B7280] truncate">
                  {d.direccion}
                  {d.comuna ? `, ${d.comuna}` : ""}
                </div>
                {d.detalle && <div className="text-xs text-[#9CA3AF] truncate">{d.detalle}</div>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() =>
                    setForm({
                      id: d.id,
                      etiqueta: d.etiqueta,
                      direccion: d.direccion,
                      comuna: d.comuna ?? "",
                      detalle: d.detalle ?? "",
                    })
                  }
                  aria-label="Editar"
                  className="size-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#6B7280]"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => remove.mutate(d.id)}
                  disabled={remove.isPending}
                  aria-label="Eliminar"
                  className="size-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
