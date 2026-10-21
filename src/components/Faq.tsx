/** Acordeón de preguntas frecuentes (details/summary nativo, accesible). */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
      {items.map((it) => (
        <details key={it.q} className="group py-1">
          <summary className="flex items-center justify-between gap-4 cursor-pointer list-none py-4 text-[15px] md:text-base font-semibold text-[#111827] rounded-md [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="shrink-0 size-7 rounded-full bg-[#F3F4F6] flex items-center justify-center transition-transform group-open:rotate-45" aria-hidden>
              <span className="relative block size-3">
                <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#111827]" />
                <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[#111827]" />
              </span>
            </span>
          </summary>
          <p className="pb-5 text-sm md:text-[15px] text-[#4B5563] leading-relaxed max-w-[70ch]">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
