import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, CalendarCheck, ThumbsUp, FileCheck2, Wallet, Lock, Scale, IdCard, ListChecks, Banknote, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TicketPrecio } from "@/components/TicketPrecio";
import { Faq } from "@/components/Faq";
import { FAQ_CLIENTES, FAQ_PROFESIONALES } from "@/data/faq";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
    { property: "og:title", content: "Cómo funciona Homie — verificación, precio garantizado y pago protegido" },
    { property: "og:description", content: "Cómo reservar un profesional verificado a domicilio en Homie: busca, reserva con precio garantizado, paga protegido con Mercado Pago y confirma al terminar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    
      { title: "Cómo funciona Homie — verificación, precio garantizado y pago protegido" },
      { name: "description", content: "Cómo reservar un profesional verificado a domicilio en Homie: busca, reserva con precio garantizado, paga protegido con Mercado Pago y confirma al terminar." },
    ],
  }),
  component: ComoFuncionaPage,
});

type Tab = "clientes" | "profesionales";

const PASOS_CLIENTE = [
  { icon: Search, t: "Busca y compara", d: "Escribe el servicio que necesitas. Verás profesionales verificados cerca de ti, con reseñas reales y su rango de precio publicado. Si el trabajo es grande, pide cotizaciones y compara propuestas." },
  { icon: CalendarCheck, t: "Reserva y paga protegido", d: "Eliges fecha, hora y dirección. Pagas el precio desde con Mercado Pago. El dinero queda retenido: el profesional sabe que está pagado, pero no lo recibe todavía." },
  { icon: ThumbsUp, t: "Confirma y califica", d: "Cuando el trabajo está listo, confirmas en la app y se libera el pago. Si algo no cuadra, abres un reclamo y Homie media. Tu reseña queda visible para los próximos clientes." },
];

const PASOS_PRO = [
  { icon: IdCard, t: "Verifica tu identidad y tu rubro", d: "Sube tu cédula, una selfie, el certificado de antecedentes y un certificado o título del rubro. Revisamos a mano en 24 a 48 horas hábiles." },
  { icon: ListChecks, t: "Publica tus servicios con rango", d: "Para cada servicio fijas un precio desde y un precio hasta (máximo 1,5 veces el desde). Defines tu zona, tu horario y si aceptas urgencias." },
  { icon: Banknote, t: "Trabaja y cobra seguro", d: "Recibes reservas pagadas por adelantado y retenidas en Mercado Pago. Al confirmar el cliente, el dinero llega a tu cuenta: el 100% tus primeros 3 meses y luego descontando la comisión de Homie (15%, o 12% con Premium)." },
];

