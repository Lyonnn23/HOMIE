import { useRef, useState } from "react";
import { Camera, Star, X } from "lucide-react";
import { useAddReview, type Booking } from "@/store/bookings";

const LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

export function ReviewModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addReview = useAddReview();
  const display = hover || rating;

  function pickFile(f: File | null) {
    setFoto(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    setErr(null);
    try {
      await addReview.mutateAsync({
        reservaId: b.id,
        prestadorId: b.providerId,
        calificacion: rating,
        comentario: comment,
        foto,
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo publicar la reseña");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">Califica a {b.providerName}</h3>
            <p className="text-sm text-[#6B7280]">{b.service}</p>
          </div>
          <button onClick={onClose} className="p-1 -m-1 text-[#9CA3AF]"><X className="size-5" /></button>
        </div>

        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`${n} estrellas`}
              >
                <Star className={`size-12 ${n <= display ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#E5E7EB]"}`} />
              </button>
            ))}
          </div>
          <div className="text-sm font-semibold text-[#111827] h-5">{LABELS[display]}</div>
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Cuéntanos más sobre tu experiencia (opcional)"
          className="w-full px-4 py-3 rounded-2xl bg-[#F5F5F0] border border-[#E5E7EB] outline-none focus:border-[#EF9F27] resize-none text-sm"
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Vista previa" className="w-full h-40 object-cover rounded-2xl" />
            <button
              onClick={() => pickFile(null)}
              className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#F5F5F0]"
          >
            <Camera className="size-4 text-[#EF9F27]" /> Agregar foto del trabajo
          </button>
        )}

        {err && <p className="text-xs text-[#FF3B6B]">{err}</p>}

        <div className="space-y-2">
          <button
            disabled={addReview.isPending}
            onClick={submit}
            className="w-full py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold text-sm disabled:opacity-50"
          >
            {addReview.isPending ? "Publicando..." : "Publicar reseña"}
          </button>
          <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-[#6B7280]">
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
