import { useEffect, useRef, useState } from "react";
import { Home, Users, CalendarCheck, ShieldCheck, Briefcase } from "lucide-react";
import { HomieIcon, HomieWordmark } from "./Logo";

type Phase = "splash" | "slides" | "account" | "done";

const SPLASH_KEY = "homie_splash_shown";
const ONB_KEY = "homie_onboarding_done";

const SLIDES = [
  {
    Icon: Home,
    title: ["Tu hogar,", "en buenas manos"],
    subtitle: "Encuentra profesionales de confianza para cualquier servicio a domicilio",
  },
  {
    Icon: Users,
    title: ["Elige a quien", "más te conviene"],
    subtitle: "Perfil, calificación, precio y disponibilidad antes de contratar",
  },
  {
    Icon: CalendarCheck,
    title: ["Reserva", "en segundos"],
    subtitle: "Elige el día, la hora y tu dirección. El profesional llega a donde estás",
  },
  {
    Icon: ShieldCheck,
    title: ["Pago seguro,", "sin sorpresas"],
    subtitle: "Paga dentro de la app y califica al profesional al terminar",
  },
];

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [splashOut, setSplashOut] = useState(false);
  const [slide, setSlide] = useState(0);
  const [tipo, setTipo] = useState<"cliente" | "prestador" | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Decide initial phase on mount (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(ONB_KEY) === "true";
    if (done) {
      setPhase("done");
      return;
    }
    const splashShown = localStorage.getItem(SPLASH_KEY) === "true";
    setPhase(splashShown ? "slides" : "splash");
  }, []);

  // Splash auto fade-out
  useEffect(() => {
    if (phase !== "splash") return;
    const t1 = setTimeout(() => setSplashOut(true), 1200);
    const t2 = setTimeout(() => {
      try {
        localStorage.setItem(SPLASH_KEY, "true");
      } catch {}
      setPhase("slides");
    }, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  if (phase === null || phase === "done") return <>{children}</>;

  // SPLASH
  if (phase === "splash") {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300"
        style={{ background: "#111827", opacity: splashOut ? 0 : 1 }}
      >
        <div className="flex flex-col items-center gap-4">
          <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10.5V20h14v-9.5" />
            <path d="M10 20v-5h4v5" />
          </svg>
          <div className="text-[28px] font-bold tracking-tight">
            <span style={{ color: "#FFFFFF" }}>Hom</span>
            <span style={{ color: "#EF9F27" }}>ie</span>
          </div>
          <p className="text-sm" style={{ color: "#6B7280" }}>Tu hogar, en buenas manos</p>
        </div>
      </div>
    );
  }

  // ACCOUNT TYPE
  if (phase === "account") {
    const finish = () => {
      if (!tipo) return;
      try {
        localStorage.setItem(ONB_KEY, "true");
      } catch {}
      setPhase("done");
      window.location.href = `/registro?tipo=${tipo}`;
    };

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col px-6 py-10" style={{ background: "#1A1A2E" }}>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-md mx-auto w-full">
          <div className="flex items-center gap-2">
            <HomieIcon size={36} />
            <HomieWordmark inverted className="text-xl" />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-bold text-white">¿Cómo usarás Homie?</h1>
            <p className="mt-2 text-sm" style={{ color: "#9CA3AF" }}>Elige el tipo de cuenta para empezar</p>
          </div>

          <div className="w-full space-y-3">
            <TypeCard
              active={tipo === "cliente"}
              onClick={() => setTipo("cliente")}
              icon={<Home size={28} color="#EF9F27" />}
              title="Busco servicios"
              subtitle="Quiero contratar"
            />
            <TypeCard
              active={tipo === "prestador"}
              onClick={() => setTipo("prestador")}
              icon={<Briefcase size={28} color="#EF9F27" />}
              title="Ofrezco servicios"
              subtitle="Quiero ofrecer mi trabajo"
            />
          </div>
        </div>

        <button
          disabled={!tipo}
          onClick={finish}
          className="w-full font-bold transition-opacity disabled:opacity-40"
          style={{
            background: "#EF9F27",
            color: "#111827",
            height: 56,
            borderRadius: 14,
          }}
        >
          Comenzar
        </button>
      </div>
    );
  }

  // SLIDES
  const isLast = slide === SLIDES.length - 1;
  const next = () => {
    if (isLast) {
      setPhase("account");
    } else {
      setSlide((s) => s + 1);
    }
  };
  const skip = () => setPhase("account");

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && slide < SLIDES.length - 1) setSlide((s) => s + 1);
    else if (dx > 0 && slide > 0) setSlide((s) => s - 1);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
      {/* Skip */}
      <div className="flex justify-end px-6 pt-5">
        <button onClick={skip} className="text-sm" style={{ color: "#6B7280" }}>
          Saltar
        </button>
      </div>

      {/* Slides viewport */}
      <div
        className="flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            width: `${SLIDES.length * 100}%`,
            transform: `translateX(-${(slide * 100) / SLIDES.length}%)`,
            transition: "transform 280ms ease-in-out",
          }}
        >
          {SLIDES.map((s, i) => (
            <div key={i} className="h-full flex flex-col items-center justify-center px-8" style={{ width: `${100 / SLIDES.length}%` }}>
              <div
                className="flex items-center justify-center mb-10"
                style={{ width: 160, height: 160, background: "#F5F5F0", borderRadius: 24 }}
              >
                <s.Icon size={72} color="#EF9F27" strokeWidth={1.8} />
              </div>
              <h2 className="text-[22px] font-bold text-center whitespace-pre-line" style={{ color: "#111827" }}>
                {s.title.join("\n")}
              </h2>
              <p className="mt-3 text-[15px] text-center px-2" style={{ color: "#6B7280" }}>
                {s.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 pb-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            aria-label={`Ir al slide ${i + 1}`}
            className="transition-all"
            style={{
              width: i === slide ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: i === slide ? "#EF9F27" : "#E5E7EB",
            }}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-8">
        <button
          onClick={next}
          className="w-full font-bold transition-colors"
          style={{
            background: isLast ? "#EF9F27" : "#111827",
            color: isLast ? "#111827" : "#FFFFFF",
            height: 56,
            borderRadius: 14,
          }}
        >
          {isLast ? "Empezar →" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 text-left transition-all"
      style={{
        background: active ? "#1F1F35" : "#111827",
        border: `2px solid ${active ? "#EF9F27" : "#2A2A3E"}`,
        borderRadius: 14,
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 48, height: 48, background: "#1A1A2E", borderRadius: 12 }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-white font-bold">{title}</div>
        <div className="text-sm" style={{ color: "#9CA3AF" }}>{subtitle}</div>
      </div>
    </button>
  );
}