function ComoFuncionaPage() {
  const [tab, setTab] = useState<Tab>("clientes");

  return (
    <AppShell wide>
      <section className="bg-[#111827] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-dots-soft pointer-events-none" aria-hidden />
        <div className="container-landing relative py-12 md:py-16">
          <h1 className="title-1 text-white max-w-[20ch]">Cómo funciona Homie</h1>
          <p className="mt-3 text-white/75 leading-relaxed max-w-[52ch]">
            Una forma simple de contratar a domicilio: profesionales verificados, precio acordado antes y pago protegido hasta que confirmas.
          </p>

          <div role="tablist" aria-label="Para quién" className="mt-8 inline-flex p-1 rounded-[12px] bg-white/10">
            {(["clientes", "profesionales"] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                id={`tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                onClick={() => setTab(t)}
                className={`h-10 px-5 rounded-[10px] text-sm font-semibold transition-colors ${tab === t ? "bg-white text-[#111827]" : "text-white/80 hover:text-white"}`}
              >
                {t === "clientes" ? "Clientes" : "Profesionales"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {tab === "clientes" ? (
        <div id="panel-clientes" role="tabpanel" aria-labelledby="tab-clientes">
          <section className="bg-white">
            <div className="container-landing py-14 md:py-20">
              <h2 className="title-2 text-[#111827]">Tres pasos para reservar</h2>
              <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
                {PASOS_CLIENTE.map((p, i) => (
                  <li key={p.t} className="card p-5 md:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#111827] text-white text-sm font-bold" aria-hidden>{i + 1}</span>
                      <p.icon className="size-5 text-[#6B7280]" aria-hidden />
                    </div>
                    <h3 className="title-3 mt-4 text-[#111827]">{p.t}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{p.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <RangoYPago />

          <section className="bg-white">
            <div className="container-landing py-14 md:py-20 grid gap-8 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-14">
              <div>
                <h2 className="title-2 text-[#111827]">Preguntas frecuentes</h2>
                <p className="mt-2 text-[#6B7280]">Todo lo que suelen preguntar antes de la primera reserva.</p>
              </div>
              <Faq items={FAQ_CLIENTES} />
            </div>
          </section>

          <section className="bg-[#F3F4F6]">
            <div className="container-landing py-12 md:py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h2 className="title-3 text-[#111827]">¿Listo para probar?</h2>
                <p className="mt-1 text-[#6B7280]">Busca un servicio o pide cotizaciones para un trabajo grande.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/buscar" className="btn-primary">Buscar un profesional</Link>
                <Link to="/solicitar" className="btn-secondary">Pedir cotizaciones</Link>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div id="panel-profesionales" role="tabpanel" aria-labelledby="tab-profesionales">
          <section className="bg-white">
            <div className="container-landing py-14 md:py-20">
              <h2 className="title-2 text-[#111827]">Cómo empezar a recibir clientes</h2>
              <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
                {PASOS_PRO.map((p, i) => (
                  <li key={p.t} className="card p-5 md:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#111827] text-white text-sm font-bold" aria-hidden>{i + 1}</span>
                      <p.icon className="size-5 text-[#6B7280]" aria-hidden />
                    </div>
                    <h3 className="title-3 mt-4 text-[#111827]">{p.t}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{p.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="bg-[#F3F4F6]">
            <div className="container-landing py-14 md:py-20 grid gap-10 md:grid-cols-2 md:gap-14 md:items-start">
              <div>
                <h2 className="title-2 text-[#111827]">Gratis 3 meses, después 15%</h2>
                <p className="mt-3 text-[#4B5563] leading-relaxed max-w-[52ch]">
                  El cliente paga exactamente tu precio, sin recargos. Tus primeros 3 meses desde la verificación no pagas comisión. Después, Homie descuenta 15% (12% con Homie Premium) solo cuando un servicio se completa y el cliente confirma. Sin costo por publicar ni por reservas canceladas.
                </p>
                <div className="mt-6 card p-5">
                  <div className="text-sm font-semibold text-[#6B7280]">Ejemplo</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">Tu precio</dt><dd className="font-semibold tabular-nums">$30.000</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">El cliente paga</dt><dd className="font-semibold tabular-nums">$30.000</dd></div>
                    <div className="flex justify-between gap-4 border-t border-[#E5E7EB] pt-2"><dt className="font-semibold text-[#111827]">Recibes los primeros 3 meses</dt><dd className="font-bold tabular-nums" style={{ color: "var(--bosque)" }}>$30.000</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">Después (15%)</dt><dd className="font-semibold tabular-nums">$25.500</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">Después con Premium (12%)</dt><dd className="font-semibold tabular-nums">$26.400</dd></div>
                  </dl>
                </div>
              </div>
              <div>
                <h2 className="title-2 text-[#111827]">Lo que ganas con Homie</h2>
                <ul className="mt-5 space-y-4">
                  {[
                    { icon: Lock, t: "Reservas pagadas por adelantado", d: "El cliente paga al reservar. Se acabaron los “te pago la próxima”." },
                    { icon: Wallet, t: "Tu rango, tus reglas", d: "Tú fijas el desde y el hasta. Si el trabajo requiere más, lo acuerdas antes dentro del rango." },
                    { icon: Star, t: "Reputación que vende", d: "Las reseñas verificadas y la respuesta rápida te suben en los resultados." },
                    { icon: Scale, t: "Respaldo en reclamos", d: "Si un cliente reclama, revisamos tu evidencia y resolvemos en máximo 5 días hábiles." },
                  ].map(({ icon: Icon, t, d }) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white border border-[#E5E7EB]" aria-hidden>
                        <Icon className="size-5 text-[#111827]" />
                      </span>
                      <span>
                        <span className="block font-semibold text-[#111827]">{t}</span>
                        <span className="block text-sm text-[#4B5563] leading-relaxed">{d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/registro" search={{ tipo: "prestador" }} className="btn-primary mt-8 w-full sm:w-auto">
                  Quiero ofrecer mis servicios
                </Link>
              </div>
            </div>
          </section>

          <section className="bg-white">
            <div className="container-landing py-14 md:py-20 grid gap-8 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-14">
              <div>
                <h2 className="title-2 text-[#111827]">Preguntas frecuentes</h2>
                <p className="mt-2 text-[#6B7280]">Lo que los profesionales nos preguntan antes de registrarse.</p>
              </div>
              <Faq items={FAQ_PROFESIONALES} />
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function RangoYPago() {
  return (
    <section className="bg-[#F3F4F6]">
      <div className="container-landing py-14 md:py-20 grid gap-10 md:grid-cols-2 md:gap-14 md:items-center">
        <div>
          <h2 className="title-2 text-[#111827]">Rango de precio garantizado</h2>
          <p className="mt-3 text-[#4B5563] leading-relaxed max-w-[52ch]">
            Pagas el precio desde al reservar. Si al llegar el profesional ve que el trabajo requiere más, te lo dice antes de empezar y el total nunca supera el precio hasta. Si no estás de acuerdo, cancelas sin costo.
          </p>
          <h2 className="title-2 mt-10 text-[#111827]">Pago protegido</h2>
          <ul className="mt-4 space-y-3">
            {[
              { icon: Lock, color: "var(--pacifico)", t: "Mercado Pago retiene tu dinero", d: "El profesional ve la reserva pagada, pero no recibe el dinero hasta que confirmes." },
              { icon: FileCheck2, color: "var(--bosque)", t: "Se libera cuando confirmas", d: "O automáticamente 72 horas después del servicio si no confirmas ni reclamas." },
              { icon: Scale, color: "var(--pizarra)", t: "Mediación de Homie", d: "Con un reclamo abierto, el pago sigue retenido hasta resolver: reembolso total, parcial o liberación." },
            ].map(({ icon: Icon, color, t, d }) => (
              <li key={t} className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white border border-[#E5E7EB]" aria-hidden>
                  <Icon className="size-5" style={{ color }} />
                </span>
                <span>
                  <span className="block font-semibold text-[#111827]">{t}</span>
                  <span className="block text-sm text-[#4B5563] leading-relaxed">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:justify-self-center w-full max-w-[420px]">
          <TicketPrecio />
        </div>
      </div>
    </section>
  );
}
