import { ShieldCheck, BadgeCheck } from "lucide-react";

interface Props {
  /** Versión compacta para explicar el rango dentro de una sección. */
  compact?: boolean;
  /** Sin sombra flotante (sobre fondos claros). */
  flat?: boolean;
  servicio?: string;
  detalle?: string;
  desde?: string;
  hasta?: string;
  className?: string;
}

/**
 * Ticket de precio garantizado: el elemento memorable de Homie.
 * Muestra un ejemplo de reserva con precio "desde" (lo que pagas hoy)
 * y precio "hasta" (tope que nunca se supera), con sello ámbar.
 */
export function TicketPrecio({
  compact = false,
  flat = false,
  servicio = "Gasfíter",
  detalle = "Reparación de llave",
  desde = "$25.000",
  hasta = "$32.000",
  className = "",
}: Props) {
  return (
    <div className={`ticket-wrap ${flat ? "flat" : ""} ${className}`}>
      <div className={`ticket ${compact ? "compact" : ""}`} role="figure" aria-label={`Ejemplo de ticket: ${servicio}, ${detalle}. Pagas hoy ${desde}, máximo ${hasta}. Pago protegido hasta que confirmes.`}>
        <span className="ticket-stamp" aria-hidden>
          <BadgeCheck className="size-3.5" /> Garantizado
        </span>
        <div className="pr-28">
          <div className="text-xs font-semibold text-[#6B7280]">Reserva de ejemplo</div>
          <div className={`mt-1 font-bold text-[#111827] ${compact ? "text-base" : "text-lg"}`}>
            {servicio} <span className="text-[#9CA3AF] font-medium">·</span> {detalle}
          </div>
        </div>

        <div className="ticket-sep" aria-hidden />

        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#6B7280]">Pagas hoy</div>
            <div className="ticket-amount mt-1">{desde}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-[#6B7280]">Máximo</div>
            <div className={`mt-1 font-bold text-[#111827] ${compact ? "text-base" : "text-xl"}`}>{hasta}</div>
          </div>
        </div>

        <div className="ticket-sep" aria-hidden />

        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--pacifico)" }}>
          <ShieldCheck className="size-4 shrink-0" />
          <span>Pago protegido hasta que confirmes</span>
        </div>
        {!compact && (
          <p className="mt-2 text-xs text-[#6B7280] leading-relaxed">
            Si el trabajo requiere más, lo sabes antes de empezar. El total nunca supera el máximo.
          </p>
        )}
      </div>
    </div>
  );
}
