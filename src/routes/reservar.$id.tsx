import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { getProvider, formatCLP } from "@/data/services";
import { addBooking } from "@/store/bookings";

export const Route = createFileRoute("/reservar/$id")({
  validateSearch: z.object({ service: z.string().optional() }),
  component: BookingPage,
});

function nextDays(n: number) {
  const out: { value: string; label: string; day: string }[] = [];
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const days = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      value: d.toISOString().slice(0, 10),
      label: `${d.getDate()} ${months[d.getMonth()]}`,
      day: i === 0 ? "Hoy" : days[d.getDay()],
    });
  }
  return out;
}

const TIMES = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00"];

function BookingPage() {
  const { id } = Route.useParams();
  const { service: incoming } = Route.useSearch();
  const navigate = useNavigate();
  const p = getProvider(id);

  const days = useMemo(() => nextDays(10), []);
  const [date, setDate] = useState(days[0].value);
  const [time, setTime] = useState(TIMES[0]);
  const [serviceName, setServiceName] = useState<string | undefined>(
    incoming && p?.services.find((s) => s.name === incoming) ? incoming : p?.services[0]?.name,
  );
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (!p) return <AppShell><div className="p-8">Prestador no encontrado</div></AppShell>;

  const selected = p.services.find((s) => s.name === serviceName) ?? p.services[0];
  const fee = 1500;
  const total = selected.price + fee;

  function confirm() {
    if (!address.trim()) return;
    addBooking({
      providerId: p!.id,
      providerName: p!.name,
      service: selected.name,
      date, time, address, note, price: total,
    });
    setConfirmed(true);
  }

  if (confirmed) {
    return (
      <AppShell>
        <div className="px-5 pt-20 text-center">
          <div className="mx-auto size-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="size-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">¡Reserva confirmada!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {p.name} se contactará contigo para confirmar la visita.
          </p>
          <div className="mt-8 mx-auto max-w-sm p-4 rounded-2xl bg-white border border-border text-left text-sm space-y-2">
            <Row label="Servicio" value={selected.name} />
            <Row label="Fecha" value={`${date} · ${time}`} />
            <Row label="Dirección" value={address} />
            <Row label="Total" value={formatCLP(total)} bold />
          </div>
          <div className="mt-6 flex gap-2 justify-center">
            <button onClick={() => navigate({ to: "/reservas" })} className="px-5 py-3 rounded-2xl bg-foreground text-background font-semibold text-sm">
              Ver mis reservas
            </button>
            <button onClick={() => navigate({ to: "/" })} className="px-5 py-3 rounded-2xl border border-border font-semibold text-sm">
              Inicio
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-2">
        <button onClick={() => navigate({ to: -1 as never } as never).catch(() => navigate({ to: "/" }))} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Reservar</h1>
      </header>

      <div className="px-5 mt-2">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border">
          <ProviderAvatar seed={p.avatarSeed} name={p.name} size={48} />
          <div>
            <div className="font-semibold text-sm">{p.name}</div>
            <div className="text-xs text-muted-foreground">{selected.name}</div>
          </div>
        </div>
      </div>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Servicio</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.services.map((s) => (
            <button key={s.name} onClick={() => setServiceName(s.name)}
              className={`px-3 py-2 rounded-full text-sm border transition ${
                serviceName === s.name ? "bg-foreground text-background border-foreground" : "bg-white border-border"
              }`}>
              {s.name}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fecha</h2>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button key={d.value} onClick={() => setDate(d.value)}
              className={`shrink-0 w-16 py-3 rounded-2xl border text-center transition ${
                date === d.value ? "bg-foreground text-background border-foreground" : "bg-white border-border"
              }`}>
              <div className="text-[11px] uppercase opacity-70">{d.day}</div>
              <div className="text-sm font-semibold mt-0.5">{d.label}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Hora</h2>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {TIMES.map((t) => (
            <button key={t} onClick={() => setTime(t)}
              className={`py-2.5 rounded-xl text-sm border transition ${
                time === t ? "bg-foreground text-background border-foreground" : "bg-white border-border"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dirección</h2>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, comuna"
          className="mt-2 w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30" />
      </section>

      <section className="px-5 mt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nota (opcional)</h2>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Detalles para el prestador..."
          className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 resize-none" />
      </section>

      <section className="px-5 mt-6">
        <div className="p-4 rounded-2xl bg-white border border-border space-y-2 text-sm">
          <Row label={selected.name} value={formatCLP(selected.price)} />
          <Row label="Comisión de servicio" value={formatCLP(fee)} />
          <div className="h-px bg-border my-2" />
          <Row label="Total" value={formatCLP(total)} bold />
        </div>
      </section>

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            disabled={!address.trim()}
            onClick={confirm}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar reserva · {formatCLP(total)}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
