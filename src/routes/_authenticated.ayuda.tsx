import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Mail } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/ayuda")({
  head: () => ({ meta: [{ title: "Ayuda y soporte — Homie" }] }),
  component: AyudaPage,
});

const FAQS = [
  {
    q: "¿Cómo reservo un servicio?",
    a: "Busca el servicio que necesitas, elige un prestador, selecciona fecha, hora y dirección, y confirma. El prestador aceptará tu reserva y te avisaremos al instante.",
  },
  {
    q: "¿Cómo funcionan los pagos?",
    a: "Pagas el total del servicio de forma segura dentro de la app. El precio incluye una comisión de servicio del 15% que nos permite operar la plataforma.",
  },
  {
    q: "¿Puedo cancelar una reserva?",
    a: "Sí, puedes cancelar desde \"Mis reservas\" mientras el servicio no haya comenzado. Si ya fue confirmada, te recomendamos avisar al prestador por el chat.",
  },
  {
    q: "¿Qué pasa si tengo un problema con un prestador?",
    a: "Puedes reportarlo directamente desde la reserva con el botón de reporte. Nuestro equipo revisa cada caso y toma medidas, incluyendo la suspensión de prestadores.",
  },
];

function AyudaPage() {
  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Ayuda y soporte</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Respuestas rápidas a las dudas más comunes.</p>
      </header>

      <section className="px-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Preguntas frecuentes
        </h2>
        <div className="rounded-2xl bg-white border border-[#E5E7EB] divide-y divide-[#E5E7EB] overflow-hidden">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none text-sm font-medium">
                <span className="flex-1">{f.q}</span>
                <ChevronDown className="size-4 text-[#9CA3AF] transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm text-[#6B7280]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6 pb-10">
        <div className="p-5 rounded-2xl bg-[#111827] text-white">
          <h2 className="font-semibold">¿Necesitas más ayuda?</h2>
          <p className="mt-1 text-sm text-white/70">Escríbenos y te responderemos lo antes posible.</p>
          <a
            href="mailto:soporte@homie.cl?subject=Necesito%20ayuda%20con%20Homie"
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold text-sm"
          >
            <Mail className="size-4" /> soporte@homie.cl
          </a>
        </div>
      </section>
    </AppShell>
  );
}
