import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n";

export type NotifKey =
  | "master"
  | "reserva_recibida"
  | "reserva_confirmada"
  | "reserva_rechazada"
  | "en_camino"
  | "completada"
  | "recordatorio"
  | "favorito_disponible"
  | "marketing"
  | "push";

export type NotifConfig = Record<NotifKey, boolean>;

export const DEFAULT_NOTIF_CONFIG: NotifConfig = {
  master: true,
  push: true,
  reserva_recibida: true,
  reserva_confirmada: true,
  reserva_rechazada: true,
  en_camino: true,
  completada: true,
  recordatorio: true,
  favorito_disponible: true,
  marketing: false,
};

/** Claves i18n ("notif.l.*" título, "notif.s.*" subtítulo) para cada preferencia. Usar con t(). */
export const NOTIF_LABELS: Record<Exclude<NotifKey, "master">, { title: string; sub: string }> = {
  reserva_recibida: { title: "notif.l.reserva_recibida", sub: "notif.s.reserva_recibida" },
  reserva_confirmada: { title: "notif.l.reserva_confirmada", sub: "notif.s.reserva_confirmada" },
  reserva_rechazada: { title: "notif.l.reserva_rechazada", sub: "notif.s.reserva_rechazada" },
  en_camino: { title: "notif.l.en_camino", sub: "notif.s.en_camino" },
  completada: { title: "notif.l.completada", sub: "notif.s.completada" },
  recordatorio: { title: "notif.l.recordatorio", sub: "notif.s.recordatorio" },
  favorito_disponible: { title: "notif.l.favorito_disponible", sub: "notif.s.favorito_disponible" },
  marketing: { title: "notif.l.marketing", sub: "notif.s.marketing" },
  push: { title: "notif.l.push", sub: "notif.s.push" },
};

export function useUpdateNotifConfig() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const { t } = useT();
  return useMutation({
    mutationFn: async (next: NotifConfig) => {
      if (!usuario?.id) throw new Error(t("notif.sinSesion"));
      const { error } = await supabase
        .from("usuarios")
        .update({ notif_config: next })
        .eq("id", usuario.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuario"] }),
  });
}
