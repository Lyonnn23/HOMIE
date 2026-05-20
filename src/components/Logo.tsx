export function HomieIcon({ size = 24, bg = "#1A1A2E", stroke = "#EF9F27", rounded = true }: { size?: number; bg?: string; stroke?: string; rounded?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: rounded ? size * 0.28 : 0,
      }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    </span>
  );
}

export function HomieWordmark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span style={{ color: inverted ? "#FFFFFF" : "#111827" }}>Hom</span>
      <span style={{ color: "#EF9F27" }}>ie</span>
    </span>
  );
}

export function HomieLogo({ size = 36, inverted = true, withTagline = false }: { size?: number; inverted?: boolean; withTagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <HomieIcon size={size} />
      <span className="flex flex-col leading-none">
        <HomieWordmark inverted={inverted} className="text-lg" />
        {withTagline && (
          <span className="text-[10px] text-muted-foreground mt-1">Tu hogar, en buenas manos</span>
        )}
      </span>
    </span>
  );
}
