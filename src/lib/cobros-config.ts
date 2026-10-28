import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCobrosConfig() {
  return useQuery({
    queryKey: ["config-cobros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_publica").select("clave, valor, descripcion").order("clave");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function valorCobro(rows: { clave: string; valor: number }[] | undefined, clave: string, fallback: number) {
  return Number(rows?.find((row) => row.clave === clave)?.valor ?? fallback);
}