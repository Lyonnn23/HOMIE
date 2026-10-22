import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { solicitudFotoPath } from "@/lib/solicitud-fotos";

export function SolicitudFoto({ foto, className, onOpen }: {
  foto: string; className: string; onOpen?: (url: string) => void;
}) {
  const { user } = useAuth();
  const path = solicitudFotoPath(foto, import.meta.env.VITE_SUPABASE_URL);
  const query = useQuery({
    queryKey: ["solicitud-foto", user?.id, path],
    enabled: !!user && !!path,
    staleTime: 180_000,
    gcTime: 240_000,
    refetchInterval: 240_000,
    retry: false,
    queryFn: async () => {
      if (!path || !user) return null;
      const { data, error } = await supabase.storage.from("solicitudes").createSignedUrl(path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const url = query.data;
  const content = url
    ? <img src={url} alt="Foto de la solicitud" className="size-full object-cover" />
    : <span className="flex size-full items-center justify-center text-muted-foreground" title={query.isError ? "Foto privada" : "Cargando foto"}>
        {query.isError ? <Lock className="size-4" /> : <ImageIcon className="size-4" />}
      </span>;
  if (onOpen) return <Button type="button" variant="ghost" aria-label="Ampliar foto de la solicitud"
    disabled={!url} onClick={() => { if (url) onOpen(url); }}
    className={`h-auto p-0 overflow-hidden border border-border bg-muted ${className}`}>{content}</Button>;
  return <div className={`overflow-hidden border border-border bg-muted ${className}`}>{content}</div>;
}