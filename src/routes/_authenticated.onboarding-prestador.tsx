import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { categories } from "@/data/services";

export const Route = createFileRoute("/_authenticated/onboarding-prestador")({
  head: () => ({ meta: [{ title: "Completa tu perfil — Manitos" }] }),
  component: OnboardingPrestador,
});

function OnboardingPrestador() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [bio, setBio] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>(categories[0]?.id ?? "home");
  const [servicios, setServicios] = useState<string[]>([]);
  const [precio, setPrecio] = useState<number>(15000);
  const [foto, setFoto] = useState("");
  const [direccion, setDireccion] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (usuario && usuario.tipo !== "prestador") {
      navigate({ to: "/" });
    }
  }, [usuario, navigate]);

  const activeCat = categories.find((c) => c.id === categoriaId);

  function toggleServicio(s: string) {
    setServicios((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!usuario) {
      setErr("Cargando tu perfil, intenta de nuevo en un momento.");
      return;
    }
    if (servicios.length === 0) {
      setErr("Selecciona al menos un servicio");
      return;
    }
    setSubmitting(true);

    if (foto) {
      await supabase.from("usuarios").update({ foto_url: foto }).eq("id", usuario.id);
    }

    const { data: prestador, error: pErr } = await supabase
      .from("prestadores")
      .insert({
        usuario_id: usuario.id,
        categoria_id: categoriaId,
        bio,
        direccion,
        precio_desde: precio,
        precio_hasta: Math.round(precio * 1.5),
        disponible_ahora: true,
        gallery_urls: [],
      })
      .select()
      .single();

    if (pErr || !prestador) {
      setSubmitting(false);
      setErr(pErr?.message ?? "No se pudo crear el perfil de prestador");
      return;
    }

    const { data: serviciosDb } = await supabase
      .from("servicios")
      .select("id, nombre")
      .eq("categoria_id", categoriaId)
      .in("nombre", servicios);

    if (serviciosDb && serviciosDb.length > 0) {
      await supabase.from("prestador_servicios").insert(
        serviciosDb.map((s) => ({
          prestador_id: prestador.id,
          servicio_id: s.id,
          precio,
        })),
      );
    }

    setSubmitting(false);
    navigate({ to: "/cuenta" });
  }

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_260)] py-10 px-5">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold tracking-tight">Completa tu perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cuéntanos sobre tu trabajo para que los clientes te encuentren.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Field label="Foto de perfil (URL)">
            <input
              type="url"
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
              placeholder="https://..."
              className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
            />
          </Field>

          <Field label="Sobre ti (bio)">
            <textarea
              required
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tengo 5 años de experiencia en..."
              className="w-full p-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 resize-none"
            />
          </Field>

          <Field label="Categoría">
            <select
              value={categoriaId}
              onChange={(e) => { setCategoriaId(e.target.value); setServicios([]); }}
              className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Servicios que ofreces">
            <div className="flex flex-wrap gap-2">
              {activeCat?.services.map((s) => {
                const on = servicios.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleServicio(s)}
                    className={`px-3.5 py-2 rounded-full text-sm border transition ${
                      on
                        ? "bg-foreground text-background border-foreground"
                        : "bg-white border-border text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Precio por hora (CLP)">
            <input
              type="number"
              required
              min={1000}
              step={1000}
              value={precio}
              onChange={(e) => setPrecio(Number(e.target.value))}
              className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
            />
          </Field>

          <Field label="Dirección base">
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Comuna o sector"
              className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
            />
          </Field>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Activar mi perfil"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-2">{label}</span>
      {children}
    </label>
  );
}
