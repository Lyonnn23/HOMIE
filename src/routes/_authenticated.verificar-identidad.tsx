import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, ChevronLeft, Clock, Upload, FileText, AlertCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/verificar-identidad")({
  head: () => ({ meta: [{ title: "Verificar identidad — Homie" }] }),
  component: VerificarIdentidad,
});

type FileSlot = { file: File; preview: string } | null;

function VerificarIdentidad() {
  const { user, usuario } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [frente, setFrente] = useState<FileSlot>(null);
  const [reverso, setReverso] = useState<FileSlot>(null);
  const [selfie, setSelfie] = useState<FileSlot>(null);
  const [tieneCert, setTieneCert] = useState<boolean | null>(null);
  const [tipoCert, setTipoCert] = useState("");
  const [certFile, setCertFile] = useState<FileSlot>(null);
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
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>;
  }
  if (!prestadorQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Primero completa tu perfil de prestador.</p>
          <Link to="/onboarding-prestador" className="inline-block mt-4 px-5 py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold text-sm">
            Completar perfil
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
          <h1 className="mt-4 text-2xl font-bold">¡Ya estás verificado!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tu identidad fue confirmada por Homie.</p>
          <Link to="/panel" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  async function uploadFile(file: File, slug: string) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/${prestadorQ.data!.id}/${slug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("verificaciones").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function enviar() {
    setErr(null);
    if (!frente || !reverso || !selfie) {
      setErr("Faltan fotos por subir");
      return;
    }
    setSubmitting(true);
    try {
      const [pFrente, pReverso, pSelfie] = await Promise.all([
        uploadFile(frente.file, "carnet-frente"),
        uploadFile(reverso.file, "carnet-reverso"),
        uploadFile(selfie.file, "selfie"),
      ]);
      const certs: string[] = [];
      if (tieneCert && certFile) {
        const p = await uploadFile(certFile.file, `cert-${tipoCert || "general"}`);
        certs.push(p);
      }
      const { error } = await supabase.from("verificaciones_prestador").insert({
        prestador_id: prestadorQ.data!.id,
        foto_carnet_frente: pFrente,
        foto_carnet_reverso: pReverso,
        foto_selfie: pSelfie,
        certificados: certs,
        estado: "pendiente",
      });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = ["Carnet frente", "Carnet reverso", "Selfie", "Certificados"];

  return (
    <div className="min-h-screen bg-[#F5F5F0] pb-32">
      <header className="bg-[#111827] text-white px-5 pt-6 pb-5">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate({ to: "/panel" }))} className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="mt-2 text-2xl font-bold">Verificar identidad</h1>
        <p className="text-sm text-white/70 mt-1">Paso {step} de 4 · {steps[step - 1]}</p>
        <div className="mt-4 flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-[#EF9F27]" : "bg-white/15"}`} />
          ))}
        </div>
      </header>

      <main className="px-5 pt-6 max-w-lg mx-auto">
        {step === 1 && (
          <StepFoto
            title="Foto del carnet — Frente"
            help="Asegúrate de que se vean los 4 bordes y los datos sean legibles. Sin reflejos."
            slot={frente}
            onPick={setFrente}
          />
        )}
        {step === 2 && (
          <StepFoto
            title="Foto del carnet — Reverso"
            help="Toma la foto sobre una superficie plana, con buena luz y sin recortes."
            slot={reverso}
            onPick={setReverso}
          />
        )}
        {step === 3 && (
          <StepFoto
            title="Selfie con tu carnet"
            help="Tómate una foto sosteniendo tu carnet junto a tu cara. Ambos deben verse claramente."
            slot={selfie}
            onPick={setSelfie}
            circular
          />
        )}
        {step === 4 && (
          <StepCertificados
            tiene={tieneCert}
            setTiene={setTieneCert}
            tipo={tipoCert}
            setTipo={setTipoCert}
            file={certFile}
            setFile={setCertFile}
          />
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
              Continuar
            </button>
          ) : (
            <button
              onClick={enviar}
              disabled={submitting || tieneCert === null}
              className="w-full h-12 rounded-2xl bg-[#111827] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar solicitud"}
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
            <p className="mt-2">Tu foto aparecerá aquí</p>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => camRef.current?.click()} className="h-12 rounded-2xl bg-[#111827] text-white text-sm font-semibold flex items-center justify-center gap-2">
          <Camera className="size-4" /> Tomar foto
        </button>
        <button onClick={() => ref.current?.click()} className="h-12 rounded-2xl bg-white border border-[#E5E7EB] text-[#111827] text-sm font-semibold flex items-center justify-center gap-2">
          <Upload className="size-4" /> Galería
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function StepCertificados({
  tiene, setTiene, tipo, setTipo, file, setFile,
}: {
  tiene: boolean | null; setTiene: (v: boolean) => void;
  tipo: string; setTipo: (v: string) => void;
  file: FileSlot; setFile: (s: FileSlot) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <h2 className="text-xl font-bold text-[#111827]">Certificados del rubro</h2>
      <p className="mt-1 text-sm text-[#6B7280]">Opcional. Los usuarios prefieren profesionales certificados.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setTiene(true)}
          className={`p-4 rounded-2xl border-2 text-left transition ${tiene === true ? "border-[#EF9F27] bg-[#EF9F27]/10" : "border-[#E5E7EB] bg-white"}`}
        >
          <Check className="size-5 text-[#EF9F27]" />
          <div className="mt-2 font-semibold text-sm text-[#111827]">Esto lo tengo</div>
          <div className="text-xs text-[#6B7280] mt-0.5">Subiré mi certificado</div>
        </button>
        <button
          onClick={() => { setTiene(false); setFile(null); }}
          className={`p-4 rounded-2xl border-2 text-left transition ${tiene === false ? "border-[#EF9F27] bg-[#EF9F27]/10" : "border-[#E5E7EB] bg-white"}`}
        >
          <FileText className="size-5 text-[#9CA3AF]" />
          <div className="mt-2 font-semibold text-sm text-[#111827]">No tengo</div>
          <div className="text-xs text-[#6B7280] mt-0.5">Continuar sin certificado</div>
        </button>
      </div>

      {tiene === false && (
        <p className="mt-4 text-xs text-[#6B7280] bg-[#FAC775]/30 p-3 rounded-xl">
          Sin certificado igual puedes registrarte, pero los usuarios prefieren profesionales certificados.
        </p>
      )}

      {tiene === true && (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="block text-sm font-medium mb-2">Tipo de certificado</span>
            <input
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ej: Curso de electricidad SEC"
              className="w-full h-12 px-4 rounded-2xl bg-white border border-[#E5E7EB] outline-none focus:border-[#EF9F27]"
            />
          </label>

          <div
            onClick={() => ref.current?.click()}
            className="cursor-pointer p-6 rounded-2xl bg-white border-2 border-dashed border-[#E5E7EB] text-center"
          >
            {file ? (
              <div className="text-sm text-[#111827] font-medium truncate">{file.file.name}</div>
            ) : (
              <>
                <Upload className="size-6 mx-auto text-[#EF9F27]" />
                <p className="mt-2 text-sm text-[#111827] font-medium">Sube tu certificado</p>
                <p className="text-xs text-[#6B7280] mt-1">PDF o imagen, máx 5MB</p>
              </>
            )}
            <input
              ref={ref} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile({ file: f, preview: URL.createObjectURL(f) });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmacionEnviada({ motivo }: { motivo: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center bg-[#F5F5F0]">
      <div className="max-w-sm">
        <div className="mx-auto size-20 rounded-full bg-[#EF9F27]/15 flex items-center justify-center">
          <Clock className="size-10 text-[#EF9F27]" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#111827]">¡Solicitud enviada!</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Revisaremos tu verificación en menos de 24 horas. Te avisaremos por notificación.
        </p>
        {motivo && (
          <div className="mt-4 p-3 rounded-xl bg-[#FF3B6B]/10 border border-[#FF3B6B]/30 text-sm text-[#FF3B6B] text-left">
            <strong>Motivo de rechazo anterior:</strong> {motivo}
          </div>
        )}
        <Link to="/panel" className="inline-block mt-6 px-5 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm">
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
