import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, CalendarCheck, ThumbsUp, FileCheck2, Wallet, Lock, Scale, IdCard, ListChecks, Banknote, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TicketPrecio } from "@/components/TicketPrecio";
import { Faq } from "@/components/Faq";
import { FAQ_CLIENTES_BY_LANG, FAQ_PROFESIONALES_BY_LANG } from "@/data/faq";
import { useT } from "@/i18n";

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
  { icon: Search, t: "como.c1t", d: "como.c1d" },
  { icon: CalendarCheck, t: "como.c2t", d: "como.c2d" },
  { icon: ThumbsUp, t: "como.c3t", d: "como.c3d" },
];

const PASOS_PRO = [
  { icon: IdCard, t: "como.p1t", d: "como.p1d" },
  { icon: ListChecks, t: "como.p2t", d: "como.p2d" },
  { icon: Banknote, t: "como.p3t", d: "como.p3d" },
];

function ComoFuncionaPage() {
  const { t, idioma } = useT();
  const [tab, setTab] = useState<Tab>("clientes");

  return (
    <AppShell wide>
      <section className="bg-[#111827] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-dots-soft pointer-events-none" aria-hidden />
        <div className="container-landing relative py-12 md:py-16">
          <h1 className="title-1 text-white max-w-[20ch]">{t("como.titulo")}</h1>
          <p className="mt-3 text-white/75 leading-relaxed max-w-[52ch]">
            {t("como.sub")}
          </p>

          <div role="tablist" aria-label={t("como.paraQuien")} className="mt-8 inline-flex p-1 rounded-[12px] bg-white/10">
            {(["clientes", "profesionales"] as Tab[]).map((tb) => (
              <button
                key={tb}
                role="tab"
                id={`tab-${tb}`}
                aria-selected={tab === tb}
                aria-controls={`panel-${tb}`}
                onClick={() => setTab(tb)}
                className={`h-10 px-5 rounded-[10px] text-sm font-semibold transition-colors ${tab === tb ? "bg-white text-[#111827]" : "text-white/80 hover:text-white"}`}
              >
                {tb === "clientes" ? t("como.clientes") : t("como.profesionales")}
              </button>
            ))}
          </div>
        </div>
      </section>

      {tab === "clientes" ? (
        <div id="panel-clientes" role="tabpanel" aria-labelledby="tab-clientes">
          <section className="bg-white">
            <div className="container-landing py-14 md:py-20">
              <h2 className="title-2 text-[#111827]">{t("como.tresPasos")}</h2>
              <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
                {PASOS_CLIENTE.map((p, i) => (
                  <li key={p.t} className="card p-5 md:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#111827] text-white text-sm font-bold" aria-hidden>{i + 1}</span>
                      <p.icon className="size-5 text-[#6B7280]" aria-hidden />
                    </div>
                    <h3 className="title-3 mt-4 text-[#111827]">{t(p.t)}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{t(p.d)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <RangoYPago />

          <section className="bg-white">
            <div className="container-landing py-14 md:py-20 grid gap-8 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-14">
              <div>
                <h2 className="title-2 text-[#111827]">{t("como.faq")}</h2>
                <p className="mt-2 text-[#6B7280]">{t("como.faqClientesSub")}</p>
              </div>
              <Faq items={FAQ_CLIENTES_BY_LANG[idioma]} />
            </div>
          </section>

          <section className="bg-[#F3F4F6]">
            <div className="container-landing py-12 md:py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h2 className="title-3 text-[#111827]">{t("como.listo")}</h2>
                <p className="mt-1 text-[#6B7280]">{t("como.listoSub")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/buscar" className="btn-primary">{t("como.buscarPro")}</Link>
                <Link to="/solicitar" className="btn-secondary">{t("home.pedirCotizaciones")}</Link>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div id="panel-profesionales" role="tabpanel" aria-labelledby="tab-profesionales">
          <section className="bg-white">
            <div className="container-landing py-14 md:py-20">
              <h2 className="title-2 text-[#111827]">{t("como.empezar")}</h2>
              <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
                {PASOS_PRO.map((p, i) => (
                  <li key={p.t} className="card p-5 md:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#111827] text-white text-sm font-bold" aria-hidden>{i + 1}</span>
                      <p.icon className="size-5 text-[#6B7280]" aria-hidden />
                    </div>
                    <h3 className="title-3 mt-4 text-[#111827]">{t(p.t)}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{t(p.d)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="bg-[#F3F4F6]">
            <div className="container-landing py-14 md:py-20 grid gap-10 md:grid-cols-2 md:gap-14 md:items-start">
              <div>
                <h2 className="title-2 text-[#111827]">{t("como.gratis")}</h2>
                <p className="mt-3 text-[#4B5563] leading-relaxed max-w-[52ch]">
                  {t("como.gratisTexto")}
                </p>
                <div className="mt-6 card p-5">
                  <div className="text-sm font-semibold text-[#6B7280]">{t("como.ejemplo")}</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">{t("como.tuPrecio")}</dt><dd className="font-semibold tabular-nums">$30.000</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">{t("como.clientePaga")}</dt><dd className="font-semibold tabular-nums">$30.000</dd></div>
                    <div className="flex justify-between gap-4 border-t border-[#E5E7EB] pt-2"><dt className="font-semibold text-[#111827]">{t("como.recibes3m")}</dt><dd className="font-bold tabular-nums" style={{ color: "var(--bosque)" }}>$30.000</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">{t("como.despues15")}</dt><dd className="font-semibold tabular-nums">$25.500</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#4B5563]">{t("como.despuesPremium")}</dt><dd className="font-semibold tabular-nums">$26.400</dd></div>
                  </dl>
                </div>
              </div>
              <div>
                <h2 className="title-2 text-[#111827]">{t("como.ganas")}</h2>
                <ul className="mt-5 space-y-4">
                  {[
                    { icon: Lock, t: "como.g1t", d: "como.g1d" },
                    { icon: Wallet, t: "como.g2t", d: "como.g2d" },
                    { icon: Star, t: "como.g3t", d: "como.g3d" },
                    { icon: Scale, t: "como.g4t", d: "como.g4d" },
                  ].map(({ icon: Icon, t: tk, d }) => (
                    <li key={tk} className="flex items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white border border-[#E5E7EB]" aria-hidden>
                        <Icon className="size-5 text-[#111827]" />
                      </span>
                      <span>
                        <span className="block font-semibold text-[#111827]">{t(tk)}</span>
                        <span className="block text-sm text-[#4B5563] leading-relaxed">{t(d)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/registro" search={{ tipo: "prestador" }} className="btn-primary mt-8 w-full sm:w-auto">
                  {t("home.uneteBtn")}
                </Link>
              </div>
            </div>
          </section>

          <section className="bg-white">
            <div className="container-landing py-14 md:py-20 grid gap-8 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-14">
              <div>
                <h2 className="title-2 text-[#111827]">{t("como.faq")}</h2>
                <p className="mt-2 text-[#6B7280]">{t("como.faqProSub")}</p>
              </div>
              <Faq items={FAQ_PROFESIONALES_BY_LANG[idioma]} />
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function RangoYPago() {
  const { t } = useT();
  return (
    <section className="bg-[#F3F4F6]">
      <div className="container-landing py-14 md:py-20 grid gap-10 md:grid-cols-2 md:gap-14 md:items-center">
        <div>
          <h2 className="title-2 text-[#111827]">{t("como.rango")}</h2>
          <p className="mt-3 text-[#4B5563] leading-relaxed max-w-[52ch]">
            {t("como.rangoTexto")}
          </p>
          <h2 className="title-2 mt-10 text-[#111827]">{t("como.pagoProtegido")}</h2>
          <ul className="mt-4 space-y-3">
            {[
              { icon: Lock, color: "var(--pacifico)", t: "como.pp1t", d: "como.pp1d" },
              { icon: FileCheck2, color: "var(--bosque)", t: "como.pp2t", d: "como.pp2d" },
              { icon: Scale, color: "var(--pizarra)", t: "como.pp3t", d: "como.pp3d" },
            ].map(({ icon: Icon, color, t: tk, d }) => (
              <li key={tk} className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white border border-[#E5E7EB]" aria-hidden>
                  <Icon className="size-5" style={{ color }} />
                </span>
                <span>
                  <span className="block font-semibold text-[#111827]">{t(tk)}</span>
                  <span className="block text-sm text-[#4B5563] leading-relaxed">{t(d)}</span>
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
