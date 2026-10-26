import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, Gift, Share2, Ticket, Loader2, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCLP } from "@/data/services";
import { useT } from "@/i18n";
import { localeDe } from "@/i18n/estados";

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

/** `label` es una clave i18n "referidos.*". */
function estadoCupon(c: { activo: boolean; vence_at: string | null; usos: number; usos_por_usuario: number }) {
  if (!c.activo) return { label: "referidos.inactivo", cls: "bg-muted text-muted-foreground" };
  if (c.usos >= c.usos_por_usuario) return { label: "referidos.usado", cls: "bg-muted text-muted-foreground" };
  if (c.vence_at && new Date(c.vence_at).getTime() < Date.now()) return { label: "referidos.vencido", cls: "bg-[#FF3B6B20] text-[#FF3B6B]" };
  return { label: "referidos.disponible", cls: "bg-[#00C28820] text-[#00754F]" };
}

function ReferidosPage() {
  const { t, idioma } = useT();
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const info = useReferidoInfo();
  const cupones = useMisCupones();
  const [copiado, setCopiado] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");

  const codigo = info.data?.codigo_referido ?? "";
  const esPro = usuario?.tipo === "prestador";
  const nombre = usuario?.nombre?.split(" ")[0] ?? t("referidos.unAmigo");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = esPro ? `${origin}/registro?tipo=prestador&ref=${codigo}` : `${origin}/registro?ref=${codigo}`;
  const texto = esPro
    ? t("referidos.textoPro", { codigo, link })
    : t("referidos.textoCliente", { nombre, codigo, bono: formatCLP(BONO), link });

  const creadoHace = info.data?.created_at ? (Date.now() - new Date(info.data.created_at).getTime()) / 86400000 : Infinity;
  const puedeIngresar = !!info.data && !info.data.referido_por && creadoHace < DIAS_VENTANA;

  const usar = useMutation({
    mutationFn: async (c: string) => {
      const { data, error } = await supabase.rpc("usar_codigo_referido", { _codigo: c.trim().toUpperCase() });
      if (error) throw error;
      return data;
    },
    onSuccess: (cupon) => {
      toast.success(t("referidos.canjeado", { bono: formatCLP(BONO), cupon: String(cupon) }));
      setCodigoInput("");
      qc.invalidateQueries({ queryKey: ["referido-info"] });
      qc.invalidateQueries({ queryKey: ["cupones"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("referidos.codigoInvalido")),
  });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success(t("referidos.codigoCopiado"));
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error(t("referidos.errCopiar"));
    }
  }

  async function compartir() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("referidos.teInvito"), text: texto, url: link });
      } catch { /* cancelado */ }
    } else {
      try { await navigator.clipboard.writeText(texto); toast.success(t("referidos.invitacionCopiada")); } catch { toast.error(t("referidos.errCompartir")); }
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`;

  return (
    <AppShell>
      <header className="bg-[#111827] text-white px-5 pt-6 pb-8 -mt-px">
        <Link to="/cuenta" className="inline-flex p-2 -ml-2 rounded-full text-white/80 hover:bg-white/10" aria-label={t("referidos.volver")}>
          <ArrowLeft className="size-5" />
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="size-12 rounded-2xl bg-[#EF9F27] flex items-center justify-center shrink-0">
            <Gift className="size-6 text-[#111827]" />
          </span>
          <div>
            <h1 className="title-1">{t("referidos.titulo")}</h1>
            <p className="text-sm text-white/70 mt-0.5">
              {esPro ? t("referidos.subPro") : t("referidos.subCliente", { bono: formatCLP(BONO) })}
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-4 space-y-5 pb-10">
        <section className="p-5 rounded-3xl bg-white border border-border shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("referidos.tuCodigo")}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-14 px-4 rounded-2xl bg-[#F5F5F0] border border-border flex items-center font-mono text-2xl font-bold tracking-[0.25em] text-[#111827]">
              {info.isLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : codigo || "—"}
            </div>
            <button type="button" onClick={copiar} disabled={!codigo} aria-label={t("referidos.copiarCodigo")}
              className="size-14 rounded-2xl bg-[#111827] text-white flex items-center justify-center disabled:opacity-50">
              {copiado ? <Check className="size-5 text-[#00C288]" /> : <Copy className="size-5" />}
            </button>
          </div>
          {esPro ? (
            <p className="mt-3 text-sm text-[#374151]">
              {t("referidos.invitaColega")} <b className="text-[#111827]">{t("referidos.unMesPremium")}</b>.
            </p>
          ) : (
            <p className="mt-3 text-sm text-[#374151]">
              {t("referidos.amigoRecibe", { bono: "\u0000", bono2: "\u0001" }).split(/(\u0000|\u0001)/).map((parte, i) =>
                parte === "\u0000" || parte === "\u0001" ? <b key={i} className="text-[#111827]">{formatCLP(BONO)}</b> : <span key={i}>{parte}</span>)}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
              className={`h-12 rounded-2xl bg-[#25D366] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 ${!codigo ? "pointer-events-none opacity-50" : ""}`}>
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <button type="button" onClick={compartir} disabled={!codigo}
              className="h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <Share2 className="size-4" /> {t("referidos.compartir")}
            </button>
          </div>
        </section>

        <section className="p-4 rounded-2xl bg-[#F5F5F0] border border-border text-sm text-[#374151]">
          <div className="font-semibold text-[#111827] mb-1.5">{t("referidos.comoFunciona")}</div>
          {esPro ? (
            <ol className="space-y-1.5 list-decimal pl-4">
              <li>{t("referidos.pro1")}</li>
              <li>{t("referidos.pro2")}</li>
              <li>{t("referidos.pro3")}</li>
            </ol>
          ) : (
            <ol className="space-y-1.5 list-decimal pl-4">
              <li>{t("referidos.cli1")}</li>
              <li>{t("referidos.cli2", { bono: formatCLP(BONO), min: formatCLP(10000) })}</li>
              <li>{t("referidos.cli3", { bono: formatCLP(BONO) })}</li>
            </ol>
          )}
        </section>

        {puedeIngresar && (
          <section className="p-5 rounded-3xl bg-white border-2 border-[#EF9F27]">
            <div className="font-semibold text-[#111827]">{t("referidos.teInvitaron")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{t("referidos.primeraSemana")}</p>
            <div className="mt-3 flex gap-2">
              <input
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 12))}
                onKeyDown={(e) => { if (e.key === "Enter" && codigoInput.trim()) usar.mutate(codigoInput); }}
                placeholder={t("referidos.codigoPlaceholder")} autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                aria-label={t("referidos.codigoInvitacion")}
                className="flex-1 h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 font-mono tracking-widest uppercase"
              />
              <button type="button" disabled={usar.isPending || codigoInput.trim().length < 4} onClick={() => usar.mutate(codigoInput)}
                className="px-5 h-12 rounded-2xl bg-[#111827] text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                {usar.isPending && <Loader2 className="size-4 animate-spin" />} {t("referidos.canjear")}
              </button>
            </div>
          </section>
        )}
        {info.data?.referido_por && (
          <p className="text-xs text-muted-foreground text-center">{t("referidos.yaCanjeaste")}</p>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Ticket className="size-3.5" /> {t("referidos.misCupones")}
          </h2>
          <div className="rounded-2xl bg-white border border-border overflow-hidden">
            {cupones.isLoading ? (
              <div className="p-6 text-center"><Loader2 className="size-4 mx-auto animate-spin text-muted-foreground" /></div>
            ) : (cupones.data?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("referidos.sinCupones", { bono: formatCLP(BONO) })}
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
                          {c.vence_at ? ` · ${t("referidos.vence", { fecha: new Date(c.vence_at).toLocaleDateString(localeDe(idioma)) })}` : ""}
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>{t(st.label)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("referidos.seAplican")}</p>
        </section>
      </div>
    </AppShell>
  );
}
