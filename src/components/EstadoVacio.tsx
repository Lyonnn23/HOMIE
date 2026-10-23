import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  titulo: string;
  descripcion?: string;
  /** Acción principal: enlace (to) o botón (onClick). */
  accion?: { label: string; to?: string; search?: Record<string, unknown>; onClick?: () => void };
  /** Contenido extra opcional bajo la acción. */
  children?: ReactNode;
  className?: string;
  /** "error" usa tono coral en el icono. */
  tono?: "neutro" | "error";
}

/** Estado vacío consistente: icono + título + una acción. */
export function EstadoVacio({ icon: Icon, titulo, descripcion, accion, children, className = "", tono = "neutro" }: Props) {
  const color = tono === "error" ? "border-[#FF3B6B] text-[#FF3B6B]" : "border-[#EF9F27] text-[#EF9F27]";
  return (
    <div className={`text-center py-14 px-5 ${className}`}>
      <div className={`mx-auto size-16 rounded-full border-2 flex items-center justify-center ${color}`}>
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-semibold text-[#111827]">{titulo}</p>
      {descripcion && <p className="mt-1 text-sm text-[#6B7280] max-w-sm mx-auto">{descripcion}</p>}
      {accion && (accion.to ? (
        <Link to={accion.to} search={accion.search as never} className="btn-primary mt-5 h-12 min-h-12">
          {accion.label}
        </Link>
      ) : (
        <button type="button" onClick={accion.onClick} className="btn-primary mt-5 h-12 min-h-12">
          {accion.label}
        </button>
      ))}
      {children}
    </div>
  );
}
