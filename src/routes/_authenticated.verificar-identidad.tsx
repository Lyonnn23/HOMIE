import { comprimirImagen } from "@/lib/imagen";
import { requisitosDe } from "@/data/requisitos";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, ChevronLeft, Clock, Upload, Plus, X, AlertCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { mensajeError } from "@/lib/errores";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/verificar-identidad")({
  head: () => ({ meta: [
    { name: "description", content: "Verificación de identidad y documentos de tu perfil profesional en Homie." },
    { property: "og:title", content: "Verificar identidad — Homie" },
    { property: "og:description", content: "Verificación de identidad y documentos de tu perfil profesional en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Verificar identidad — Homie" }] }),
  component: VerificarIdentidad,
});

type FileSlot = { file: File; preview: string } | null;
type CertSlot = { tipo: string; file: FileSlot };
const MAX_CERTS = 3;

function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    .slice(0, 40) || "general";
}

function VerificarIdentidad() {
  const { t } = useT();
  const { user, usuario } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [frente, setFrente] = useState<FileSlot>(null);
  const [reverso, setReverso] = useState<FileSlot>(null);
  const [selfie, setSelfie] = useState<FileSlot>(null);
  const [certs, setCerts] = useState<CertSlot[]>([{ tipo: "", file: null }]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const prestadorQ = useQuery({
    queryKey: ["mi-prestador", usuario?.id],
    enabled: !!usuario?.id && usuario.tipo === "prestador",
    queryFn: async () => {
      const { data } = await supabase
        .from("prestadores")
        .select("id, verificado, verificado_identidad, categoria_id")
        .eq("usuario_id", usuario!.id)
        .maybeSingle();
      return data;
    },
  });

  const verifQ = useQuery({
    queryKey: ["mi-verificacion", prestadorQ.data?.id],
    enabled: !!prestadorQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("verificaciones_prestador")
        .select("id, estado, motivo_rechazo, created_at")
        .eq("prestador_id", prestadorQ.data!.id)
        .order("created_at", { ascending: false })
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (usuario && usuario.tipo !== "prestador") navigate({ to: "/" });
  }, [usuario, navigate]);

  if (!usuario || prestadorQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground"><span className="size-5 rounded-full border-2 border-[#EF9F27] border-t-transparent animate-spin" aria-label={t("verificar.cargando")} /></div>;
  }
  if (!prestadorQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">{t("verificar.completaPerfil")}</p>
          <Link to="/onboarding-prestador" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold text-sm">
            {t("verificar.completarPerfil")}
          </Link>
        </div>
      </div>
    );
  }

  if (done || (verifQ.data && verifQ.data.estado === "pendiente")) {
    return <ConfirmacionEnviada motivo={verifQ.data?.motivo_rechazo ?? null} />;
  }

  if (prestadorQ.data.verificado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <div className="mx-auto size-16 rounded-full bg-[#111827] flex items-center justify-center">
            <ShieldCheck className="size-8 text-[#EF9F27]" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">{t("verificar.yaVerificado")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("verificar.yaVerificadoSub")}</p>
          <Link to="/panel" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm">
            {t("verificar.volverPanel")}
          </Link>
        </div>
      </div>
    );
  }

  async function uploadFile(file: File, slug: string) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/${prestadorQ.data!.id}/${slug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("verificaciones").upload(path, await comprimirImagen(file), { upsert: true });
    if (error) throw error;
    return path;
  }

  async function enviar() {
    setErr(null);
    if (!frente || !reverso || !selfie) {
      setErr(t("verificar.faltanFotos"));
      return;
    }
    const certsListos = certs.filter((c) => c.file);
    if (certsListos.length === 0) {
      setErr(t("verificar.faltaCert"));
      return;
    }
    if (certsListos.some((c) => !c.tipo.trim())) {
      setErr(t("verificar.faltaTipo"));
      return;
    }
    setSubmitting(true);
    try {
      const [pFrente, pReverso, pSelfie] = await Promise.all([
        uploadFile(frente.file, "carnet-frente"),
        uploadFile(reverso.file, "carnet-reverso"),
        uploadFile(selfie.file, "selfie"),
      ]);
      const certPaths: string[] = [];
      for (let i = 0; i < certsListos.length; i++) {
        const c = certsListos[i];
        const p = await uploadFile(c.file!.file, `cert-${i + 1}-${slugify(c.tipo)}`);
        certPaths.push(p);
      }
      const { error } = await supabase.from("verificaciones_prestador").insert({
        prestador_id: prestadorQ.data!.id,
        foto_carnet_frente: pFrente,
        foto_carnet_reverso: pReverso,
        foto_selfie: pSelfie,
        certificados: certPaths,
        estado: "pendiente",
      });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setErr(mensajeError(e, t("verificar.errEnviar"), t));
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [t("verificar.stepFrente"), t("verificar.stepReverso"), t("verificar.stepSelfie"), t("verificar.stepCerts")];

  return (
    <div className="min-h-screen bg-[#F5F5F0] pb-32">
      <header className="bg-[#111827] text-white px-5 pt-6 pb-5">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate({ to: "/panel" }))} className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="mt-2 text-2xl font-bold">{t("verificar.titulo")}</h1>
        <p className="text-sm text-white/70 mt-1">{t("verificar.pasoDe", { n: step, total: 4, nombre: steps[step - 1] })}</p>
        <div className="mt-4 flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-[#EF9F27]" : "bg-white/15"}`} />
          ))}
        </div>
      </header>

      <main className="px-5 pt-6 max-w-lg mx-auto">
        {step === 1 && (
          <StepFoto
            title={t("verificar.frenteTitulo")}
            help={t("verificar.frenteHelp")}
            slot={frente}
            onPick={setFrente}
          />
        )}
        {step === 2 && (
          <StepFoto
            title={t("verificar.reversoTitulo")}
            help={t("verificar.reversoHelp")}
            slot={reverso}
            onPick={setReverso}
          />
        )}
        {step === 3 && (
          <StepFoto
            title={t("verificar.selfieTitulo")}
            help={t("verificar.selfieHelp")}
            slot={selfie}
            onPick={setSelfie}
            circular
          />
        )}
        {step === 4 && (
          <StepCertificados certs={certs} setCerts={setCerts} categoriaId={prestadorQ.data.categoria_id} />
        )}

        {err && (
          <div className="mt-4 p-3 rounded-xl bg-[#FF3B6B]/10 border border-[#FF3B6B]/30 text-sm text-[#FF3B6B] flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" /> {err}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E7EB] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto">
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !frente) || (step === 2 && !reverso) || (step === 3 && !selfie)}
              className="w-full h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold disabled:opacity-40"
            >
              {t("comun.continuar")}
            </button>
          ) : (
            <button
              onClick={enviar}
              disabled={submitting || !certs.some((c) => c.file)}
              className="w-full h-12 rounded-2xl bg-[#111827] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? t("verificar.enviando") : t("verificar.enviarSolicitud")}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function StepFoto({
  title, help, slot, onPick, circular,
}: {
  title: string; help: string; slot: FileSlot; onPick: (s: FileSlot) => void; circular?: boolean;
}) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  function handle(f: File | undefined) {
    if (!f) return;
    onPick({ file: f, preview: URL.createObjectURL(f) });
  }
  return (
    <div>
      <h2 className="text-xl font-bold text-[#111827]">{title}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{help}</p>

      <div className={`mt-5 mx-auto bg-white border-2 border-dashed border-[#E5E7EB] flex items-center justify-center overflow-hidden ${circular ? "size-64 rounded-full" : "aspect-[16/10] w-full rounded-2xl"}`}>
        {slot ? (
          <img src={slot.preview} alt="" className="size-full object-cover" />
        ) : (
          <div className="text-center text-[#9CA3AF] text-xs px-4">
            <Camera className="size-8 mx-auto text-[#EF9F27]" />
            <p className="mt-2">{t("verificar.fotoAqui")}</p>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => camRef.current?.click()} className="h-12 rounded-2xl bg-[#111827] text-white text-sm font-semibold flex items-center justify-center gap-2">
          <Camera className="size-4" /> {t("verificar.tomarFoto")}
        </button>
        <button onClick={() => ref.current?.click()} className="h-12 rounded-2xl bg-white border border-[#E5E7EB] text-[#111827] text-sm font-semibold flex items-center justify-center gap-2">
          <Upload className="size-4" /> {t("verificar.galeria")}
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function StepCertificados({
  certs, setCerts, categoriaId,
}: { certs: CertSlot[]; setCerts: (c: CertSlot[]) => void; categoriaId: string | null }) {
  const { t, idioma } = useT();
  const req = requisitosDe(categoriaId, idioma);
  function update(i: number, patch: Partial<CertSlot>) {
    setCerts(certs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function agregarConTipo(tipo: string) {
    const vacio = certs.findIndex((c) => !c.tipo && !c.file);
    if (vacio >= 0) update(vacio, { tipo });
    else if (certs.length < MAX_CERTS) setCerts([...certs, { tipo, file: null }]);
  }
  function remove(i: number) {
    const next = certs.filter((_, idx) => idx !== i);
    setCerts(next.length ? next : [{ tipo: "", file: null }]);
  }
  return (
    <div>
      <h2 className="text-xl font-bold text-[#111827]">{t("verificar.certsTitulo")}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        <strong className="text-[#111827]">{t("verificar.obligatorio")}</strong> {t("verificar.certsSub")}
      </p>
      <div className="mt-3 p-4 rounded-2xl bg-[#111827] text-white">
        <div className="text-xs font-semibold text-[#EF9F27] uppercase tracking-wide">{t("verificar.documentosPara", { rubro: req.titulo })}</div>
        <p className="mt-1 text-xs text-white/75">{req.intro}</p>
        <ul className="mt-3 space-y-2">
          {req.documentos.map((d) => (
            <li key={d.nombre} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => agregarConTipo(d.nombre)}
                className="mt-0.5 shrink-0 size-5 rounded-full border border-[#EF9F27] text-[#EF9F27] flex items-center justify-center"
                aria-label={t("verificar.agregar", { doc: d.nombre })}
              >
                <Plus className="size-3" />
              </button>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">
                  {d.nombre}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${d.obligatorio ? "bg-[#FF3B6B] text-white" : "bg-white/15 text-white/80"}`}>
                    {d.obligatorio ? t("verificar.obligatorioTag") : t("verificar.opcionalTag")}
                  </span>
                </div>
                <div className="text-[11px] text-white/60 mt-0.5">{t("verificar.dondeObtenerlo")} {d.donde}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-white/60">{t("verificar.tocaMas", { max: MAX_CERTS })}</p>
      </div>

      <div className="mt-5 space-y-4">
        {certs.map((c, i) => (
          <CertItem
            key={i}
            index={i}
            cert={c}
            canRemove={certs.length > 1 || !!c.file}
            onChange={(patch) => update(i, patch)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      {certs.length < MAX_CERTS && (
        <button
          type="button"
          onClick={() => setCerts([...certs, { tipo: "", file: null }])}
          className="mt-4 w-full h-11 rounded-2xl border border-dashed border-[#EF9F27] text-[#111827] text-sm font-semibold flex items-center justify-center gap-2 bg-white"
        >
          <Plus className="size-4 text-[#EF9F27]" /> {t("verificar.agregarOtro")}
        </button>
      )}
    </div>
  );
}

function CertItem({
  index, cert, canRemove, onChange, onRemove,
}: { index: number; cert: CertSlot; canRemove: boolean; onChange: (p: Partial<CertSlot>) => void; onRemove: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{t("verificar.certificadoN", { n: index + 1 })}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1 rounded-full hover:bg-[#F5F5F0] text-[#9CA3AF]" aria-label={t("verificar.quitar")}>
            <X className="size-4" />
          </button>
        )}
      </div>
      <label className="block">
        <span className="block text-sm font-medium mb-2">{t("verificar.tipoCert")}</span>
        <input
          value={cert.tipo}
          onChange={(e) => onChange({ tipo: e.target.value })}
          placeholder={t("verificar.tipoPlaceholder")}
          className="w-full h-12 px-4 rounded-2xl bg-white border border-[#E5E7EB] outline-none focus:border-[#EF9F27]"
        />
      </label>

      <div
        onClick={() => ref.current?.click()}
        className={`cursor-pointer p-5 rounded-2xl bg-white border-2 border-dashed text-center ${cert.file ? "border-[#00C288]" : "border-[#E5E7EB]"}`}
      >
        {cert.file ? (
          <div className="flex items-center justify-center gap-2 text-sm text-[#111827] font-medium">
            <Check className="size-4 text-[#00C288] shrink-0" />
            <span className="truncate">{cert.file.file.name}</span>
          </div>
        ) : (
          <>
            <Upload className="size-6 mx-auto text-[#EF9F27]" />
            <p className="mt-2 text-sm text-[#111827] font-medium">{t("verificar.subeCert")}</p>
            <p className="text-xs text-[#6B7280] mt-1">{t("verificar.pdfMax")}</p>
          </>
        )}
        <input
          ref={ref} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange({ file: { file: f, preview: URL.createObjectURL(f) } });
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ConfirmacionEnviada({ motivo }: { motivo: string | null }) {
  const { t } = useT();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center bg-[#F5F5F0]">
      <div className="max-w-sm">
        <div className="mx-auto size-20 rounded-full bg-[#EF9F27]/15 flex items-center justify-center">
          <Clock className="size-10 text-[#EF9F27]" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#111827]">{t("verificar.enviada")}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          {t("verificar.enviadaSub")}
        </p>
        {motivo && (
          <div className="mt-4 p-3 rounded-xl bg-[#FF3B6B]/10 border border-[#FF3B6B]/30 text-sm text-[#FF3B6B] text-left">
            <strong>{t("verificar.motivoRechazo")}</strong> {motivo}
          </div>
        )}
        <Link to="/panel" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm">
          {t("verificar.volverPanel")}
        </Link>
      </div>
    </div>
  );
}
