import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, LifeBuoy, Mail, Scale } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/ayuda")({
  head: () => ({ meta: [
    { name: "description", content: "Ayuda y soporte para clientes y profesionales de Homie." },
    { property: "og:title", content: "Ayuda y soporte — Homie" },
    { property: "og:description", content: "Ayuda y soporte para clientes y profesionales de Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Ayuda y soporte — Homie" }] }),
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
    a: "Puedes reportarlo directamente desde la reserva con el botón de reporte, o enviar un reclamo en \"Reclamos y sugerencias\". Homie actúa como mediador entre cliente y profesional, revisa cada caso y toma medidas, incluyendo la suspensión de prestadores.",
  },
];

function AyudaPage() {
  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Ayuda y soporte</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Respuestas rápidas a las dudas más comunes.</p>
      </header>

      <section className="px-5 mb-3">
        <Link
          to="/soporte"
          className="flex items-center gap-4 p-5 rounded-2xl bg-[#111827] text-white hover:bg-[#1F2937] transition"
        >
          <span className="size-12 rounded-full bg-[#EF9F27] text-[#111827] flex items-center justify-center shrink-0">
            <LifeBuoy className="size-6" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold">Hablar con soporte</span>
            <span className="block text-sm text-white/70 mt-0.5">Chat con el equipo de Homie. Respondemos en menos de 24 h (lun–sáb).</span>
          </span>
          <ChevronDown className="size-5 text-white/60 -rotate-90 shrink-0" />
        </Link>
      </section>

      <section className="px-5 mb-6">
        <Link
          to="/reclamos"
          className="flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-[#EF9F27] hover:bg-[#EF9F27]/5 transition"
        >
          <span className="size-12 rounded-full bg-[#EF9F27] text-[#111827] flex items-center justify-center shrink-0">
            <Scale className="size-6" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-[#111827]">Reclamos y sugerencias</span>
            <span className="block text-sm text-[#6B7280] mt-0.5">
              ¿Tuviste un problema con un servicio? Homie media entre tú y el profesional.
            </span>
          </span>
          <ChevronDown className="size-5 text-[#9CA3AF] -rotate-90 shrink-0" />
        </Link>
      </section>

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
          <p className="mt-1 text-sm text-white/70">Escríbenos desde la app o por correo y te responderemos lo antes posible.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/soporte" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold text-sm">
              <LifeBuoy className="size-4" /> Hablar con soporte
            </Link>
            <a
              href="mailto:soporte@homie.cl?subject=Necesito%20ayuda%20con%20Homie"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 text-white font-semibold text-sm"
            >
              <Mail className="size-4" /> soporte@homie.cl
            </a>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
