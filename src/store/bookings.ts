import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Cliente demo (seed). Como la app no tiene login, todas las reservas se
// crean asociadas a este usuario.
export const DEMO_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  service: string;
  date: string;
  time: string;
  address: string;
  note?: string | null;
  price: number;
  status: "pendiente" | "confirmada" | "en camino" | "completado" | "cancelada";
  createdAt: number;
}

const DB_TO_UI: Record<string, Booking["status"]> = {
  pendiente: "pendiente",
  confirmada: "confirmada",
  en_camino: "en camino",
  completada: "completado",
  cancelada: "cancelada",
};

export function useBookings() {
  const q = useQuery({
    queryKey: ["bookings", DEMO_CLIENT_ID],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("reservas")
        .select(`
          id, fecha, hora, direccion, estado, nota, total, created_at,
          prestador_id,
          prestadores ( id, usuarios ( nombre ) ),
          servicios ( nombre )
        `)
        .eq("cliente_id", DEMO_CLIENT_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      type Row = {
        id: string; fecha: string; hora: string; direccion: string;
        estado: string; nota: string | null; total: number; created_at: string;
        prestador_id: string;
        prestadores: { id: string; usuarios: { nombre: string } } | null;
        servicios: { nombre: string } | null;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        providerId: r.prestador_id,
        providerName: r.prestadores?.usuarios?.nombre ?? "Prestador",
        service: r.servicios?.nombre ?? "Servicio",
        date: r.fecha,
        time: r.hora?.slice(0, 5) ?? r.hora,
        address: r.direccion,
        note: r.nota,
        price: r.total,
        status: DB_TO_UI[r.estado] ?? "pendiente",
        createdAt: new Date(r.created_at).getTime(),
      }));
    },
  });
  return q.data ?? [];
}

export interface NewBookingInput {
  providerId: string;
  serviceId?: string;
  service: string;
  date: string;
  time: string;
  address: string;
  note?: string;
  price: number;
}

export function useAddBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: NewBookingInput) => {
      const { data, error } = await supabase
        .from("reservas")
        .insert({
          cliente_id: DEMO_CLIENT_ID,
          prestador_id: b.providerId,
          servicio_id: b.serviceId,
          fecha: b.date,
          hora: b.time,
          direccion: b.address,
          nota: b.note || null,
          total: b.price,
          estado: "pendiente",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", DEMO_CLIENT_ID] });
    },
  });
}
