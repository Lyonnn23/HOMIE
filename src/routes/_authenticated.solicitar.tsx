import { comprimirImagen } from "@/lib/imagen";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, X, Loader2, Sparkles, ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { groups, categoriesOfGroup, formatCLP } from "@/data/services";
import { useEnvioUnico } from "@/lib/doble-envio";
import { useServerFn } from "@tanstack/react-start";
import { moderarTexto } from "@/lib/moderacion.functions";
import { evento } from "@/lib/analitica";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/solicitar")({
  head: () => ({ meta: [
    { name: "description", content: "Solicita cotizaciones para un servicio de profesionales de Homie." },
    { property: "og:title", content: "Pide cotizaciones — Homie" },
    { property: "og:description", content: "Solicita cotizaciones para un servicio de profesionales de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Pide cotizaciones — Homie" }] }),
  component: SolicitarPage,
});

const MAX_FOTOS = 4;
const inputCls =
  "w-full px-4 py-3 rounded-2xl bg-white border border-border text-sm outline-none focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/20";

function SolicitarPage() {
  const { t } = useT();
  const { usuario, user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categoriaId, setCategoriaId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const moderar = useServerFn(moderarTexto);
  const [fotos, setFotos] = useState<File[]>([]);
  const [comuna, setComuna] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaDeseada, setFechaDeseada] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [presupuesto, setPresupuesto] = useState("");
  const [sending, setSending] = useState(false);
  const [enviando, ejecutar] = useEnvioUnico();

  const previews = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);

  const serviciosQ = useQuery({
    queryKey: ["servicios-categoria", categoriaId],
    enabled: !!categoriaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("id, nombre")
        .eq("categoria_id", categoriaId)
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const presupuestoNum = Number(presupuesto.replace(/\D/g, "")) || 0;
  const valid = !!categoriaId && titulo.trim().length >= 5 && titulo.trim().length <= 120 && detalle.trim().length >= 20;

  function addFotos(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const next = [...fotos, ...incoming].slice(0, MAX_FOTOS);
    if (fotos.length + incoming.length > MAX_FOTOS) toast.info(t("solicitar.maxFotos", { n: MAX_FOTOS }));
    setFotos(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void ejecutar(enviarSolicitud);
  }

  async function enviarSolicitud() {
    if (!valid || !usuario || !user) return;
    setSending(true);
    try {
      try {
        const mod = await moderar({ data: { texto: `${titulo.trim()}\n${detalle.trim()}`, origen: "solicitud" } });
        if (!mod.ok) {
          toast.error(mod.mensaje ?? t("solicitar.normas"));
          setSending(false);
          return;
        }
      } catch {
        /* si la moderación falla, se permite publicar */
      }
      const paths: string[] = [];
      for (const f of fotos) {
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("solicitudes").upload(path, await comprimirImagen(f), { upsert: false });
        if (up.error) throw up.error;
        paths.push(path);
      }
      const { data, error } = await supabase
        .from("solicitudes")
        .insert({
          cliente_id: usuario.id,
          categoria_id: categoriaId,
          servicio_id: servicioId || null,
          titulo: titulo.trim(),
          detalle: detalle.trim(),
          fotos: paths,
          comuna: comuna.trim() || null,
          direccion: direccion.trim() || null,
          fecha_deseada: fechaDeseada || null,
          urgente,
          presupuesto_max: presupuestoNum > 0 ? presupuestoNum : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      evento("solicitud_publicada", { solicitud_id: data.id, categoria_id: categoriaId, urgente, fotos: paths.length, con_presupuesto: presupuestoNum > 0 });
      toast.success(t("solicitar.publicada"));
      navigate({ to: "/solicitudes/$id", params: { id: data.id } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("solicitar.errPublicar"));
      setSending(false);
    }
  }

  if (usuario?.tipo === "prestador") {
    return (
      <AppShell>
        <header className="px-5 pt-6 pb-2">
          <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{t("solicitar.titulo")}</h1>
        </header>
        <div className="px-5 mt-4">
          <div className="p-5 rounded-3xl bg-white border border-border">
            <div className="font-semibold">{t("solicitar.paraClientes")}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("solicitar.paraClientesSub")}
            </p>
            <Link
              to="/cotizar"
              className="mt-4 inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm"
            >
              {t("solicitar.irCotizar")}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-6 pb-6">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{t("solicitar.titulo")}</h1>
        <p className="mt-2 text-sm text-white/80">
          {t("solicitar.sub")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10"><BadgeCheck className="size-3.5 text-[#EF9F27]" /> {t("solicitar.soloVerificados")}</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10"><ShieldCheck className="size-3.5 text-[#EF9F27]" /> {t("solicitar.precioProtegido")}</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10"><Sparkles className="size-3.5 text-[#EF9F27]" /> {t("solicitar.sinCompromiso")}</span>
        </div>
      </header>

      <form onSubmit={submit} className="px-5 mt-5 space-y-5 pb-10">
        <Field label={t("solicitar.categoria")} required>
          <select
            required
            value={categoriaId}
            onChange={(e) => { setCategoriaId(e.target.value); setServicioId(""); }}
            className={inputCls}
          >
            <option value="">{t("solicitar.eligeCategoria")}</option>
            {groups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {categoriesOfGroup(g.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label={t("solicitar.servicio")} hint={t("solicitar.servicioHint")}>
          <select
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            disabled={!categoriaId || serviciosQ.isLoading}
            className={`${inputCls} disabled:opacity-60`}
          >
            <option value="">{categoriaId ? t("solicitar.cualquiera") : t("solicitar.primeroCategoria")}</option>
            {(serviciosQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </Field>

        <Field label={t("solicitar.tituloCampo")} required hint={`${titulo.trim().length}/120`}>
          <input
            required
            minLength={5}
            maxLength={120}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t("solicitar.tituloPlaceholder")}
            className={inputCls}
          />
        </Field>

        <Field
          label={t("solicitar.detalle")}
          required
          hint={detalle.trim().length < 20 ? t("solicitar.min20", { n: detalle.trim().length }) : `${detalle.trim().length}/2000`}
        >
          <textarea
            required
            minLength={20}
            maxLength={2000}
            rows={5}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder={t("solicitar.detallePlaceholder")}
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label={t("solicitar.fotos")} asDiv hint={t("solicitar.fotosHint", { n: MAX_FOTOS })}>
          <div className="grid grid-cols-4 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted">
                <img src={src} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label={t("solicitar.quitarFoto")}
                  onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 size-6 rounded-full bg-[#111827]/80 text-white flex items-center justify-center"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-border bg-white flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-[#EF9F27] hover:text-[#111827]"
              >
                <ImagePlus className="size-5" />
                <span className="text-[10px] font-semibold">{t("solicitar.agregar")}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFotos(e.target.files)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("solicitar.comuna")}>
            <input value={comuna} onChange={(e) => setComuna(e.target.value)} placeholder={t("solicitar.comunaPlaceholder")} className={inputCls} />
          </Field>
          <Field label={t("solicitar.fechaDeseada")}>
            <input type="date" min={today} value={fechaDeseada} onChange={(e) => setFechaDeseada(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label={t("solicitar.direccion")} hint={t("solicitar.direccionHint")}>
          <div className="relative">
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder={t("solicitar.direccionPlaceholder")}
              className={`${inputCls} pr-10`}
            />
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        </Field>

        <div className="p-4 rounded-2xl bg-white border border-border flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{t("solicitar.esUrgente")}</div>
            <div className="text-xs text-muted-foreground">{t("solicitar.esUrgenteSub")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={urgente}
            onClick={() => setUrgente(!urgente)}
            className={`shrink-0 relative w-12 h-7 rounded-full transition-colors ${urgente ? "bg-[#EF9F27]" : "bg-[#D1D5DB]"}`}
          >
            <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${urgente ? "left-6" : "left-1"}`} />
          </button>
        </div>

        <Field label={t("solicitar.presupuesto")} hint={presupuestoNum > 0 ? t("solicitar.presupuestoHasta", { monto: formatCLP(presupuestoNum) }) : t("solicitar.presupuestoHint")}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              inputMode="numeric"
              value={presupuesto}
              onChange={(e) => setPresupuesto(e.target.value.replace(/\D/g, ""))}
              placeholder="150000"
              className={`${inputCls} pl-8`}
            />
          </div>
        </Field>

        <button
          type="submit"
          disabled={!valid || sending || enviando}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold text-sm disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : null}
          {sending ? t("solicitar.publicando") : t("solicitar.publicar")}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          {t("solicitar.abierta7")}
        </p>
      </form>
    </AppShell>
  );
}

function Field({ label, hint, required, asDiv, children }: { label: string; hint?: string; required?: boolean; asDiv?: boolean; children: React.ReactNode }) {
  const Tag = asDiv ? "div" : "label";
  return (
    <Tag className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-semibold">
          {label}{required && <span className="text-[#FF3B6B]"> *</span>}
        </span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </Tag>
  );
}
