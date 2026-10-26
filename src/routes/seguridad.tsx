import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ChevronLeft, IdCard, Camera, FileCheck, UserCheck, AlertTriangle, Phone, MessageCircle } from "lucide-react";
import { useTemaGuardado } from "@/hooks/use-tema";
import { useT } from "@/i18n";

export const Route = createFileRoute("/seguridad")({
  head: () => ({
    meta: [
    { property: "og:title", content: "Seguridad y confianza — Homie" },
    { property: "og:description", content: "Cómo Homie verifica a sus prestadores, política de antecedentes y qué hacer si algo sale mal." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    
      { title: "Seguridad y confianza — Homie" },
      { name: "description", content: "Cómo Homie verifica a sus prestadores, política de antecedentes y qué hacer si algo sale mal." },
    ],
  }),
  component: Seguridad,
});

const PASOS = [
  { icon: IdCard, title: "seguridad.p1", desc: "seguridad.p1d" },
  { icon: Camera, title: "seguridad.p2", desc: "seguridad.p2d" },
  { icon: FileCheck, title: "seguridad.p3", desc: "seguridad.p3d" },
  { icon: UserCheck, title: "seguridad.p4", desc: "seguridad.p4d" },
];

function Seguridad() {
  useTemaGuardado();
  const { t } = useT();
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#111827] text-white px-5 pt-6 pb-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
          <ChevronLeft className="size-4" /> {t("seguridad.volver")}
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex size-12 rounded-2xl bg-[#EF9F27]/15 items-center justify-center">
            <ShieldCheck className="size-6 text-[#EF9F27]" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t("seguridad.titulo")}</h1>
            <p className="text-sm text-white/70 mt-0.5">{t("seguridad.sub")}</p>
          </div>
        </div>
      </header>

      <main className="px-5 py-8 max-w-2xl mx-auto space-y-10">
        <section>
          <h2 className="text-lg font-bold text-[#111827]">{t("seguridad.comoVerificamos")}</h2>
          <p className="mt-1 text-sm text-[#6B7280]">{t("seguridad.comoVerificamosSub")}</p>
          <ol className="mt-5 space-y-3">
            {PASOS.map((p, i) => (
              <li key={p.title} className="flex gap-4 p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="inline-flex size-10 rounded-full bg-[#EF9F27]/15 items-center justify-center shrink-0">
                  <p.icon className="size-5 text-[#EF9F27]" />
                </span>
                <div>
                  <div className="text-xs font-bold text-[#EF9F27] uppercase tracking-wide">{t("seguridad.paso", { n: i + 1 })}</div>
                  <div className="font-semibold text-[#111827]">{t(p.title)}</div>
                  <div className="text-sm text-[#6B7280] mt-0.5">{t(p.desc)}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#111827]">{t("seguridad.politica")}</h2>
          <p className="mt-2 text-sm text-[#111827] leading-relaxed">
            {t("seguridad.politicaTexto")}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#111827]">
            {[
              t("seguridad.d1"), t("seguridad.d2"), t("seguridad.d3"), t("seguridad.d4"), t("seguridad.d5"),
            ].map((txt) => (
              <li key={txt} className="flex gap-2"><span className="text-[#EF9F27]">•</span>{txt}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#6B7280]">
            {t("seguridad.renovamos")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#111827]">{t("seguridad.siAlgoSaleMal")}</h2>
          <ol className="mt-4 space-y-3">
            {[
              { icon: AlertTriangle, t: t("seguridad.s1"), d: t("seguridad.s1d") },
              { icon: MessageCircle, t: t("seguridad.s2"), d: t("seguridad.s2d") },
              { icon: ShieldCheck, t: t("seguridad.s3"), d: t("seguridad.s3d") },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4 p-4 rounded-2xl bg-[#F5F5F0]">
                <span className="inline-flex size-10 rounded-full bg-white items-center justify-center shrink-0">
                  <s.icon className="size-5 text-[#EF9F27]" />
                </span>
                <div>
                  <div className="text-xs font-bold text-[#EF9F27]">{String(i + 1).padStart(2, "0")}</div>
                  <div className="font-semibold text-[#111827]">{s.t}</div>
                  <div className="text-sm text-[#6B7280] mt-0.5">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl bg-[#111827] text-white p-6">
          <div className="flex items-center gap-2 text-[#EF9F27] text-xs font-bold uppercase tracking-wide">
            <Phone className="size-4" /> {t("seguridad.contactoEmergencia")}
          </div>
          <h3 className="mt-2 text-xl font-bold">{t("seguridad.soporte247")}</h3>
          <p className="mt-1 text-sm text-white/70">{t("seguridad.peligro")}</p>
          <a
            href="tel:+560221234567"
            className="mt-4 w-full h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold inline-flex items-center justify-center gap-2"
          >
            <Phone className="size-4" /> {t("seguridad.llamar")}
          </a>
        </section>
      </main>
    </div>
  );
}
