import { useState } from "react";
import { Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const MOTIVOS = [
  "No llegó a la cita",
  "Comportamiento inapropiado",
  "Trabajo mal ejecutado",
  "Me cobró diferente al precio acordado",
  "Otro",
];

export function ReportModal({
  reservaId,
  reportadoId,
  onClose,
}: {
  reservaId: string;
  reportadoId: string;
  onClose: () => void;
}) {
  const { usuario } = useAuth();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function enviar() {
    if (!motivo || !usuario) return;
    setSubmitting(true);
    setErr(null);
    const { error } = await supabase.from("reportes").insert({
      reserva_id: reservaId,
      reportante_id: usuario.id,
      reportado_id: reportadoId,
      motivo,
      descripcion: descripcion.trim() || null,
      estado: "pendiente",
    });
    setSubmitting(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4">
        {done ? (
          <div className="text-center py-4">
            <div className="mx-auto size-14 rounded-full bg-[#00C288]/15 flex items-center justify-center">
              <Shield className="size-7 text-[#00C288]" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-[#111827]">Reporte recibido</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Homie lo revisará en menos de 24 horas.
            </p>
            <button onClick={onClose} className="mt-5 w-full py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-[#FF3B6B]" />
                <h3 className="text-lg font-bold text-[#111827]">Reportar problema</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                <X className="size-5 text-[#6B7280]" />
              </button>
            </div>

            <p className="text-sm text-[#6B7280]">Selecciona el motivo del reporte.</p>

            <div className="space-y-2">
              {MOTIVOS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMotivo(m)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition ${
                    motivo === m ? "border-[#FF3B6B] bg-[#FF3B6B]/5 text-[#111827] font-semibold" : "border-[#E5E7EB] text-[#111827]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {motivo && (
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder={motivo === "Otro" ? "Describe lo que ocurrió" : "Detalles adicionales (opcional)"}
                maxLength={1000}
                className="w-full p-3 rounded-xl border border-[#E5E7EB] text-sm outline-none focus:border-[#FF3B6B] resize-none"
              />
            )}

            {err && <p className="text-sm text-[#FF3B6B]">{err}</p>}

            <button
              disabled={!motivo || submitting || (motivo === "Otro" && !descripcion.trim())}
              onClick={enviar}
              className="w-full h-12 rounded-2xl bg-[#FF3B6B] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar reporte"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
