import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, LifeBuoy, Mail, Scale } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useT } from "@/i18n";

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

/** Claves i18n ayuda.qN / ayuda.aN */
const FAQS = [
  { q: "ayuda.q1", a: "ayuda.a1" },
  { q: "ayuda.q2", a: "ayuda.a2" },
  { q: "ayuda.q3", a: "ayuda.a3" },
  { q: "ayuda.q4", a: "ayuda.a4" },
];

function AyudaPage() {
  const { t } = useT();
  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4">
        <h1 className="title-1">{t("ayuda.titulo")}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">{t("ayuda.sub")}</p>
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
            <span className="block font-bold">{t("ayuda.hablarSoporte")}</span>
            <span className="block text-sm text-white/70 mt-0.5">{t("ayuda.hablarSoporteSub")}</span>
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
            <span className="block font-bold text-[#111827]">{t("ayuda.reclamos")}</span>
            <span className="block text-sm text-[#6B7280] mt-0.5">
              {t("ayuda.reclamosSub")}
            </span>
          </span>
          <ChevronDown className="size-5 text-[#9CA3AF] -rotate-90 shrink-0" />
        </Link>
      </section>

      <section className="px-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {t("ayuda.faq")}
        </h2>
        <div className="rounded-2xl bg-white border border-[#E5E7EB] divide-y divide-[#E5E7EB] overflow-hidden">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none text-sm font-medium">
                <span className="flex-1">{t(f.q)}</span>
                <ChevronDown className="size-4 text-[#9CA3AF] transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm text-[#6B7280]">{t(f.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6 pb-10">
        <div className="p-5 rounded-2xl bg-[#111827] text-white">
          <h2 className="font-semibold">{t("ayuda.masAyuda")}</h2>
          <p className="mt-1 text-sm text-white/70">{t("ayuda.masAyudaSub")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/soporte" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold text-sm">
              <LifeBuoy className="size-4" /> {t("ayuda.hablarSoporte")}
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
