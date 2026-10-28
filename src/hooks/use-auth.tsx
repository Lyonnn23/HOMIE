import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { iniciarPush, loginPush, logoutPush } from "@/lib/push";
import { iniciarPushNativo, cerrarSesionPushNativo } from "@/lib/nativo";
import { setUsuarioMonitoreo } from "@/lib/monitoreo";
import { identificar, resetAnalitica } from "@/lib/analitica";
import { IDIOMAS, useT, type Idioma } from "@/i18n";

interface Usuario {
  id: string;
  nombre: string;
  email: string | null;
  foto_url: string | null;
  tipo: "cliente" | "prestador";
  notif_config?: Record<string, boolean> | null;
  idioma: Idioma;
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
  const { setIdioma } = useT();
  const idiomaCargado = useRef<string | null>(null);
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

  // Push: inicializa OneSignal una vez que la sesión es conocida y asocia el dispositivo al usuario.
  useEffect(() => {
    if (loading) return;
    try {
      void iniciarPush();
      if (user?.id) void loginPush(user.id);
      void iniciarPushNativo(user?.id); // no-op fuera de Capacitor
    } catch {
      /* push nunca bloquea */
    }
    setUsuarioMonitoreo(user?.id); // Sentry: asocia errores al usuario (solo id)
  }, [loading, user?.id]);

  const { data: usuario } = useQuery({
    queryKey: ["usuario", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Usuario | null> => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("usuarios")
        .select("id, nombre, email, foto_url, tipo, notif_config, idioma")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as Usuario) ?? null;
    },
  });

  useEffect(() => {
    if (!user) { idiomaCargado.current = null; return; }
    if (!usuario || idiomaCargado.current === user.id) return;
    idiomaCargado.current = user.id;
    if (IDIOMAS.some((i) => i.id === usuario.idioma)) setIdioma(usuario.idioma);
  }, [user, usuario, setIdioma]);

  // Analítica: identifica al usuario (solo id y tipo) cuando se conoce su fila.
  useEffect(() => {
    if (user?.id && usuario?.tipo) identificar(user.id, { tipo: usuario.tipo });
  }, [user?.id, usuario?.tipo]);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        usuario: usuario ?? null,
        loading,
        signOut: async () => {
          try { void logoutPush(); cerrarSesionPushNativo(); } catch { /* ignorar */ }
          resetAnalitica();
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
