import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface FavoritoRow {
  id: string;
  prestador_id: string;
  created_at: string;
  prestador: {
    id: string;
    calificacion_promedio: number;
    resenas_count: number;
    precio_desde: number;
    categoria_id: string;
    usuarios: { nombre: string; foto_url: string | null } | null;
  } | null;
}

export function useFavoritos() {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const clienteId = usuario?.id;

  const q = useQuery({
    queryKey: ["favoritos", clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<FavoritoRow[]> => {
      const { data, error } = await supabase
        .from("favoritos")
        .select(`
          id, prestador_id, created_at,
          prestador:prestadores ( id, calificacion_promedio, resenas_count, precio_desde, categoria_id,
            usuarios ( nombre, foto_url )
          )
        `)
        .eq("cliente_id", clienteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FavoritoRow[];
    },
  });

  useEffect(() => {
    if (!clienteId) return;
    const ch = supabase
      .channel(`fav-${clienteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "favoritos", filter: `cliente_id=eq.${clienteId}` },
        () => qc.invalidateQueries({ queryKey: ["favoritos", clienteId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clienteId, qc]);

  return q.data ?? [];
}

export function useIsFavorito(prestadorId: string | undefined) {
  const favs = useFavoritos();
  return !!prestadorId && favs.some((f) => f.prestador_id === prestadorId);
}

export function useToggleFavorito() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  return useMutation({
    mutationFn: async ({ prestadorId, isFav }: { prestadorId: string; isFav: boolean }) => {
      if (!usuario?.id) throw new Error("Inicia sesión para guardar favoritos");
      if (isFav) {
        const { error } = await supabase.from("favoritos").delete()
          .eq("cliente_id", usuario.id).eq("prestador_id", prestadorId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favoritos").insert({
          cliente_id: usuario.id, prestador_id: prestadorId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favoritos"] });
    },
  });
}
