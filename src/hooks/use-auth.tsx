import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Usuario {
  id: string;
  nombre: string;
  email: string | null;
  foto_url: string | null;
  tipo: "cliente" | "prestador";
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  usuario: Usuario | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  usuario: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  const { data: usuario } = useQuery({
    queryKey: ["usuario", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Usuario | null> => {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nombre, email, foto_url, tipo")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as Usuario) ?? null;
    },
  });

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        usuario: usuario ?? null,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
