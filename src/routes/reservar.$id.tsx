import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Ticket, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProviderAvatar } from "@/components/Avatar";
import { useQuery } from "@tanstack/react-query";
import { useProvider, formatCLP, DIAS, esPro, MODALIDAD_LABEL, type Horario, type DiaKey } from "@/data/services";
import { useAddBooking } from "@/store/bookings";
import { createPaymentPreference } from "@/lib/mercadopago.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reservar/$id")({
  validateSearch: z.object({ service: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Reservar servicio — Homie" },
    { name: "description", content: "Reserva un servicio de Homie eligiendo fecha, hora y modalidad." },
    { property: "og:title", content: "Reservar servicio — Homie" },
    { property: "og:description", content: "Reserva un servicio de Homie eligiendo fecha, hora y modalidad." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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

const DIA_KEYS: DiaKey[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
type Modalidad = "domicilio" | "online" | "local";

/** Clave del día (lun..dom) para una fecha YYYY-MM-DD, en hora local. */
function diaKeyDe(fecha: string): DiaKey {
  const [y, m, d] = fecha.split("-").map(Number);
  return DIA_KEYS[new Date(y, m - 1, d).getDay()];
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Bloques de 1 hora desde `desde` hasta `hasta - 1h`. */
function slotsDe(horario: Horario, fecha: string): string[] {
  const dia = horario[diaKeyDe(fecha)];
  if (!dia?.activo) return [];
  const out: string[] = [];
  for (let t = toMin(dia.desde); t + 60 <= toMin(dia.hasta); t += 60) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

function useHorasOcupadas(prestadorId: string | undefined, fecha: string) {
  return useQuery({
    queryKey: ["horas-ocupadas", prestadorId, fecha],
    enabled: !!prestadorId && !!fecha,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.rpc("horas_ocupadas", { _prestador_id: prestadorId!, _fecha: fecha });
      if (error) throw error;
      return new Set((data ?? []).map((r) => String(r.hora).slice(0, 5)));
    },
  });
}

interface CuponAplicado { codigo: string; descuento: number; mensaje: string }

/** Cupones personales del usuario (referidos, regalos) para elegir con un toque. */
function useMisCupones() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["cupones", "mios", usuario?.id],
    enabled: !!usuario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cupones")
        .select("codigo, descripcion, tipo, valor, minimo, vence_at")
        .eq("usuario_id", usuario!.id)
        .eq("activo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const now = Date.now();
      return (data ?? []).filter((c) => !c.vence_at || new Date(c.vence_at).getTime() > now);
    },
  });
}

function BookingPage() {
  const { id } = Route.useParams();
  const { service: incoming } = Route.useSearch();
  const router = useRouter();
  const { data: p, isLoading } = useProvider(id);
  const addBooking = useAddBooking();
  const createPreference = useServerFn(createPaymentPreference);
  const misCupones = useMisCupones();
  const [cuponInput, setCuponInput] = useState("");
  const [cupon, setCupon] = useState<CuponAplicado | null>(null);
  const [validando, setValidando] = useState(false);

  const days = useMemo(() => nextDays(10), []);
  const [date, setDate] = useState(days[0].value);
  const [time, setTime] = useState<string | null>(null);
  const ocupadasQ = useHorasOcupadas(p?.id, date);
  const ocupadas = ocupadasQ.data ?? new Set<string>();
  const slots = useMemo(() => (p ? slotsDe(p.horario, date) : []), [p, date]);
  const diaActivo = p ? p.horario[diaKeyDe(date)]?.activo : true;
  const nowMin = date === days[0].value ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  const disponible = (t: string) => !ocupadas.has(t) && toMin(t) > nowMin;

  // Si cambia la fecha/horario y la hora elegida ya no es válida, elige la primera disponible.
  useEffect(() => {
    if (time && slots.includes(time) && disponible(time)) return;
    setTime(slots.find(disponible) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, ocupadasQ.data]);
  const [serviceName, setServiceName] = useState<string | undefined>(incoming);
  const [modalidad, setModalidad] = useState<Modalidad>("domicilio");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!p) return;
    if (!serviceName || !p.services.some((s) => s.name === serviceName)) {
      setServiceName(p.services[0]?.name);
    }
  }, [p, serviceName]);

  if (isLoading) return <AppShell><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppShell>;
  if (!p) return <AppShell><div className="p-8">Prestador no encontrado</div></AppShell>;

  const selected = p.services.find((s) => s.name === serviceName) ?? p.services[0];
  const pro = esPro(p.proHasta);
  const tasa = pro ? 0.12 : 0.15;
  const base = selected?.price ?? 0;
  const fee = Math.round(base * tasa);
  // El descuento se aplica sobre la tarifa del profesional; el total nunca baja de la comisión (igual que el trigger de la BD).
  const descuento = cupon ? Math.min(cupon.descuento, base) : 0;
  const total = Math.max(base + fee - descuento, fee);

  async function aplicarCupon(codigoRaw: string) {
    const codigo = codigoRaw.trim().toUpperCase();
    if (!codigo) return;
    setValidando(true);
    try {
      const { data, error } = await supabase.rpc("validar_cupon", { _codigo: codigo, _precio: base });
      if (error) throw error;
      const r = data?.[0];
      if (!r || !r.valido) {
        setCupon(null);
        toast.error(r?.mensaje || "Cupón no válido");
        return;
      }
      setCupon({ codigo, descuento: r.descuento, mensaje: r.mensaje });
      setCuponInput(codigo);
      toast.success(`${r.mensaje}: -${formatCLP(r.descuento)}`);
    } catch (err) {
      setCupon(null);
      toast.error(err instanceof Error ? err.message : "No se pudo validar el cupón");
    } finally {
      setValidando(false);
    }
  }

  function quitarCupon() { setCupon(null); setCuponInput(""); }

  const modalidadesServicio = (selected?.modalidades ?? ["domicilio"]) as Modalidad[];
  const elegirModalidad = modalidadesServicio.includes("online") && modalidadesServicio.length > 1;
  // Modalidad efectiva: la elegida si el servicio la ofrece; si no, la única/primera del servicio.
  const modalidadEfectiva: Modalidad = modalidadesServicio.includes(modalidad) ? modalidad : modalidadesServicio[0];
  const esOnline = modalidadEfectiva === "online";
  const direccionOk = esOnline || !!address.trim();

  const horarioHint = DIAS.filter((d) => p.horario[d.key]?.activo)
    .map((d) => `${d.corto} ${p.horario[d.key].desde}–${p.horario[d.key].hasta}`)
    .join(" · ");

  async function confirm() {
    if (!direccionOk || !selected || !p || !time) return;
    setPaying(true);
    let reservaId: string | null = null;
    try {
      const reserva = await addBooking.mutateAsync({
        providerId: p.id,
        serviceId: selected.id,
        service: selected.name,
        // Se envía el total sin descuento: el trigger de la BD valida el cupón y descuenta.
        date, time, address: esOnline ? "Online" : address.trim(), note, price: base + fee,
        modalidad: modalidadEfectiva,
        cuponCodigo: cupon?.codigo ?? null,
      });
      reservaId = reserva.id;
    } catch (err) {
      console.error(err);
      // El trigger de la BD lanza mensajes en español (día inactivo, fuera de horario, hora ocupada...).
      const msg = (err as { message?: string })?.message;
      toast.error(msg?.trim() || "No se pudo crear la reserva");
      ocupadasQ.refetch();
      setPaying(false);
      return;
    }
    try {
      const { initPoint } = await createPreference({ data: { reservaId } });
      window.location.href = initPoint;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setPaying(false);
    }
  }


  return (
    <AppShell>
      <header className="px-5 pt-6 pb-2">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Reservar</h1>
      </header>

      <div className="px-5 mt-2">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border">
          <ProviderAvatar url={p.avatarUrl} name={p.name} size={48} />
          <div>
            <div className="font-semibold text-sm">{p.name}</div>
            <div className="text-xs text-muted-foreground">{selected?.name}</div>
          </div>
        </div>
      </div>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Servicio</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.services.map((s) => (
            <button key={s.id} onClick={() => setServiceName(s.name)}
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
        {!diaActivo ? (
          <div className="mt-2 p-4 rounded-2xl bg-[#F5F5F0] border border-border text-sm text-muted-foreground text-center">
            No atiende este día
          </div>
        ) : slots.length === 0 ? (
          <div className="mt-2 p-4 rounded-2xl bg-[#F5F5F0] border border-border text-sm text-muted-foreground text-center">
            Sin horas disponibles
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {slots.map((t) => {
              const libre = disponible(t);
              return (
                <button key={t} disabled={!libre} onClick={() => setTime(t)}
                  title={ocupadas.has(t) ? "Hora ocupada" : undefined}
                  className={`py-2.5 rounded-xl text-sm border transition ${
                    time === t ? "bg-foreground text-background border-foreground"
                    : libre ? "bg-white border-border"
                    : "bg-muted text-muted-foreground/50 border-border line-through cursor-not-allowed"
                  }`}>
                  {t}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-semibold">Horario del profesional:</span> {horarioHint || "no informado"}
        </p>
      </section>

      {elegirModalidad && (
        <section className="px-5 mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Modalidad</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {modalidadesServicio.map((m) => (
              <label key={m} className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm border cursor-pointer transition ${
                modalidadEfectiva === m ? "bg-foreground text-background border-foreground" : "bg-white border-border"
              }`}>
                <input type="radio" name="modalidad" className="sr-only" value={m} checked={modalidadEfectiva === m} onChange={() => setModalidad(m)} />
                {MODALIDAD_LABEL[m] ?? m}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Dirección {esOnline && <span className="normal-case font-normal">(opcional, servicio online)</span>}
        </h2>
        {!elegirModalidad && modalidadEfectiva !== "domicilio" && (
          <p className="mt-1 text-xs text-muted-foreground">Este servicio es {MODALIDAD_LABEL[modalidadEfectiva]?.toLowerCase()}.</p>
        )}
        <input value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder={esOnline ? "No es necesaria para un servicio online" : modalidadEfectiva === "local" ? "Tu dirección de contacto (el servicio es en el local del profesional)" : "Calle, número, comuna"}
          className="mt-2 w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30" />
      </section>

      <section className="px-5 mt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nota (opcional)</h2>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Detalles para el prestador..."
          className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 resize-none" />
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">¿Tienes un cupón?</h2>
        {(misCupones.data?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {misCupones.data!.map((c) => {
              const on = cupon?.codigo === c.codigo;
              return (
                <button key={c.codigo} type="button" disabled={validando}
                  onClick={() => (on ? quitarCupon() : aplicarCupon(c.codigo))}
                  title={c.descripcion ?? undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition disabled:opacity-50 ${
                    on ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-[#EF9F27] text-[#111827]"
                  }`}>
                  <Ticket className={`size-3.5 ${on ? "text-[#EF9F27]" : "text-[#EF9F27]"}`} />
                  {c.codigo} · {c.tipo === "monto" ? formatCLP(c.valor) : `${c.valor}%`}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <input
            value={cuponInput}
            onChange={(e) => { setCuponInput(e.target.value.toUpperCase()); if (cupon) setCupon(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicarCupon(cuponInput); } }}
            placeholder="Código (ej. HOMIE20)"
            autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            aria-label="Código de cupón"
            className="flex-1 h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 font-mono tracking-wide uppercase"
          />
          {cupon ? (
            <button type="button" onClick={quitarCupon}
              className="inline-flex items-center gap-1 px-4 rounded-2xl border border-border text-sm font-semibold hover:bg-muted">
              <X className="size-4" /> Quitar
            </button>
          ) : (
            <button type="button" onClick={() => aplicarCupon(cuponInput)} disabled={validando || !cuponInput.trim() || !base}
              className="inline-flex items-center gap-1 px-4 rounded-2xl bg-[#111827] text-white text-sm font-semibold disabled:opacity-50">
              {validando ? <Loader2 className="size-4 animate-spin" /> : null} Aplicar
            </button>
          )}
        </div>
        {cupon && (
          <p className="mt-1.5 text-xs text-[#00754F] font-medium">✓ {cupon.mensaje} · ahorras {formatCLP(descuento)}</p>
        )}
      </section>

      <section className="px-5 mt-6">
        <div className="p-4 rounded-2xl bg-[#F5F5F0] border border-border space-y-2 text-sm">
          <Row label={selected?.name ?? ""} value={formatCLP(base)} />
          <Row label={`Comisión de servicio (${Math.round(tasa * 100)}%)${pro ? " · Pro" : ""}`} value={formatCLP(fee)} />
          {cupon && descuento > 0 && (
            <div className="flex items-center justify-between gap-3 text-[#00754F]">
              <span className="inline-flex items-center gap-1"><Ticket className="size-3.5" /> Cupón {cupon.codigo}</span>
              <span className="font-semibold">−{formatCLP(descuento)}</span>
            </div>
          )}
          {selected && selected.priceTo > selected.price && (
            <div className="mt-1 p-3 rounded-xl bg-white border border-border text-xs text-[#374151]">
              <div className="font-semibold text-[#111827]">Estimado del trabajo: {formatCLP(selected.price)} – {formatCLP(selected.priceTo)}</div>
              Hoy pagas el precio desde. Si el trabajo requiere materiales o tiempo extra, el profesional te lo informa
              antes de empezar y el valor final <b>nunca puede superar {formatCLP(selected.priceTo)}</b> (más la comisión).
              Si te cobran más, repórtalo y Homie media.
            </div>
          )}
          <div className="h-px bg-border my-2" />
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold">Total</span>
            <span className="font-bold text-lg text-[#EF9F27]">{formatCLP(total)}</span>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            disabled={!direccionOk || !time || paying || addBooking.isPending}
            onClick={confirm}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {paying ? "Redirigiendo a Mercado Pago..." : `Pagar ${formatCLP(total)} con Mercado Pago`}
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
