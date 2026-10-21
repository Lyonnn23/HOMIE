import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "./AppShell";

interface Props {
  title: string;
  intro: string;
  updated: string;
  children: ReactNode;
}

/** Layout de lectura para páginas legales: ancho máximo 72ch, aviso preliminar visible. */
export function LegalPage({ title, intro, updated, children }: Props) {
  return (
    <AppShell wide>
      <section className="bg-[#F3F4F6]">
        <div className="container-landing py-10 md:py-14">
          <p className="text-sm font-medium text-[#6B7280]">
            <Link to="/terminos" className="hover:text-[#111827]">Términos</Link>
            <span aria-hidden> · </span>
            <Link to="/privacidad" className="hover:text-[#111827]">Privacidad</Link>
          </p>
          <h1 className="title-1 mt-3 text-[#111827] max-w-[24ch]">{title}</h1>
          <p className="mt-3 text-[#4B5563] leading-relaxed max-w-[60ch]">{intro}</p>
          <p className="mt-3 text-sm text-[#6B7280]">Última actualización: {updated}</p>
          <div
            role="note"
            className="mt-6 inline-flex items-start gap-3 rounded-[10px] border border-[#EF9F27] bg-[#FFF7E8] px-4 py-3 text-sm text-[#111827] max-w-[60ch]"
          >
            <AlertTriangle className="size-5 shrink-0 text-[#B45309]" aria-hidden />
            <span><strong>Versión preliminar:</strong> revisar con un abogado antes de publicar.</span>
          </div>
        </div>
      </section>
      <article className="bg-white">
        <div className="container-landing py-10 md:py-16">
          <div className="prose-legal">{children}</div>
        </div>
      </article>
    </AppShell>
  );
}
