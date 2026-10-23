import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, BellRing, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { PUSH_APP_ID, estadoPush, iniciarPush, pedirPermisoPush, type EstadoPush } from "@/lib/push";
import {
  DEFAULT_NOTIF_CONFIG,
  NOTIF_LABELS,
  useUpdateNotifConfig,
  type NotifConfig,
  type NotifKey,
} from "@/hooks/use-notif-config";

export const Route = createFileRoute("/_authenticated/notif-config")({
  head: () => ({ meta: [
    { name: "description", content: "Preferencias de avisos de reservas y novedades de tu cuenta Homie." },
    { property: "og:title", content: "Preferencias de notificaciones — Homie" },
    { property: "og:description", content: "Preferencias de avisos de reservas y novedades de tu cuenta Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Preferencias de notificaciones — Homie" }] }),
  component: NotifConfigPage,
});

function NotifConfigPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const update = useUpdateNotifConfig();

  const config: NotifConfig = useMemo(() => {
    const raw = (usuario as unknown as { notif_config?: Partial<NotifConfig> } | null)?.notif_config;
    return { ...DEFAULT_NOTIF_CONFIG, ...(raw ?? {}) };
  }, [usuario]);

  function setKey(k: NotifKey, v: boolean) {
    const next: NotifConfig = { ...config, [k]: v };
    if (k === "master" && !v) {
      // si master se apaga, no tocamos los hijos (quedan como referencia)
    }
    update.mutate(next);
  }

  const keys: Exclude<NotifKey, "master">[] = [
    "push",
    "reserva_recibida",
    "reserva_confirmada",
    "reserva_rechazada",
    "en_camino",
    "completada",
    "recordatorio",
    "favorito_disponible",
    "marketing",
  ];

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-2">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-full hover:bg-[#F5F5F0]">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Notificaciones</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Elige cómo y cuándo quieres recibir avisos.
        </p>
      </header>

      <section className="px-5 mt-4">
        <div className="p-4 rounded-2xl bg-[#111827] text-white flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Activar todas las notificaciones</div>
            <div className="text-xs text-white/70 mt-0.5">
              Maestro: silencia o reactiva todos los avisos.
            </div>
          </div>
          <Toggle checked={config.master} onChange={(v) => setKey("master", v)} variant="dark" />
        </div>
      </section>

      <PushCard />

      <section className="px-5 mt-4">
        <div className={`rounded-2xl bg-white border border-[#E5E7EB] divide-y divide-[#E5E7EB] overflow-hidden ${!config.master ? "opacity-50 pointer-events-none" : ""}`}>
          {keys.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#111827]">{NOTIF_LABELS[k].title}</div>
                <div className="text-xs text-[#6B7280] mt-0.5">{NOTIF_LABELS[k].sub}</div>
              </div>
              <Toggle checked={config[k]} onChange={(v) => setKey(k, v)} />
            </div>
          ))}
        </div>
        {update.isPending && (
          <p className="mt-3 text-xs text-[#6B7280]">Guardando…</p>
        )}
      </section>
    </AppShell>
  );
}

function PushCard() {
  const [estado, setEstado] = useState<EstadoPush>("unsupported");
  const [pidiendo, setPidiendo] = useState(false);

  useEffect(() => {
    setEstado(estadoPush());
    void iniciarPush();
  }, []);

  async function activar() {
    setPidiendo(true);
    const res = await pedirPermisoPush();
    setPidiendo(false);
    setEstado(res);
    if (res === "granted") toast.success("Notificaciones activadas en este dispositivo");
    else if (res === "denied") toast.error("El navegador bloqueó las notificaciones");
  }

  let cuerpo: ReactNode;
  if (!PUSH_APP_ID) {
    cuerpo = <p className="text-sm text-[#6B7280]">Push aún no configurado por Homie. Mientras tanto recibirás los avisos dentro de la app.</p>;
  } else if (estado === "unsupported") {
    cuerpo = <p className="text-sm text-[#6B7280]">Este navegador no admite notificaciones push. En iPhone, agrega Homie a la pantalla de inicio (Compartir → Agregar a inicio) y vuelve aquí.</p>;
  } else if (estado === "granted") {
    cuerpo = (
      <p className="text-sm text-[#00754F] font-medium flex items-center gap-1.5">
        <BellRing className="size-4" /> Activadas en este dispositivo.
      </p>
    );
  } else if (estado === "denied") {
    cuerpo = (
      <div className="text-sm text-[#6B7280] space-y-1">
        <p className="font-medium text-[#B45309]">Bloqueadas por el navegador.</p>
        <p>Para activarlas: toca el candado o el ícono junto a la dirección del sitio → Permisos → Notificaciones → Permitir. En el teléfono, revisa Ajustes → Notificaciones → tu navegador.</p>
      </div>
    );
  } else {
    cuerpo = (
      <div className="space-y-3">
        <p className="text-sm text-[#6B7280]">Recibe avisos al instante cuando confirmen tu reserva, el profesional esté en camino o te escriban por el chat.</p>
        <button onClick={activar} disabled={pidiendo} className="btn-primary btn-sm inline-flex items-center gap-2">
          {pidiendo ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Activar notificaciones
        </button>
      </div>
    );
  }

  return (
    <section className="px-5 mt-4">
      <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4">
        <div className="text-sm font-semibold text-[#111827] mb-2">Notificaciones push en este dispositivo</div>
        {cuerpo}
      </div>
    </section>
  );
}

function Toggle({
  checked, onChange, variant = "light",
}: { checked: boolean; onChange: (v: boolean) => void; variant?: "light" | "dark" }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition shrink-0 ${
        checked ? "bg-[#EF9F27]" : variant === "dark" ? "bg-white/20" : "bg-[#E5E7EB]"
      }`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
