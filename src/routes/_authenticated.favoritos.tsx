import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { useFavoritos, useToggleFavorito } from "@/hooks/use-favoritos";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({ meta: [{ title: "Mis favoritos — Homie" }] }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const favs = useFavoritos();
  const toggle = useToggleFavorito();

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Mis favoritos</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Prestadores que has guardado para reservar rápido.
        </p>
      </header>

      <div className="px-5 pb-10">
        {favs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto size-16 rounded-full bg-[#F5F5F0] flex items-center justify-center">
              <Heart className="size-7 text-[#9CA3AF]" />
            </div>
            <h2 className="mt-4 font-semibold">Aún no tienes favoritos</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Toca el corazón en el perfil de un prestador para guardarlo aquí.
            </p>
            <Link
              to="/buscar"
              className="inline-block mt-6 px-5 py-3 rounded-2xl bg-[#111827] text-white font-semibold text-sm"
            >
              Explorar prestadores
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favs.map((f) => {
              const p = f.prestador;
              if (!p) return null;
              const name = p.usuarios?.nombre ?? "Prestador";
              return (
                <div key={f.id} className="relative p-4 rounded-2xl bg-white border border-[#E5E7EB]">
                  <button
                    onClick={() => toggle.mutate({ prestadorId: p.id, isFav: true })}
                    disabled={toggle.isPending}
                    aria-label="Quitar de favoritos"
                    className="absolute top-3 right-3 size-8 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center"
                  >
                    <Heart className="size-4 fill-[#EF9F27] text-[#EF9F27]" />
                  </button>
                  <div className="flex flex-col items-center text-center">
                    <ProviderAvatar url={p.usuarios?.foto_url ?? null} name={name} size={64} />
                    <div className="mt-2 font-semibold text-sm text-[#111827] truncate w-full">
                      {name}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-[#6B7280]">
                      <Star className="size-3 fill-[#EF9F27] text-[#EF9F27]" />
                      {Number(p.calificacion_promedio ?? 0).toFixed(1)}
                      <span className="text-[#9CA3AF]">({p.resenas_count})</span>
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280]">
                      desde {formatCLP(p.precio_desde ?? 0)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <Link
                      to="/reservar/$id"
                      params={{ id: p.id }}
                      className="w-full text-center px-3 py-2 rounded-xl bg-[#EF9F27] text-[#111827] text-xs font-bold"
                    >
                      Reservar
                    </Link>
                    <Link
                      to="/prestador/$id"
                      params={{ id: p.id }}
                      className="w-full text-center px-3 py-2 rounded-xl bg-[#F5F5F0] text-[#111827] text-xs font-semibold"
                    >
                      Ver perfil
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
