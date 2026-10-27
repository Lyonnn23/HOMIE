import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, Check, SwitchCamera } from "lucide-react";
import { useT } from "@/i18n";

/**
 * Cámara dentro de la app (webcam en computador, cámara en teléfono).
 * En la app nativa usa la cámara del sistema (Capacitor). Si nada funciona,
 * el que la usa debe ofrecer "Subir desde galería" como alternativa.
 */
export function Camara({
  modo = "environment", circular = false, onFoto, onCerrar, titulo,
}: {
  modo?: "user" | "environment";
  circular?: boolean;
  onFoto: (file: File) => void;
  onCerrar: () => void;
  titulo?: string;
}) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">(modo);
  const [captura, setCaptura] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function abrir() {
      setError(null); setListo(false);
      detener();
      if (!navigator.mediaDevices?.getUserMedia) { setError(t("camara.noSoportada")); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelado) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setListo(true);
        }
      } catch (e) {
        const name = (e as DOMException)?.name;
        setError(name === "NotAllowedError" ? t("camara.permisoDenegado") : name === "NotFoundError" ? t("camara.sinCamara") : t("camara.error"));
      }
    }
    abrir();
    return () => { cancelado = true; detener(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  function detener() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }

  function tomar() {
    const v = videoRef.current;
    if (!v || !listo) return;
    const w = v.videoWidth || 1280, h = v.videoHeight || 960;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); } // espejo para selfie
    ctx.drawImage(v, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCaptura({ blob, url: URL.createObjectURL(blob) });
    }, "image/jpeg", 0.9);
  }

  function usar() {
    if (!captura) return;
    const file = new File([captura.blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
    detener();
    onFoto(file);
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black text-white flex flex-col" role="dialog" aria-modal="true" aria-label={titulo ?? t("camara.titulo")}>
      <div className="flex items-center justify-between px-4 h-14 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={() => { detener(); onCerrar(); }} className="p-2 rounded-full hover:bg-white/10" aria-label={t("comun.cerrar")}>
          <X className="size-6" />
        </button>
        <span className="text-sm font-semibold truncate">{titulo ?? t("camara.titulo")}</span>
        <button type="button" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className="p-2 rounded-full hover:bg-white/10" aria-label={t("camara.cambiar")} disabled={!!captura}>
          <SwitchCamera className="size-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="px-8 text-center">
            <Camera className="size-10 mx-auto text-[#EF9F27]" />
            <p className="mt-3 text-sm text-white/85">{error}</p>
            <p className="mt-2 text-xs text-white/60">{t("camara.usaGaleria")}</p>
          </div>
        ) : captura ? (
          <img src={captura.url} alt="" className={`max-h-full max-w-full object-contain ${circular ? "rounded-full aspect-square object-cover w-[80vmin]" : ""}`} />
        ) : (
          <>
            <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
            {circular && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, transparent 36vmin, rgba(0,0,0,.55) 36.5vmin)" }} />}
            {!listo && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">{t("comun.cargando")}</div>}
          </>
        )}
      </div>

      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 flex items-center justify-center gap-6">
        {captura ? (
          <>
            <button type="button" onClick={() => setCaptura(null)} className="h-12 px-5 rounded-2xl bg-white/15 text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="size-4" /> {t("camara.repetir")}
            </button>
            <button type="button" onClick={usar} className="h-12 px-6 rounded-2xl bg-[#EF9F27] text-[#111827] text-sm font-bold flex items-center gap-2">
              <Check className="size-4" /> {t("camara.usar")}
            </button>
          </>
        ) : (
          <button type="button" onClick={tomar} disabled={!listo || !!error} aria-label={t("camara.capturar")}
            className="size-[72px] rounded-full bg-white border-[6px] border-white/40 disabled:opacity-40" />
        )}
      </div>
    </div>
  );
}
