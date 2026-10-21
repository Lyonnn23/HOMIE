import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { categories, groups, categoriesOfGroup, formatCLP } from "@/data/services";
import { HorarioEditor, defaultHorario, validarHorario, type Horario } from "@/components/HorarioEditor";
import { geocodificar } from "@/lib/geocode";

export const Route = createFileRoute("/_authenticated/onboarding-prestador")({
  head: () => ({ meta: [
    { name: "description", content: "Registro de información profesional, servicios y horarios en Homie." },
    { property: "og:title", content: "Completa tu perfil — Homie" },
    { property: "og:description", content: "Registro de información profesional, servicios y horarios en Homie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Completa tu perfil — Homie" }] }),
  component: OnboardingPrestador,
});

const PASOS = ["Tus datos", "Tu profesión", "Tus servicios", "Tu horario"];
const MAX_DESC = 600;

interface ServicioForm {
  nombre: string;
  precio: number;
  precioHasta: number;
  descripcion: string;
  foto: File | null;
  fotoPreview: string | null;
  modalidades: string[];
}

const MODALIDADES: { id: string; label: string }[] = [
  { id: "domicilio", label: "A domicilio" }, { id: "online", label: "Online" }, { id: "local", label: "En mi local" },
];

function sugerirHasta(desde: number) {
  return Math.round((desde * 1.3) / 1000) * 1000;
}
function maxHasta(desde: number) {
  return Math.floor(desde * 1.5);
}

async function subirAPerfiles(userId: string, file: File, slug: string) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("perfiles").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("perfiles").getPublicUrl(path).data.publicUrl;
}

