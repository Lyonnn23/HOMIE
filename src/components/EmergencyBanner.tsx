import { Phone } from "lucide-react";

const EMERGENCY_PHONE = "+56 2 2123 4567";

export function EmergencyBanner() {
  return (
    <div className="bg-[#111827] text-white px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-40">
      <div className="flex items-center gap-2 min-w-0">
        <Phone className="size-4 text-[#EF9F27] shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">¿Necesitas ayuda? Llama a Homie</div>
          <div className="text-[10px] text-white/60 truncate">Soporte 24/7 durante tu reserva</div>
        </div>
      </div>
      <a
        href={`tel:${EMERGENCY_PHONE.replace(/\s/g, "")}`}
        className="shrink-0 px-3 py-1.5 rounded-full bg-[#EF9F27] text-[#111827] text-xs font-bold inline-flex items-center gap-1"
      >
        <Phone className="size-3.5" /> Llamar
      </a>
    </div>
  );
}
