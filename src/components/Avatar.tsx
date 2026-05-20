export function ProviderAvatar({
  seed, name, size = 56,
}: { seed: number; name: string; size?: number }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="relative overflow-hidden rounded-full bg-muted flex items-center justify-center text-foreground font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      <img
        src={`https://i.pravatar.cc/200?img=${seed}`}
        alt={name}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <span aria-hidden>{initials}</span>
    </div>
  );
}
