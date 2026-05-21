import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NotifKey =
  | "master"
  | "reserva_recibida"
  | "reserva_confirmada"
  | "reserva_rechazada"
  | "en_camino"
  | "completada"
  | "recordatorio"
  | "favorito_disponible"
  | "marketing";

export type NotifConfig = Record<NotifKey, boolean>;

export const DEFAULT_NOTIF_CONFIG: NotifConfig = {
  master: true,
  reserva_recibida: true,
  reserva_confirmada: true,
  reserva_rechazada: true,
  en_camino: true,
  completada: true,
  recordatorio: true,
  favorito_disponible: true,
  marketing: false,
};

export const NOTIF_LABELS: Record<Exclude<NotifKey, "master">, { title: string; sub: string }> = {
  reserva_recibida: { title: "Nuevas reservas", sub: "Cuando recibes una nueva reserva" },
  reserva_confirmada: { title: "Reservas confirmadas", sub: "Cuando un prestador acepta tu reserva" },
  reserva_rechazada: { title: "Reservas rechazadas", sub: "Cuando un prestador no puede atenderte" },
  en_camino: { title: "En camino", sub: "Cuando tu prestador está en camino" },
  completada: { title: "Servicio completado", sub: "Para que dejes tu reseña" },
  recordatorio: { title: "Recordatorios", sub: "1 hora antes de tu reserva" },
  favorito_disponible: { title: "Favoritos disponibles", sub: "Cuando un favorito tiene cupos" },
  marketing: { title: "Promociones", sub: "Ofertas y novedades de Homie" },
};

export function useUpdateNotifConfig() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  return useMutation({
    mutationFn: async (next: NotifConfig) => {
      if (!usuario?.id) throw new Error("Sin sesión");
      const { error } = await supabase
        .from("usuarios")
        .update({ notif_config: next })
        .eq("id", usuario.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuario"] }),
  });
}
