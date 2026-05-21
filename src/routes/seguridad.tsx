import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ChevronLeft, IdCard, Camera, FileCheck, UserCheck, AlertTriangle, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/seguridad")({
  head: () => ({
    meta: [
      { title: "Seguridad y confianza — Homie" },
      { name: "description", content: "Cómo Homie verifica a sus prestadores, política de antecedentes y qué hacer si algo sale mal." },
    ],
  }),
  component: Seguridad,
});

const PASOS = [
  { icon: IdCard, title: "Verificación de identidad", desc: "Validamos carnet de identidad y datos personales contra registros oficiales." },
  { icon: Camera, title: "Selfie con carnet", desc: "Confirmamos que la persona detrás del perfil es quien dice ser." },
  { icon: FileCheck, title: "Revisión de antecedentes", desc: "Revisamos antecedentes penales antes de aprobar la cuenta." },
  { icon: UserCheck, title: "Certificados del rubro", desc: "Cuando aplica, validamos cursos, licencias o certificaciones del oficio." },
];

function Seguridad() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#111827] text-white px-5 pt-6 pb-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex size-12 rounded-2xl bg-[#EF9F27]/15 items-center justify-center">
            <ShieldCheck className="size-6 text-[#EF9F27]" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Seguridad y confianza</h1>
            <p className="text-sm text-white/70 mt-0.5">Cómo cuidamos cada reserva en Homie</p>
          </div>
        </div>
      </header>

      <main className="px-5 py-8 max-w-2xl mx-auto space-y-10">
        <section>
          <h2 className="text-lg font-bold text-[#111827]">Cómo verificamos a nuestros profesionales</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Cada prestador pasa por estos 4 pasos antes de aparecer en la app.</p>
          <ol className="mt-5 space-y-3">
            {PASOS.map((p, i) => (
              <li key={p.title} className="flex gap-4 p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="inline-flex size-10 rounded-full bg-[#EF9F27]/15 items-center justify-center shrink-0">
                  <p.icon className="size-5 text-[#EF9F27]" />
                </span>
                <div>
                  <div className="text-xs font-bold text-[#EF9F27] uppercase tracking-wide">Paso {i + 1}</div>
                  <div className="font-semibold text-[#111827]">{p.title}</div>
                  <div className="text-sm text-[#6B7280] mt-0.5">{p.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#111827]">Política de antecedentes</h2>
          <p className="mt-2 text-sm text-[#111827] leading-relaxed">
            En Homie revisamos los antecedentes penales de cada prestador antes de aprobar su cuenta.
            No permitimos el registro de personas con condenas vigentes por:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#111827]">
            {[
              "Delitos contra las personas (lesiones graves, homicidio, violencia intrafamiliar)",
              "Delitos sexuales de cualquier naturaleza",
              "Robos con violencia o intimidación",
              "Delitos contra menores de edad",
              "Estafas o delitos económicos contra clientes anteriores",
            ].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-[#EF9F27]">•</span>{t}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#6B7280]">
            Renovamos esta verificación cada 12 meses para mantener la confianza de la comunidad.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#111827]">¿Qué pasa si algo sale mal?</h2>
          <ol className="mt-4 space-y-3">
            {[
              { icon: AlertTriangle, t: "Reporta el problema", d: "En tu reserva activa, pulsa 'Reportar problema' y elige el motivo." },
              { icon: MessageCircle, t: "Te contactamos", d: "Nuestro equipo revisa cada caso en menos de 24 horas." },
              { icon: ShieldCheck, t: "Tomamos acción", d: "Sancionamos al prestador, gestionamos reembolso o coordinamos solución según el caso." },
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
            <Phone className="size-4" /> Contacto de emergencia
          </div>
          <h3 className="mt-2 text-xl font-bold">Soporte Homie 24/7</h3>
          <p className="mt-1 text-sm text-white/70">Si estás en peligro inmediato, llama primero a Carabineros al 133.</p>
          <a
            href="tel:+560221234567"
            className="mt-4 w-full h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-bold inline-flex items-center justify-center gap-2"
          >
            <Phone className="size-4" /> Llamar a Homie (+56 2 2123 4567)
          </a>
        </section>
      </main>
    </div>
  );
}
