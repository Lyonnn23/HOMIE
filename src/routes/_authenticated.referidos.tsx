import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, Gift, Share2, Ticket, Loader2, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCLP } from "@/data/services";

export const Route = createFileRoute("/_authenticated/referidos")({
  head: () => ({ meta: [
    { name: "description", content: "Invita a tus amigos a Homie: ambos reciben $3.000 de descuento." },
    { property: "og:title", content: "Invita y gana — Homie" },
    { property: "og:description", content: "Invita a tus amigos a Homie: ambos reciben $3.000 de descuento." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Invita y gana — Homie" }] }),
  component: ReferidosPage,
});

const BONO = 3000;
const DIAS_VENTANA = 7;

/** Datos de referido del usuario (no están en useAuth para no tocar ese hook). */
export function useReferidoInfo() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["referido-info", usuario?.id],
    enabled: !!usuario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("codigo_referido, referido_por, created_at, bono_referido_pagado")
        .eq("id", usuario!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useMisCupones() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["cupones", "mios-todos", usuario?.id],
    enabled: !!usuario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cupones")
        .select("codigo, descripcion, tipo, valor, minimo, activo, vence_at, usos, usos_por_usuario, created_at")
        .eq("usuario_id", usuario!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function estadoCupon(c: { activo: boolean; vence_at: string | null; usos: number; usos_por_usuario: number }) {
  if (!c.activo) return { label: "Inactivo", cls: "bg-muted text-muted-foreground" };
  if (c.usos >= c.usos_por_usuario) return { label: "Usado", cls: "bg-muted text-muted-foreground" };
  if (c.vence_at && new Date(c.vence_at).getTime() < Date.now()) return { label: "Vencido", cls: "bg-[#FF3B6B20] text-[#FF3B6B]" };
  return { label: "Disponible", cls: "bg-[#00C28820] text-[#00754F]" };
}

function ReferidosPage() {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const info = useReferidoInfo();
  const cupones = useMisCupones();
  const [copiado, setCopiado] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");

  const codigo = info.data?.codigo_referido ?? "";
  const nombre = usuario?.nombre?.split(" ")[0] ?? "Un amigo";
  const link = typeof window !== "undefined" ? `${window.location.origin}/registro?ref=${codigo}` : `/registro?ref=${codigo}`;
  const texto = `${nombre} te invita a Homie: profesionales verificados para tu hogar. Usa mi código ${codigo} y recibe ${formatCLP(BONO)} en tu primera reserva. ${link}`;

  const creadoHace = info.data?.created_at ? (Date.now() - new Date(info.data.created_at).getTime()) / 86400000 : Infinity;
  const puedeIngresar = !!info.data && !info.data.referido_por && creadoHace < DIAS_VENTANA;

  const usar = useMutation({
    mutationFn: async (c: string) => {
      const { data, error } = await supabase.rpc("usar_codigo_referido", { _codigo: c.trim().toUpperCase() });
      if (error) throw error;
      return data;
    },
    onSuccess: (cupon) => {
      toast.success(`¡Listo! Tienes ${formatCLP(BONO)} con el cupón ${cupon}`);
      setCodigoInput("");
      qc.invalidateQueries({ queryKey: ["referido-info"] });
      qc.invalidateQueries({ queryKey: ["cupones"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Código no válido"),
  });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success("Código copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function compartir() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Te invito a Homie", text: texto, url: link });
      } catch { /* cancelado */ }
    } else {
      try { await navigator.clipboard.writeText(texto); toast.success("Invitación copiada"); } catch { toast.error("No se pudo compartir"); }
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`;

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-6 pb-8 -mt-px">
        <Link to="/cuenta" className="inline-flex p-2 -ml-2 rounded-full text-white/80 hover:bg-white/10" aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="size-12 rounded-2xl bg-[#EF9F27] flex items-center justify-center shrink-0">
            <Gift className="size-6 text-[#111827]" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invita y gana</h1>
            <p className="text-sm text-white/70 mt-0.5">{formatCLP(BONO)} para ti y {formatCLP(BONO)} para tu amigo</p>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-4 space-y-5 pb-10">
        <section className="p-5 rounded-3xl bg-white border border-border shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tu código</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-14 px-4 rounded-2xl bg-[#F5F5F0] border border-border flex items-center font-mono text-2xl font-bold tracking-[0.25em] text-[#111827]">
              {info.isLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : codigo || "—"}
            </div>
            <button type="button" onClick={copiar} disabled={!codigo} aria-label="Copiar código"
              className="size-14 rounded-2xl bg-[#111827] text-white flex items-center justify-center disabled:opacity-50">
              {copiado ? <Check className="size-5 text-[#00C288]" /> : <Copy className="size-5" />}
            </button>
          </div>
          <p className="mt-3 text-sm text-[#374151]">
            Tu amigo recibe <b className="text-[#111827]">{formatCLP(BONO)}</b> en su primera reserva; tú recibes{" "}
            <b className="text-[#111827]">{formatCLP(BONO)}</b> cuando la complete.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
              className={`h-12 rounded-2xl bg-[#25D366] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 ${!codigo ? "pointer-events-none opacity-50" : ""}`}>
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <button type="button" onClick={compartir} disabled={!codigo}
              className="h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <Share2 className="size-4" /> Compartir
            </button>
          </div>
        </section>

        <section className="p-4 rounded-2xl bg-[#F5F5F0] border border-border text-sm text-[#374151]">
          <div className="font-semibold text-[#111827] mb-1.5">Cómo funciona</div>
          <ol className="space-y-1.5 list-decimal pl-4">
            <li>Comparte tu código o tu enlace con amigos y vecinos.</li>
            <li>Al registrarse e ingresar tu código, reciben un cupón de {formatCLP(BONO)} (reservas desde {formatCLP(10000)}).</li>
            <li>Cuando completan y pagan su primer servicio, tú recibes un cupón de {formatCLP(BONO)}.</li>
          </ol>
        </section>

        {puedeIngresar && (
          <section className="p-5 rounded-3xl bg-white border-2 border-[#EF9F27]">
            <div className="font-semibold text-[#111827]">¿Te invitaron? Ingresa el código</div>
            <p className="text-xs text-muted-foreground mt-0.5">Solo durante tu primera semana en Homie.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 12))}
                onKeyDown={(e) => { if (e.key === "Enter" && codigoInput.trim()) usar.mutate(codigoInput); }}
                placeholder="Ej. A1B2C3" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                aria-label="Código de invitación"
                className="flex-1 h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 font-mono tracking-widest uppercase"
              />
              <button type="button" disabled={usar.isPending || codigoInput.trim().length < 4} onClick={() => usar.mutate(codigoInput)}
                className="px-5 h-12 rounded-2xl bg-[#111827] text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                {usar.isPending && <Loader2 className="size-4 animate-spin" />} Canjear
              </button>
            </div>
          </section>
        )}
        {info.data?.referido_por && (
          <p className="text-xs text-muted-foreground text-center">Ya canjeaste un código de invitación. ¡Gracias!</p>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Ticket className="size-3.5" /> Mis cupones
          </h2>
          <div className="rounded-2xl bg-white border border-border overflow-hidden">
            {cupones.isLoading ? (
              <div className="p-6 text-center"><Loader2 className="size-4 mx-auto animate-spin text-muted-foreground" /></div>
            ) : (cupones.data?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aún no tienes cupones. Invita a alguien y gana {formatCLP(BONO)}.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {cupones.data!.map((c) => {
                  const st = estadoCupon(c);
                  return (
                    <li key={c.codigo} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-sm text-[#111827] truncate">{c.codigo}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.tipo === "monto" ? formatCLP(c.valor) : `${c.valor}%`}
                          {c.descripcion ? ` · ${c.descripcion}` : ""}
                          {c.vence_at ? ` · vence ${new Date(c.vence_at).toLocaleDateString("es-CL")}` : ""}
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Los cupones se aplican al reservar, en “¿Tienes un cupón?”.</p>
        </section>
      </div>
    </AppShell>
  );
}
