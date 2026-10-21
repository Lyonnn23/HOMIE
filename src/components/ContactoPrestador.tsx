import { useQuery } from "@tanstack/react-query";
import { Phone, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Botones WhatsApp / Llamar. Solo aparecen cuando la reserva está PAGADA y
 * vigente (confirmada o en camino): la función `contacto_prestador` del servidor
 * no devuelve nada en otro caso, así la comisión de Homie queda protegida.
 */
export function ContactoPrestador({ reservaId, nombre }: { reservaId: string; nombre: string }) {
  const q = useQuery({
    queryKey: ["contacto-prestador", reservaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("contacto_prestador", { _reserva_id: reservaId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const c = q.data;
  if (!c || (!c.telefono && !c.whatsapp)) return null;
  const wa = (c.whatsapp ?? c.telefono ?? "").replace(/[^\d]/g, "");
  const waNum = wa.startsWith("56") ? wa : `56${wa.replace(/^0/, "")}`;
  const msg = encodeURIComponent(`Hola ${nombre.split(" ")[0]}, te contacto por mi reserva en Homie para coordinar la visita.`);
  return (
    <>
      {c.whatsapp || c.telefono ? (
        <a
          href={`https://wa.me/${waNum}?text=${msg}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold"
        >
          <MessageSquareText className="size-3.5" /> WhatsApp
        </a>
      ) : null}
      {c.telefono && (
        <a
          href={`tel:${c.telefono.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
        >
          <Phone className="size-3.5" /> Llamar
        </a>
      )}
    </>
  );
}