function OnboardingPrestador() {
  const navigate = useNavigate();
  const { user, usuario } = useAuth();
  const [paso, setPaso] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Paso 1
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [comuna, setComuna] = useState("");
  const [direccion, setDireccion] = useState("");

  // Paso 2
  const [categoriaId, setCategoriaId] = useState<string>(categories[0]?.id ?? "home");
  const [titulo, setTitulo] = useState("");
  const [anos, setAnos] = useState<number>(1);
  const [bio, setBio] = useState("");

  // Paso 3
  const [servicios, setServicios] = useState<ServicioForm[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);

  // Paso 4
  const [horario, setHorario] = useState<Horario>(defaultHorario());
  const [disponibleAhora, setDisponibleAhora] = useState(true);

  useEffect(() => {
    if (usuario && usuario.tipo !== "prestador") {
      navigate({ to: "/" });
    }
  }, [usuario, navigate]);

  useEffect(() => {
    if (usuario?.nombre && !nombre) setNombre(usuario.nombre);
    if (usuario?.foto_url && !fotoPreview && !fotoFile) setFotoPreview(usuario.foto_url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const activeCat = categories.find((c) => c.id === categoriaId);

  function toggleServicio(nombreSrv: string) {
    setServicios((prev) => {
      const existe = prev.find((s) => s.nombre === nombreSrv);
      if (existe) return prev.filter((s) => s.nombre !== nombreSrv);
      const nuevo: ServicioForm = {
        nombre: nombreSrv, precio: 15000, precioHasta: sugerirHasta(15000),
        descripcion: "", foto: null, fotoPreview: null, modalidades: ["domicilio"],
      };
      setAbierto(nombreSrv);
      return [...prev, nuevo];
    });
  }

  function updateServicio(nombreSrv: string, patch: Partial<ServicioForm>) {
    setServicios((prev) => prev.map((s) => (s.nombre === nombreSrv ? { ...s, ...patch } : s)));
  }

  function validarPaso(p: number): string | null {
    if (p === 0) {
      if (nombre.trim().length < 3) return "Ingresa tu nombre completo.";
      if (telefono.trim().length < 8) return "Ingresa un teléfono válido (ej. +56 9 1234 5678).";
      if (whatsapp.trim().length < 8) return "Ingresa tu número de WhatsApp.";
      if (!comuna.trim()) return "Indica tu comuna.";
      if (!direccion.trim()) return "Indica tu dirección o sector base.";
    }
    if (p === 1) {
      if (!categoriaId) return "Selecciona una categoría.";
      if (titulo.trim().length < 3) return "Ingresa tu título profesional (ej. Gasfíter certificado SEC).";
      if (!Number.isFinite(anos) || anos < 0 || anos > 60) return "Ingresa tus años de experiencia (0 a 60).";
      if (bio.trim().length < 30) return "Cuéntanos un poco más sobre ti (mínimo 30 caracteres).";
    }
    if (p === 2) {
      if (servicios.length === 0) return "Selecciona al menos un servicio.";
      for (const s of servicios) {
        if (!s.precio || s.precio < 1000) return `Ingresa un precio desde válido para "${s.nombre}" (mínimo $1.000).`;
        if (!s.precioHasta || s.precioHasta < s.precio) return `El precio hasta de "${s.nombre}" no puede ser menor que el precio desde.`;
        if (s.precioHasta > maxHasta(s.precio)) return `El precio hasta de "${s.nombre}" no puede superar el 50% sobre el precio desde.`;
        if (s.modalidades.length === 0) return `Elige al menos una modalidad para "${s.nombre}".`;
        if (s.descripcion.length > MAX_DESC) return `La descripción de "${s.nombre}" supera los ${MAX_DESC} caracteres.`;
      }
    }
    if (p === 3) {
      return validarHorario(horario);
    }
    return null;
  }

  function siguiente() {
    const e = validarPaso(paso);
    if (e) { setErr(e); toast.error(e); return; }
    setErr(null);
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function atras() {
    setErr(null);
    setPaso((p) => Math.max(p - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finalizar() {
    const e = validarPaso(3);
    if (e) { setErr(e); toast.error(e); return; }
    if (!usuario || !user) {
      setErr("Cargando tu perfil, intenta de nuevo en un momento.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      // 1. Foto de perfil
      let fotoUrl: string | null = usuario.foto_url ?? null;
      if (fotoFile) fotoUrl = await subirAPerfiles(user.id, fotoFile, "perfil");

      // 2. Datos del usuario
      const { error: uErr } = await supabase
        .from("usuarios")
        .update({ nombre: nombre.trim(), foto_url: fotoUrl })
        .eq("id", usuario.id);
      if (uErr) throw uErr;

      // 3. Prestador
      const precios = servicios.map((s) => s.precio);
      const precioDesde = Math.min(...precios);
      const precioHasta = Math.max(...servicios.map((s) => s.precioHasta));
      // Geocodificación best-effort: si falla, el perfil se crea sin coordenadas.
      const geo = await geocodificar(direccion.trim(), comuna.trim()).catch(() => null);
      const { data: prestador, error: pErr } = await supabase
        .from("prestadores")
        .insert({
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
          usuario_id: usuario.id,
          nombre: nombre.trim(),
          foto_url: fotoUrl,
          categoria_id: categoriaId,
          bio: bio.trim(),
          direccion: direccion.trim(),
          comuna: comuna.trim(),
          titulo_profesional: titulo.trim(),
          anos_experiencia: anos,
          precio_desde: precioDesde,
          precio_hasta: precioHasta,
          horario,
          disponible_ahora: disponibleAhora,
          disponibilidad_texto: disponibleAhora ? "Disponible ahora" : "No disponible",
          gallery_urls: [],
        })
        .select()
        .single();
      if (pErr || !prestador) throw pErr ?? new Error("No se pudo crear el perfil de prestador");

      // 4. Servicios
      const { data: serviciosDb, error: sErr } = await supabase
        .from("servicios")
        .select("id, nombre")
        .eq("categoria_id", categoriaId)
        .in("nombre", servicios.map((s) => s.nombre));
      if (sErr) throw sErr;

      if (serviciosDb && serviciosDb.length > 0) {
        const filas = [];
        for (const srv of serviciosDb) {
          const form = servicios.find((s) => s.nombre === srv.nombre);
          if (!form) continue;
          let srvFoto: string | null = null;
          if (form.foto) {
            srvFoto = await subirAPerfiles(user.id, form.foto, `servicio-${srv.id}`);
          }
          filas.push({
            prestador_id: prestador.id,
            servicio_id: srv.id,
            precio: form.precio,
            precio_hasta: form.precioHasta,
            descripcion: form.descripcion.trim() || null,
            foto_url: srvFoto,
            modalidades: form.modalidades.length > 0 ? form.modalidades : ["domicilio"],
          });
        }
        const { error: psErr } = await supabase.from("prestador_servicios").insert(filas);
        if (psErr) throw psErr;
      }

      // 5. Contacto
      const { error: cErr } = await supabase.from("prestador_contacto").upsert({
        prestador_id: prestador.id,
        telefono: telefono.trim(),
        whatsapp: whatsapp.trim(),
      });
      if (cErr) throw cErr;

      toast.success("Perfil creado. Ahora verifica tu identidad y sube tus certificados para aparecer públicamente.", { duration: 7000 });
      navigate({ to: "/verificar-identidad" });
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "No se pudo guardar tu perfil";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] pb-32">
      <header className="bg-[#111827] text-white px-5 pt-6 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Completa tu perfil</h1>
        <p className="text-sm text-white/70 mt-1">
          Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
        </p>
        <div className="mt-4 flex gap-1.5">
          {PASOS.map((p, i) => (
            <div key={p} className={`h-1 flex-1 rounded-full ${i <= paso ? "bg-[#EF9F27]" : "bg-white/15"}`} />
          ))}
        </div>
      </header>

      <main className="px-5 pt-6 max-w-lg mx-auto space-y-5">
        {paso === 0 && (
          <>
            <Intro title="Tus datos" sub="Así te verán los clientes. Puedes cambiar todo después desde tu panel." />
            <FotoPerfilPicker preview={fotoPreview} onPick={(f) => { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); }} />
            <Field label="Nombre completo">
              <Input value={nombre} onChange={setNombre} placeholder="Ej. Camila Rojas" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <Input type="tel" value={telefono} onChange={setTelefono} placeholder="+56 9 1234 5678" />
              </Field>
              <Field label="WhatsApp">
                <Input type="tel" value={whatsapp} onChange={setWhatsapp} placeholder="+56 9 1234 5678" />
              </Field>
            </div>
            <Field label="Comuna">
              <Input value={comuna} onChange={setComuna} placeholder="Ej. Providencia" />
            </Field>
            <Field label="Dirección base">
              <Input value={direccion} onChange={setDireccion} placeholder="Calle o sector desde donde sales a trabajar" />
            </Field>
          </>
        )}

        {paso === 1 && (
          <>
            <Intro title="Tu profesión" sub="Cuéntanos qué haces y cuánta experiencia tienes." />
            <Field label="Categoría">
              <select
                value={categoriaId}
                onChange={(e) => { setCategoriaId(e.target.value); setServicios([]); setAbierto(null); }}
                className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
              >
                {groups.map((g) => (
                  <optgroup key={g.id} label={g.name}>
                    {categoriesOfGroup(g.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Título profesional">
              <Input value={titulo} onChange={setTitulo} placeholder='Ej. "Gasfíter certificado SEC"' />
            </Field>
            <Field label="Años de experiencia">
              <input
                type="number" min={0} max={60} step={1} value={anos}
                onChange={(e) => setAnos(Number(e.target.value))}
                className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
              />
            </Field>
            <Field label="Sobre ti (bio)">
              <textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tengo 5 años de experiencia en... Trabajo con materiales de calidad y entrego garantía."
                className="w-full p-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 resize-none"
              />
              <span className="block text-right text-[11px] text-muted-foreground mt-1">{bio.length} caracteres</span>
            </Field>
          </>
        )}

        {paso === 2 && (
          <>
            <Intro title="Tus servicios" sub={`Elige los servicios de ${activeCat?.name ?? "tu categoría"} que ofreces y define el precio de cada uno.`} />
            <div className="flex flex-wrap gap-2">
              {activeCat?.services.map((s) => {
                const on = servicios.some((x) => x.nombre === s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleServicio(s)}
                    className={`px-3.5 py-2 rounded-full text-sm border transition ${
                      on ? "bg-foreground text-background border-foreground" : "bg-white border-border text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            {servicios.length > 0 && (
              <div className="space-y-3">
                {servicios.map((s) => (
                  <ServicioCard
                    key={s.nombre}
                    s={s}
                    open={abierto === s.nombre}
                    onToggle={() => setAbierto(abierto === s.nombre ? null : s.nombre)}
                    onChange={(patch) => updateServicio(s.nombre, patch)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {paso === 3 && (
          <>
            <Intro title="Tu horario" sub="Define los días y horas en que atiendes. Los clientes solo podrán reservar dentro de este horario." />
            <HorarioEditor value={horario} onChange={setHorario} />
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition ${
              disponibleAhora ? "bg-[#00C288]/10 border-[#00C288]/40" : "bg-[#FF3B6B]/10 border-[#FF3B6B]/40"
            }`}>
              <div className="min-w-0">
                <div className="font-semibold text-sm">Disponible ahora</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {disponibleAhora ? "Aparecerás como disponible apenas te verifiquen" : "Puedes activarlo más tarde desde tu panel"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisponibleAhora((v) => !v)}
                aria-pressed={disponibleAhora}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                  disponibleAhora ? "bg-[#00C288]" : "bg-[#FF3B6B]"
                }`}
              >
                <span className={`inline-block size-5 rounded-full bg-white shadow transition ${disponibleAhora ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-[#111827] text-white flex gap-3 items-start">
              <ShieldCheck className="size-5 text-[#EF9F27] shrink-0 mt-0.5" />
              <p className="text-xs text-white/80">
                Al finalizar te pediremos verificar tu identidad y subir al menos un certificado o título.
                Homie solo muestra públicamente a profesionales verificados.
              </p>
            </div>
          </>
        )}

        {err && <p className="text-sm text-[#FF3B6B]">{err}</p>}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E7EB] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto flex gap-3">
          {paso > 0 && (
            <button
              type="button"
              onClick={atras}
              disabled={submitting}
              className="h-12 px-5 rounded-2xl bg-white border border-[#E5E7EB] text-[#111827] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
            >
              <ChevronLeft className="size-4" /> Atrás
            </button>
          )}
          {paso < PASOS.length - 1 ? (
            <button
              type="button"
              onClick={siguiente}
              className="flex-1 h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold inline-flex items-center justify-center gap-1"
            >
              Siguiente <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finalizar}
              disabled={submitting}
              className="flex-1 h-12 rounded-2xl bg-[#111827] text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Guardando...</> : "Finalizar y verificar identidad"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ---------- Sub-componentes ----------

function Intro({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#111827]">{title}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{sub}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-2">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
    />
  );
}

function FotoPerfilPicker({ preview, onPick }: { preview: string | null; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="p-4 rounded-2xl bg-white border border-border flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="relative size-20 rounded-full overflow-hidden bg-[#F5F5F0] border-2 border-dashed border-[#E5E7EB] flex items-center justify-center shrink-0"
      >
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <Camera className="size-6 text-[#EF9F27]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">Foto de perfil</div>
        <p className="text-xs text-muted-foreground mt-0.5">Una foto clara de tu rostro genera más confianza.</p>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111827] text-white text-xs font-semibold"
        >
          <ImagePlus className="size-3.5" /> {preview ? "Cambiar foto" : "Subir foto"}
        </button>
      </div>
      <input
        ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
      />
    </div>
  );
}

function ServicioCard({
  s, open, onToggle, onChange,
}: { s: ServicioForm; open: boolean; onToggle: () => void; onChange: (p: Partial<ServicioForm>) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const max = maxHasta(s.precio);
  const hastaInvalido = s.precioHasta < s.precio || s.precioHasta > max;

  function setDesde(v: number) {
    const desde = Number.isFinite(v) ? v : 0;
    onChange({ precio: desde, precioHasta: sugerirHasta(desde) });
  }
  function setHasta(v: number) {
    onChange({ precioHasta: Number.isFinite(v) ? v : 0 });
  }
  function clampHasta() {
    const m = maxHasta(s.precio);
    if (s.precioHasta > m) onChange({ precioHasta: m });
    else if (s.precioHasta < s.precio) onChange({ precioHasta: s.precio });
  }

  return (
    <div className="rounded-2xl bg-white border border-border overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{s.nombre}</div>
          <div className="text-xs text-muted-foreground">
            {s.precio >= 1000 ? `${formatCLP(s.precio)} – ${formatCLP(s.precioHasta)}` : "Define el precio"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!hastaInvalido && s.precio >= 1000 && <Check className="size-4 text-[#00C288]" />}
          <ChevronDown className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1">Precio desde (CLP)</span>
              <input
                type="number" min={1000} step={1000} value={s.precio || ""}
                onChange={(e) => setDesde(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium mb-1">Precio hasta (CLP)</span>
              <input
                type="number" min={s.precio} max={max} step={1000} value={s.precioHasta || ""}
                onChange={(e) => setHasta(Number(e.target.value))}
                onBlur={clampHasta}
                className={`w-full h-11 px-3 rounded-xl bg-muted/50 border outline-none text-sm ${
                  hastaInvalido ? "border-[#FF3B6B]" : "border-border focus:border-foreground/30"
                }`}
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            Máximo 50% sobre el precio desde. El cliente paga el precio desde al reservar; el valor final nunca puede superar el precio hasta.
            {s.precio >= 1000 && <> Máximo permitido: <strong>{formatCLP(max)}</strong>.</>}
          </p>

          <label className="block">
            <span className="block text-xs font-medium mb-1">Descripción corta</span>
            <textarea
              rows={3} maxLength={MAX_DESC} value={s.descripcion}
              onChange={(e) => onChange({ descripcion: e.target.value })}
              placeholder="Qué incluye, materiales, tiempo estimado..."
              className="w-full p-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 resize-none text-sm"
            />
            <span className="block text-right text-[11px] text-muted-foreground mt-1">{s.descripcion.length}/{MAX_DESC}</span>
          </label>

          <div>
            <span className="block text-xs font-medium mb-2">Modalidad</span>
            <div className="flex flex-wrap gap-2">
              {MODALIDADES.map((m) => {
                const on = s.modalidades.includes(m.id);
                return (
                  <label key={m.id} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition ${
                    on ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-border"
                  }`}>
                    <input
                      type="checkbox" className="sr-only" checked={on}
                      onChange={() => onChange({ modalidades: on ? s.modalidades.filter((x) => x !== m.id) : [...s.modalidades, m.id] })}
                    />
                    {on && <Check className="size-3.5" />}
                    {m.label}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Si eliges Online, el cliente no necesita indicar dirección.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="size-16 rounded-xl overflow-hidden bg-[#F5F5F0] border-2 border-dashed border-[#E5E7EB] flex items-center justify-center shrink-0"
            >
              {s.fotoPreview ? <img src={s.fotoPreview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-[#EF9F27]" />}
            </button>
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-[#111827]">Foto del servicio (opcional)</div>
              Muestra un trabajo tuyo relacionado con este servicio.
            </div>
            <input
              ref={ref} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onChange({ foto: f, fotoPreview: URL.createObjectURL(f) });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
