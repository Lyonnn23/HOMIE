import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  clientId: string;
  clientName: string;
  service: string;
  serviceId: string | null;
  date: string;
  time: string;
  address: string;
  note?: string | null;
  price: number;
  status: "pendiente" | "confirmada" | "en camino" | "completado" | "cancelada";
  createdAt: number;
  hasReview?: boolean;
}

export type DbEstado = "pendiente" | "confirmada" | "en_camino" | "completada" | "cancelada";

const DB_TO_UI: Record<string, Booking["status"]> = {
  pendiente: "pendiente",
  confirmada: "confirmada",
  en_camino: "en camino",
  completada: "completado",
  cancelada: "cancelada",
};

const SELECT = `
  id, fecha, hora, direccion, estado, nota, total, created_at,
  prestador_id, cliente_id, servicio_id,
  prestador_nombre, cliente_nombre,
  servicios ( nombre ),
  resenas ( id )
`;

type Row = {
  id: string; fecha: string; hora: string; direccion: string;
  estado: string; nota: string | null; total: number; created_at: string;
  prestador_id: string; cliente_id: string; servicio_id: string | null;
  prestador_nombre: string | null;
  cliente_nombre: string | null;
  servicios: { nombre: string } | null;
  resenas: { id: string }[] | null;
};

function mapRow(r: Row): Booking {
  return {
    id: r.id,
    providerId: r.prestador_id,
    providerName: r.prestador_nombre ?? "Prestador",
    clientId: r.cliente_id,
    clientName: r.cliente_nombre ?? "Cliente",
    service: r.servicios?.nombre ?? "Servicio",
    serviceId: r.servicio_id,
    date: r.fecha,
    time: r.hora?.slice(0, 5) ?? r.hora,
    address: r.direccion,
    note: r.nota,
    price: r.total,
    status: DB_TO_UI[r.estado] ?? "pendiente",
    createdAt: new Date(r.created_at).getTime(),
    hasReview: (r.resenas?.length ?? 0) > 0,
  };
}

// Client-side: bookings as cliente
export function useBookings() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const clienteId = usuario?.id;

  const q = useQuery({
    queryKey: ["bookings", "cliente", clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("reservas")
        .select(SELECT)
        .eq("cliente_id", clienteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Row[]).map(mapRow);
    },
  });

  useEffect(() => {
    if (!clienteId) return;
    const ch = supabase
      .channel(`reservas-cliente-${clienteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservas", filter: `cliente_id=eq.${clienteId}` },
        () => qc.invalidateQueries({ queryKey: ["bookings", "cliente", clienteId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clienteId, qc]);

  return q.data ?? [];
}

// Provider-side: bookings received as prestador
export function useProviderBookings() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const usuarioId = usuario?.tipo === "prestador" ? usuario.id : undefined;

  const prestadorIdQ = useQuery({
    queryKey: ["prestador-id", usuarioId],
    enabled: !!usuarioId,
    queryFn: async () => {
      const { data } = await supabase
        .from("prestadores")
        .select("id")
        .eq("usuario_id", usuarioId!)
        .maybeSingle();
      return data?.id as string | undefined;
    },
  });
  const prestadorId = prestadorIdQ.data;

  const q = useQuery({
    queryKey: ["bookings", "prestador", prestadorId],
    enabled: !!prestadorId,
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("reservas")
        .select(SELECT)
        .eq("prestador_id", prestadorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Row[]).map(mapRow);
    },
  });

  useEffect(() => {
    if (!prestadorId) return;
    const ch = supabase
      .channel(`reservas-prestador-${prestadorId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservas", filter: `prestador_id=eq.${prestadorId}` },
        () => qc.invalidateQueries({ queryKey: ["bookings", "prestador", prestadorId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [prestadorId, qc]);

  return { bookings: q.data ?? [], isLoading: prestadorIdQ.isLoading || q.isLoading, hasPrestador: !!prestadorId };
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
  const { usuario } = useAuth();
  return useMutation({
    mutationFn: async (b: NewBookingInput) => {
      if (!usuario?.id) throw new Error("Debes iniciar sesión para reservar");
      const { data, error } = await supabase
        .from("reservas")
        .insert({
          cliente_id: usuario.id,
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
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: DbEstado }) => {
      const { error } = await supabase
        .from("reservas")
        .update({ estado })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useAddReview() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  return useMutation({
    mutationFn: async (input: { reservaId: string; prestadorId: string; calificacion: number; comentario: string; foto?: File | null }) => {
      if (!usuario?.id) throw new Error("Debes iniciar sesión");
      const { data: authData } = await supabase.auth.getUser();
      const authUid = authData.user?.id;
      let fotoUrl: string | null = null;
      if (input.foto && authUid) {
        const ext = input.foto.name.split(".").pop() || "jpg";
        const path = `${authUid}/${input.reservaId}-${Date.now()}.${ext}`;
        const up = await supabase.storage.from("resenas").upload(path, input.foto, { upsert: true });
        if (up.error) throw up.error;
        fotoUrl = supabase.storage.from("resenas").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("resenas").insert({
        reserva_id: input.reservaId,
        cliente_id: usuario.id,
        prestador_id: input.prestadorId,
        calificacion: input.calificacion,
        comentario: input.comentario || null,
        foto_url: fotoUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
    },
  });
}

export function useReplyReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { resenaId: string; respuesta: string }) => {
      const { error } = await supabase
        .from("resenas")
        .update({ respuesta_prestador: input.respuesta, respuesta_fecha: new Date().toISOString() })
        .eq("id", input.resenaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider"] });
    },
  });
}

