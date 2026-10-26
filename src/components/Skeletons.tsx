/**
 * Esqueletos de carga reutilizables. Usan la clase `.skeleton` (pulso suave)
 * definida en styles.css y son compatibles con modo oscuro.
 */

import { useT } from "@/i18n";

function Bloque({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} />;
}

/** Fila tipo "lista de prestadores/reservas": avatar + dos líneas + precio. */
export function TarjetaSkeleton({ conAvatar = true }: { conAvatar?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-[#E5E7EB] bg-white" aria-hidden="true">
      {conAvatar && <Bloque className="size-[52px] rounded-full shrink-0" />}
      <div className="flex-1 min-w-0 space-y-2">
        <Bloque className="h-3.5 w-2/3" />
        <Bloque className="h-3 w-1/2" />
        <Bloque className="h-3 w-1/3" />
      </div>
      <div className="space-y-2 shrink-0">
        <Bloque className="h-2.5 w-10 ml-auto" />
        <Bloque className="h-3.5 w-14" />
      </div>
    </div>
  );
}

/** Lista de N tarjetas. */
export function ListaSkeleton({ items = 4, conAvatar = true, className = "" }: { items?: number; conAvatar?: boolean; className?: string }) {
  const { t } = useT();
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-live="polite" aria-label={t("comun.cargando")}>
      {Array.from({ length: items }).map((_, i) => (
        <TarjetaSkeleton key={i} conAvatar={conAvatar} />
      ))}
      <span className="sr-only">{t("comun.cargando")}</span>
    </div>
  );
}

/** Perfil de prestador: cabecera con avatar grande, título, chips y bloques. */
export function PerfilSkeleton() {
  const { t } = useT();
  return (
    <div className="px-5 pt-6 space-y-5" role="status" aria-live="polite" aria-label={t("comun.cargandoPerfil")}>
      <div className="flex items-center gap-4">
        <Bloque className="size-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Bloque className="h-5 w-3/5" />
          <Bloque className="h-3.5 w-2/5" />
          <div className="flex gap-2 pt-1">
            <Bloque className="h-6 w-20 rounded-full" />
            <Bloque className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <Bloque className="h-24 w-full rounded-2xl" />
      <div className="space-y-2">
        <Bloque className="h-3.5 w-full" />
        <Bloque className="h-3.5 w-11/12" />
        <Bloque className="h-3.5 w-4/5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Bloque className="h-16 rounded-2xl" />
        <Bloque className="h-16 rounded-2xl" />
      </div>
      <span className="sr-only">{t("comun.cargando")}</span>
    </div>
  );
}

/** Fila de estadísticas (3 cifras) para la portada. */
export function StatsSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bloque className="h-7 w-16" />
          <Bloque className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Tarjeta de texto (testimonio, aviso, bloque de contenido). */
export function TextoSkeleton({ lineas = 3, className = "" }: { lineas?: number; className?: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-[#E5E7EB] bg-white space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lineas }).map((_, i) => (
        <Bloque key={i} className={`h-3.5 ${i === lineas - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
