import { Heart } from "lucide-react";
import { useIsFavorito, useToggleFavorito } from "@/hooks/use-favoritos";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  prestadorId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({ prestadorId, size = "md", className = "" }: Props) {
  const { usuario } = useAuth();
  const isFav = useIsFavorito(prestadorId);
  const toggle = useToggleFavorito();

  const sizes = {
    sm: { btn: "size-8", icon: "size-4" },
    md: { btn: "size-10", icon: "size-5" },
    lg: { btn: "size-11", icon: "size-5" },
  } as const;
  const s = sizes[size];

  if (!usuario) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ prestadorId, isFav });
      }}
      disabled={toggle.isPending}
      aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`${s.btn} rounded-full bg-white/90 backdrop-blur shadow-sm border border-[#E5E7EB] flex items-center justify-center transition hover:scale-105 disabled:opacity-50 ${className}`}
    >
      <Heart
        className={`${s.icon} transition ${isFav ? "fill-[#EF9F27] text-[#EF9F27]" : "text-[#6B7280]"}`}
      />
    </button>
  );
}
