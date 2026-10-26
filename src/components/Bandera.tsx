import type { Idioma } from "@/i18n";

/** Banderas en SVG (no dependen de emojis, que fallan en Windows). */
export function Bandera({ idioma, size = 20, className = "" }: { idioma: Idioma; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", className: `rounded-full shrink-0 ${className}`, "aria-hidden": true as const };
  switch (idioma) {
    case "es": // Chile
      return (
        <svg {...common}>
          <rect width="24" height="24" fill="#D52B1E" />
          <rect width="24" height="12" fill="#fff" />
          <rect width="9" height="12" fill="#0039A6" />
          <path d="M4.5 2.5l.9 2.2 2.4.2-1.8 1.5.6 2.3-2.1-1.3-2.1 1.3.6-2.3L1.2 4.9l2.4-.2z" fill="#fff" />
        </svg>
      );
    case "en": // Estados Unidos
      return (
        <svg {...common}>
          <rect width="24" height="24" fill="#B22234" />
          {[2, 6, 10, 14, 18, 22].map((y) => <rect key={y} y={y} width="24" height="2" fill="#fff" />)}
          <rect width="11" height="12" fill="#3C3B6E" />
          {[2, 5, 8].map((y) => [2, 5, 8].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r=".9" fill="#fff" />))}
        </svg>
      );
    case "ht": // Haití
      return (
        <svg {...common}>
          <rect width="24" height="12" fill="#00209F" />
          <rect y="12" width="24" height="12" fill="#D21034" />
          <rect x="8" y="8" width="8" height="8" fill="#fff" />
          <rect x="10.5" y="10" width="3" height="4" fill="#1A7A3E" />
        </svg>
      );
    case "pt": // Brasil
      return (
        <svg {...common}>
          <rect width="24" height="24" fill="#009C3B" />
          <path d="M12 3l9 9-9 9-9-9z" fill="#FFDF00" />
          <circle cx="12" cy="12" r="4" fill="#002776" />
          <path d="M8.3 11.2c2.5-.6 5-.3 7.4 1" stroke="#fff" strokeWidth=".8" fill="none" />
        </svg>
      );
  }
}
