import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, ImagePlus, Loader2,
  Pencil, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  categories, groups, categoriesOfGroup, formatCLP, MODALIDAD_LABEL,
  UNIDAD_LABEL, UNIDADES, DURACION_OPCIONES, GARANTIA_OPCIONES, IDIOMAS_OPCIONES, FORMAS_PAGO_EXTRA,
  duracionLabel, garantiaLabel, type UnidadCobro,
} from "@/data/services";
import { COMUNAS_SUGERIDAS } from "@/data/comunas";
import { HorarioEditor, defaultHorario, validarHorario, type Horario } from "@/components/HorarioEditor";
import { geocodificar } from "@/lib/geocode";
import { comprimirImagen } from "@/lib/imagen";

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

const PASOS = ["Tus datos", "Tu profesión", "Tus servicios", "Tu horario", "Revisa y publica"];
const MAX_DESC = 600;
const MAX_INCLUYE = 600;
const MAX_NO_INCLUYE = 400;
const MAX_ESPECIALIDADES = 8;
const DRAFT_KEY = "homie-onboarding-prestador-draft";

interface ServicioForm {
  nombre: string;
  precio: number;
  precioHasta: number;
  descripcion: string;
  foto: File | null;
  fotoPreview: string | null;
  modalidades: string[];
  unidad: UnidadCobro;
  duracionMin: number | null;
  materialesIncluidos: boolean;
  incluye: string;
  noIncluye: string;
  garantiaDias: number;
}

const MODALIDADES: { id: string; label: string }[] = [
  { id: "domicilio", label: "A domicilio" }, { id: "online", label: "Online" }, { id: "local", label: "En mi local" },
];

const RESPUESTA_OPCIONES: { value: number; label: string }[] = [
  { value: 15, label: "15 min" }, { value: 60, label: "1 h" }, { value: 240, label: "4 h" }, { value: 1440, label: "24 h" },
];
function textoRespuesta(min: number) {
  return `Responde en ~${RESPUESTA_OPCIONES.find((o) => o.value === min)?.label ?? "1 h"}`;
}

function sugerirHasta(desde: number) {
  return Math.round((desde * 1.3) / 1000) * 1000;
}
function maxHasta(desde: number) {
  return Math.floor(desde * 1.5);
}

function ejemploIncluye(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes("gasf") || n.includes("plomer")) return 'Ej. "Revisión de la falla, reparación de la fuga, cambio de sello o flexible, prueba final y limpieza del área."';
  if (n.includes("electric")) return 'Ej. "Diagnóstico del circuito, reemplazo del enchufe o interruptor, prueba de funcionamiento y certificación de seguridad."';
  if (n.includes("aseo") || n.includes("limpieza")) return 'Ej. "Aspirado y trapeado de pisos, limpieza de baños y cocina, sacudido de superficies, retiro de basura."';
  if (n.includes("clase") || n.includes("profesor") || n.includes("preparaci")) return 'Ej. "Sesión de 60 min, material de estudio en PDF, guía de ejercicios y resumen de avance por WhatsApp."';
  if (n.includes("abogad") || n.includes("asesor")) return 'Ej. "Reunión inicial de 45 min, análisis del caso, orientación sobre pasos a seguir y resumen escrito."';
  if (n.includes("fot") || n.includes("vide")) return 'Ej. "2 horas de sesión, 30 fotos editadas en alta resolución entregadas en 7 días por link de descarga."';
  if (n.includes("masaj") || n.includes("terap")) return 'Ej. "Sesión de 60 min, camilla y aceites, evaluación inicial y recomendaciones post sesión."';
  return `Ej. "Diagnóstico inicial, mano de obra de ${n}, prueba final y limpieza del área de trabajo."`;
}

async function subirAPerfiles(userId: string, original: File, slug: string) {
  const file = await comprimirImagen(original);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("perfiles").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("perfiles").getPublicUrl(path).data.publicUrl;
}

function nuevoServicio(nombreSrv: string): ServicioForm {
  return {
    nombre: nombreSrv, precio: 15000, precioHasta: sugerirHasta(15000),
    descripcion: "", foto: null, fotoPreview: null, modalidades: ["domicilio"],
    unidad: "trabajo", duracionMin: 60, materialesIncluidos: false, incluye: "", noIncluye: "", garantiaDias: 0,
  };
}

/** Qué le falta a una ficha para estar completa (vacío = completa). */
function faltantesServicio(s: ServicioForm): string[] {
  const out: string[] = [];
  if (!s.precio || s.precio < 1000) out.push("precio desde");
  else if (!s.precioHasta || s.precioHasta < s.precio || s.precioHasta > maxHasta(s.precio)) out.push("precio hasta");
  if (s.modalidades.length === 0) out.push("modalidad");
  if (s.incluye.trim().length < 10) out.push("qué incluye");
  if (s.incluye.length > MAX_INCLUYE) out.push("qué incluye (muy largo)");
  if (s.noIncluye.length > MAX_NO_INCLUYE) out.push("qué no incluye (muy largo)");
  if (s.descripcion.length > MAX_DESC) out.push("descripción (muy larga)");
  return out;
}

// ---------- Borrador en localStorage ----------
interface Draft {
  paso: number;
  nombre: string; telefono: string; whatsapp: string; comuna: string; direccion: string;
  comunasCobertura: string[]; radioKm: number;
  categoriaId: string; titulo: string; anos: number; bio: string;
  especialidades: string[]; idiomas: string[];
  tieneVehiculo: boolean; herramientasPropias: boolean; emiteBoleta: boolean; formasPagoExtra: string[];
  servicios: Omit<ServicioForm, "foto" | "fotoPreview">[];
  horario: Horario; disponibleAhora: boolean; respuestaMin: number;
}
function leerDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (!d || typeof d !== "object" || typeof d.paso !== "number") return null;
    return d as Draft;
  } catch { return null; }
}
function guardarDraft(d: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* sin storage */ }
}
function borrarDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* sin storage */ }
}

function OnboardingPrestador() {
  const navigate = useNavigate();
  const { user, usuario } = useAuth();
  const [paso, setPaso] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftPendiente, setDraftPendiente] = useState<Draft | null>(null);
  const [draftListo, setDraftListo] = useState(false);

  // Paso 1
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [comuna, setComuna] = useState("");
  const [direccion, setDireccion] = useState("");
  const [comunasCobertura, setComunasCobertura] = useState<string[]>([]);
  const [radioKm, setRadioKm] = useState(15);

  // Paso 2
  const [categoriaId, setCategoriaId] = useState<string>(categories[0]?.id ?? "home");
  const [titulo, setTitulo] = useState("");
  const [anos, setAnos] = useState<number>(1);
  const [bio, setBio] = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [idiomas, setIdiomas] = useState<string[]>(["Español"]);
  const [tieneVehiculo, setTieneVehiculo] = useState(false);
  const [herramientasPropias, setHerramientasPropias] = useState(true);
  const [emiteBoleta, setEmiteBoleta] = useState(false);
  const [formasPagoExtra, setFormasPagoExtra] = useState<string[]>([]);

  // Paso 3
  const [servicios, setServicios] = useState<ServicioForm[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);

  // Paso 4
  const [horario, setHorario] = useState<Horario>(defaultHorario());
  const [disponibleAhora, setDisponibleAhora] = useState(true);
  const [respuestaMin, setRespuestaMin] = useState(60);

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

  // Borrador: al montar, ofrecer continuar si existe.
  useEffect(() => {
    const d = leerDraft();
    if (d) setDraftPendiente(d);
    else setDraftListo(true);
  }, []);

  function aplicarDraft(d: Draft) {
    setPaso(Math.min(Math.max(d.paso ?? 0, 0), PASOS.length - 1));
    setNombre(d.nombre ?? ""); setTelefono(d.telefono ?? ""); setWhatsapp(d.whatsapp ?? "");
    setComuna(d.comuna ?? ""); setDireccion(d.direccion ?? "");
    setComunasCobertura(d.comunasCobertura ?? []); setRadioKm(d.radioKm ?? 15);
    setCategoriaId(d.categoriaId ?? categories[0]?.id ?? "home");
    setTitulo(d.titulo ?? ""); setAnos(d.anos ?? 1); setBio(d.bio ?? "");
    setEspecialidades(d.especialidades ?? []); setIdiomas(d.idiomas?.length ? d.idiomas : ["Español"]);
    setTieneVehiculo(!!d.tieneVehiculo); setHerramientasPropias(d.herramientasPropias !== false); setEmiteBoleta(!!d.emiteBoleta);
    setFormasPagoExtra(d.formasPagoExtra ?? []);
    setServicios((d.servicios ?? []).map((s) => ({ ...nuevoServicio(s.nombre), ...s, foto: null, fotoPreview: null })));
    setAbierto(d.servicios?.[0]?.nombre ?? null);
    setHorario(d.horario ?? defaultHorario()); setDisponibleAhora(d.disponibleAhora !== false);
    setRespuestaMin(d.respuestaMin ?? 60);
    setDraftPendiente(null); setDraftListo(true);
    toast.success("Continuamos donde quedaste.");
  }
  function descartarDraft() {
    borrarDraft(); setDraftPendiente(null); setDraftListo(true);
  }

  // Autoguardar borrador (sin fotos) cuando cambia algo.
  useEffect(() => {
    if (!draftListo || submitting) return;
    guardarDraft({
      paso, nombre, telefono, whatsapp, comuna, direccion, comunasCobertura, radioKm,
      categoriaId, titulo, anos, bio, especialidades, idiomas, tieneVehiculo, herramientasPropias, emiteBoleta, formasPagoExtra,
      servicios: servicios.map(({ foto: _f, fotoPreview: _p, ...rest }) => rest),
      horario, disponibleAhora, respuestaMin,
    });
  }, [draftListo, submitting, paso, nombre, telefono, whatsapp, comuna, direccion, comunasCobertura, radioKm,
    categoriaId, titulo, anos, bio, especialidades, idiomas, tieneVehiculo, herramientasPropias, emiteBoleta, formasPagoExtra,
    servicios, horario, disponibleAhora, respuestaMin]);

  const activeCat = categories.find((c) => c.id === categoriaId);

  function toggleServicio(nombreSrv: string) {
    setServicios((prev) => {
      const existe = prev.find((s) => s.nombre === nombreSrv);
      if (existe) return prev.filter((s) => s.nombre !== nombreSrv);
      setAbierto(nombreSrv);
      return [...prev, nuevoServicio(nombreSrv)];
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
      if (radioKm < 1 || radioKm > 200) return "El radio de cobertura debe estar entre 1 y 200 km.";
    }
    if (p === 1) {
      if (!categoriaId) return "Selecciona una categoría.";
      if (titulo.trim().length < 3) return "Ingresa tu título profesional (ej. Gasfíter certificado SEC).";
      if (!Number.isFinite(anos) || anos < 0 || anos > 60) return "Ingresa tus años de experiencia (0 a 60).";
      if (bio.trim().length < 30) return "Cuéntanos un poco más sobre ti (mínimo 30 caracteres).";
      if (especialidades.length > MAX_ESPECIALIDADES) return `Máximo ${MAX_ESPECIALIDADES} especialidades.`;
      if (idiomas.length === 0) return "Selecciona al menos un idioma.";
    }
    if (p === 2) {
      if (servicios.length === 0) return "Selecciona al menos un servicio.";
      for (const s of servicios) {
        if (!s.precio || s.precio < 1000) return `Ingresa un precio desde válido para "${s.nombre}" (mínimo $1.000).`;
        if (!s.precioHasta || s.precioHasta < s.precio) return `El precio hasta de "${s.nombre}" no puede ser menor que el precio desde.`;
        if (s.precioHasta > maxHasta(s.precio)) return `El precio hasta de "${s.nombre}" no puede superar el 50% sobre el precio desde.`;
        if (s.modalidades.length === 0) return `Elige al menos una modalidad para "${s.nombre}".`;
        if (s.incluye.trim().length < 10) return `Cuéntale al cliente qué incluye "${s.nombre}" (mínimo 10 caracteres).`;
        if (s.incluye.length > MAX_INCLUYE) return `"Qué incluye" de "${s.nombre}" supera los ${MAX_INCLUYE} caracteres.`;
        if (s.noIncluye.length > MAX_NO_INCLUYE) return `"Qué no incluye" de "${s.nombre}" supera los ${MAX_NO_INCLUYE} caracteres.`;
        if (s.descripcion.length > MAX_DESC) return `La descripción de "${s.nombre}" supera los ${MAX_DESC} caracteres.`;
      }
    }
    if (p === 3) {
      return validarHorario(horario);
    }
    return null;
  }

  function irA(p: number) {
    setErr(null);
    setPaso(Math.min(Math.max(p, 0), PASOS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function siguiente() {
    const e = validarPaso(paso);
    if (e) { setErr(e); toast.error(e); return; }
    irA(paso + 1);
  }
  function atras() { irA(paso - 1); }

  async function finalizar() {
    for (let p = 0; p <= 3; p++) {
      const e = validarPaso(p);
      if (e) { setErr(e); toast.error(e); irA(p); return; }
    }
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
          disponibilidad_texto: textoRespuesta(respuestaMin),
          gallery_urls: [],
          especialidades,
          comunas_cobertura: comunasCobertura,
          radio_km: radioKm,
          idiomas: idiomas.length > 0 ? idiomas : ["Español"],
          tiene_vehiculo: tieneVehiculo,
          herramientas_propias: herramientasPropias,
          emite_boleta: emiteBoleta,
          formas_pago_extra: formasPagoExtra,
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
            unidad: form.unidad,
            duracion_min: form.duracionMin,
            garantia_dias: form.garantiaDias,
            materiales_incluidos: form.materialesIncluidos,
            incluye: form.incluye.trim() || null,
            no_incluye: form.noIncluye.trim() || null,
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

      borrarDraft();
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

  const sugerenciasEspecialidades = (activeCat?.services ?? []).filter((s) => !especialidades.includes(s));
  const esUltimo = paso === PASOS.length - 1;

  return (
    <div className="min-h-screen bg-[#F5F5F0] pb-32">
      <header className="bg-[#111827] text-white px-5 pt-6 pb-5">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">Completa tu perfil</h1>
          <p className="text-sm text-white/70 mt-1">
            Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
          </p>
          <div className="mt-4 flex gap-1.5">
            {PASOS.map((p, i) => (
              <button
                type="button" key={p} title={p} aria-label={`Ir a ${p}`}
                onClick={() => { if (i < paso) irA(i); }}
                className={`h-1.5 flex-1 rounded-full transition ${i <= paso ? "bg-[#EF9F27]" : "bg-white/15"} ${i < paso ? "cursor-pointer" : "cursor-default"}`}
              />
            ))}
          </div>
          <div className="mt-1.5 hidden sm:flex gap-1.5">
            {PASOS.map((p, i) => (
              <span key={p} className={`flex-1 text-[10px] truncate ${i === paso ? "text-[#EF9F27] font-semibold" : "text-white/50"}`}>{p}</span>
            ))}
          </div>
        </div>
      </header>

      <main className="px-5 pt-6 max-w-lg md:max-w-2xl mx-auto space-y-5">
        {draftPendiente && (
          <div className="p-4 rounded-2xl bg-[#FAC775] text-[#111827] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Tienes un registro a medias</div>
              <p className="text-xs text-[#854F0B] mt-0.5">
                Guardamos tu avance en este dispositivo (sin fotos). ¿Quieres continuar donde quedaste?
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={descartarDraft} className="h-10 px-3 rounded-xl bg-white/60 text-xs font-semibold">
                Empezar de nuevo
              </button>
              <button type="button" onClick={() => aplicarDraft(draftPendiente)} className="h-10 px-3 rounded-xl bg-[#111827] text-white text-xs font-semibold">
                Continuar donde quedaste
              </button>
            </div>
          </div>
        )}

        {paso === 0 && (
          <>
            <Intro
              title="Tus datos"
              sub="Así te verán los clientes. Una foto clara y datos de contacto correctos aumentan tus reservas. Puedes cambiar todo después desde tu panel."
            />
            <Section title="Identidad y contacto">
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
              <Hint>Tus datos de contacto solo se comparten con clientes que tienen una reserva confirmada contigo.</Hint>
            </Section>

            <Section title="Dónde estás" hint="Desde aquí calculamos la distancia a cada cliente. Puede ser tu casa, taller o local.">
              <Field label="Comuna">
                <Input value={comuna} onChange={setComuna} placeholder="Ej. Providencia" list="comunas-sugeridas" />
              </Field>
              <Field label="Dirección base">
                <Input value={direccion} onChange={setDireccion} placeholder="Calle o sector desde donde sales a trabajar" />
              </Field>
              <datalist id="comunas-sugeridas">
                {COMUNAS_SUGERIDAS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Section>

            <Section
              title="Zona de cobertura"
              hint="Indica las comunas donde atiendes y hasta cuántos kilómetros te desplazas. Los clientes filtran por cercanía, así que sé realista."
            >
              <Field label="Comunas donde atiendes">
                <ChipsInput
                  value={comunasCobertura}
                  onChange={setComunasCobertura}
                  suggestions={COMUNAS_SUGERIDAS}
                  placeholder="Escribe una comuna y presiona Enter"
                  max={30}
                />
              </Field>
              <Hint>Si no agregas ninguna, usaremos el radio en km desde tu dirección base.</Hint>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Radio de desplazamiento</span>
                  <span className="text-sm font-bold text-[#111827]">{radioKm} km</span>
                </div>
                <input
                  type="range" min={1} max={60} step={1} value={radioKm}
                  onChange={(e) => setRadioKm(Number(e.target.value))}
                  className="w-full accent-[#EF9F27]"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                  <span>1 km</span><span>30 km</span><span>60 km</span>
                </div>
              </div>
            </Section>
          </>
        )}

        {paso === 1 && (
          <>
            <Intro
              title="Tu profesión"
              sub="Cuéntanos qué haces, cuánta experiencia tienes y en qué te especializas. Esto aparece en tu perfil público y ayuda a que te encuentren."
            />
            <Section title="Rubro y experiencia">
              <Field label="Categoría">
                <select
                  value={categoriaId}
                  onChange={(e) => { setCategoriaId(e.target.value); setServicios([]); setEspecialidades([]); setAbierto(null); }}
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
              <Hint>Si cambias de categoría se reinician los servicios y especialidades elegidos.</Hint>
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
                <span className={`block text-right text-[11px] mt-1 ${bio.trim().length < 30 ? "text-[#FF3B6B]" : "text-muted-foreground"}`}>
                  {bio.length} caracteres {bio.trim().length < 30 ? "· mínimo 30" : ""}
                </span>
              </Field>
            </Section>

            <Section
              title="Especialidades"
              hint={`Hasta ${MAX_ESPECIALIDADES}. Escribe la tuya o elige entre las sugerencias de ${activeCat?.name ?? "tu categoría"}. Aparecen como etiquetas en tu perfil.`}
            >
              <ChipsInput
                value={especialidades}
                onChange={setEspecialidades}
                suggestions={sugerenciasEspecialidades}
                placeholder="Ej. Calefont, filtraciones, instalación de WC"
                max={MAX_ESPECIALIDADES}
              />
            </Section>

            <Section title="Idiomas" hint="Marca los idiomas en que puedes atender a un cliente.">
              <CheckChips options={IDIOMAS_OPCIONES} value={idiomas} onChange={setIdiomas} />
            </Section>

            <Section title="Sobre tu trabajo" hint="Detalles prácticos que los clientes suelen preguntar antes de reservar.">
              <SwitchRow
                label="Tengo vehículo propio" sub="Puedes llegar con materiales o equipos pesados."
                value={tieneVehiculo} onChange={setTieneVehiculo}
              />
              <SwitchRow
                label="Trabajo con mis propias herramientas" sub="El cliente no necesita prestarte nada."
                value={herramientasPropias} onChange={setHerramientasPropias}
              />
              <SwitchRow
                label="Emito boleta o factura" sub="Ideal para clientes que necesitan respaldo tributario."
                value={emiteBoleta} onChange={setEmiteBoleta}
              />
              <div>
                <span className="block text-sm font-medium mb-2">Formas de pago para extras</span>
                <CheckChips options={FORMAS_PAGO_EXTRA} value={formasPagoExtra} onChange={setFormasPagoExtra} />
                <Hint>El pago principal siempre es por Homie; esto es solo para extras acordados dentro del rango.</Hint>
              </div>
            </Section>
          </>
        )}

        {paso === 2 && (
          <>
            <Intro
              title="Tus servicios"
              sub={`Elige los servicios de ${activeCat?.name ?? "tu categoría"} que ofreces y completa la ficha de cada uno. Mientras más clara sea, menos dudas tendrá el cliente y más rápido reservará.`}
            />
            <Section title="¿Qué servicios ofreces?" hint="Toca para agregar o quitar. Cada servicio tiene su propia ficha con precio, duración y garantía.">
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
                      {on && <Check className="inline size-3.5 mr-1 -mt-0.5" />}{s}
                    </button>
                  );
                })}
              </div>
            </Section>

            {servicios.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fichas de servicio</h3>
                  <span className="text-xs text-muted-foreground">
                    {servicios.filter((s) => faltantesServicio(s).length === 0).length}/{servicios.length} completas
                  </span>
                </div>
                {servicios.map((s, i) => (
                  <ServicioCard
                    key={s.nombre}
                    s={s}
                    open={abierto === s.nombre || (abierto === null && i === 0)}
                    onToggle={() => setAbierto(abierto === s.nombre ? "" : s.nombre)}
                    onChange={(patch) => updateServicio(s.nombre, patch)}
                    onRemove={() => toggleServicio(s.nombre)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {paso === 3 && (
          <>
            <Intro
              title="Tu horario"
              sub="Define los días y horas en que atiendes. Los clientes solo podrán reservar dentro de este horario; podrás ajustarlo cuando quieras desde tu panel."
            />
            <Section title="Días y horas de atención">
              <HorarioEditor value={horario} onChange={setHorario} />
            </Section>

            <Section
              title="Tiempo de respuesta comprometido"
              hint="¿En cuánto tiempo respondes una solicitud? Se muestra en tu perfil y los clientes lo valoran mucho. Elige algo que puedas cumplir."
            >
              <Segmented
                options={RESPUESTA_OPCIONES.map((o) => ({ value: o.value, label: o.label }))}
                value={respuestaMin}
                onChange={setRespuestaMin}
              />
              <div className="flex items-center gap-2 text-sm text-[#111827]">
                <Clock className="size-4 text-[#EF9F27]" />
                <span>Tu perfil mostrará: <strong>{textoRespuesta(respuestaMin)}</strong></span>
              </div>
            </Section>

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
          </>
        )}

        {paso === 4 && (
          <>
            <Intro
              title="Revisa y publica"
              sub="Así se verá tu perfil para los clientes. Revisa que todo esté correcto; puedes volver a cualquier paso con Editar."
            />
            <Resumen
              fotoPreview={fotoPreview}
              nombre={nombre} titulo={titulo} categoriaNombre={activeCat?.name ?? ""} comuna={comuna} anos={anos} bio={bio}
              telefono={telefono} whatsapp={whatsapp} direccion={direccion}
              comunasCobertura={comunasCobertura} radioKm={radioKm}
              especialidades={especialidades} idiomas={idiomas}
              tieneVehiculo={tieneVehiculo} herramientasPropias={herramientasPropias} emiteBoleta={emiteBoleta} formasPagoExtra={formasPagoExtra}
              servicios={servicios} horario={horario} disponibleAhora={disponibleAhora} respuestaMin={respuestaMin}
              onEditar={irA}
            />
            <div className="p-4 rounded-2xl bg-[#111827] text-white flex gap-3 items-start">
              <ShieldCheck className="size-5 text-[#EF9F27] shrink-0 mt-0.5" />
              <div className="text-xs text-white/80 space-y-1">
                <p className="font-semibold text-white text-sm">Último paso: verificación</p>
                <p>
                  Al guardar te pediremos verificar tu identidad (cédula + selfie) y subir al menos un certificado o título.
                  Homie solo muestra públicamente a profesionales verificados; mientras tanto tu perfil queda guardado y listo.
                </p>
              </div>
            </div>
          </>
        )}

        {err && (
          <p className="text-sm text-[#FF3B6B] flex items-start gap-1.5"><AlertCircle className="size-4 shrink-0 mt-0.5" /> {err}</p>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E7EB] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg md:max-w-2xl mx-auto flex gap-3">
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
          {!esUltimo ? (
            <button
              type="button"
              onClick={siguiente}
              className="flex-1 h-12 rounded-2xl bg-[#EF9F27] text-[#111827] font-semibold inline-flex items-center justify-center gap-1"
            >
              {paso === PASOS.length - 2 ? "Revisar" : "Siguiente"} <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finalizar}
              disabled={submitting}
              className="flex-1 h-12 rounded-2xl bg-[#111827] text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Guardando...</> : <><ShieldCheck className="size-4" /> Guardar y verificar mi identidad</>}
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

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-white border border-border space-y-4">
      <div>
        <h3 className="font-semibold text-[#111827]">{title}</h3>
        {hint && <p className="text-xs text-[#6B7280] mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
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
  value, onChange, placeholder, type = "text", list,
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; list?: string }) {
  return (
    <input
      type={type}
      value={value}
      list={list}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30"
    />
  );
}

function SwitchRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <button
        type="button" onClick={() => onChange(!value)} aria-pressed={value}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${value ? "bg-[#00C288]" : "bg-[#D1D5DB]"}`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function CheckChips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <label key={o} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition ${
            on ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-border"
          }`}>
            <input
              type="checkbox" className="sr-only" checked={on}
              onChange={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            />
            {on && <Check className="size-3.5" />}
            {o}
          </label>
        );
      })}
    </div>
  );
}

function Segmented<T extends string | number>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-muted/60 border border-border">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)} type="button" onClick={() => onChange(o.value)} aria-pressed={on}
            className={`flex-1 min-w-[4.5rem] h-9 px-2 rounded-lg text-xs font-semibold transition ${
              on ? "bg-[#111827] text-white shadow-sm" : "text-[#374151] hover:bg-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipsInput({
  value, onChange, suggestions, placeholder, max,
}: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder?: string; max: number }) {
  const [texto, setTexto] = useState("");
  const lleno = value.length >= max;
  const norm = (s: string) => s.trim().toLowerCase();

  function agregar(raw: string) {
    const v = raw.trim().replace(/\s+/g, " ");
    if (!v || lleno) return;
    if (value.some((x) => norm(x) === norm(v))) { setTexto(""); return; }
    onChange([...value, v]);
    setTexto("");
  }
  function quitar(v: string) { onChange(value.filter((x) => x !== v)); }

  const filtradas = suggestions
    .filter((s) => !value.some((x) => norm(x) === norm(s)))
    .filter((s) => !texto.trim() || norm(s).includes(norm(texto)))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full bg-[#111827] text-white text-sm">
              {v}
              <button type="button" onClick={() => quitar(v)} aria-label={`Quitar ${v}`} className="p-0.5 rounded-full hover:bg-white/20">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); agregar(texto); }
          else if (e.key === "Backspace" && !texto && value.length > 0) { quitar(value[value.length - 1]); }
        }}
        onBlur={() => { if (texto.trim()) agregar(texto); }}
        placeholder={lleno ? `Máximo ${max}` : placeholder}
        disabled={lleno}
        className="w-full h-12 px-4 rounded-2xl bg-white border border-border outline-none focus:border-foreground/30 disabled:opacity-60"
      />
      {!lleno && filtradas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtradas.map((s) => (
            <button
              key={s} type="button" onClick={() => agregar(s)}
              className="px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs text-[#374151] hover:bg-white hover:border-foreground/30 transition"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">{value.length}/{max} · Enter para agregar. Puedes escribir cualquier texto.</p>
    </div>
  );
}

function FotoPerfilPicker({ preview, onPick }: { preview: string | null; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center gap-4">
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
  s, open, onToggle, onChange, onRemove,
}: { s: ServicioForm; open: boolean; onToggle: () => void; onChange: (p: Partial<ServicioForm>) => void; onRemove: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const max = maxHasta(s.precio);
  const hastaInvalido = s.precioHasta < s.precio || s.precioHasta > max;
  const faltan = faltantesServicio(s);
  const completa = faltan.length === 0;

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
    <div className={`rounded-2xl bg-white border overflow-hidden ${completa ? "border-[#00C288]/50" : "border-border"}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{s.nombre}</div>
          <div className="text-xs text-muted-foreground truncate">
            {s.precio >= 1000 ? `${formatCLP(s.precio)} – ${formatCLP(s.precioHasta)} ${UNIDAD_LABEL[s.unidad]}` : "Define el precio"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {completa ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00C28820] text-[#00754F] text-[10px] font-semibold">
              <Check className="size-3" /> Completa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAC77540] text-[#854F0B] text-[10px] font-semibold">
              Faltan datos
            </span>
          )}
          <ChevronDown className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-border pt-4">
          {!completa && (
            <p className="text-[11px] text-[#854F0B]">Falta: {faltan.join(", ")}.</p>
          )}

          {/* Precio */}
          <div className="space-y-2">
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
            <p className="text-[11px] text-muted-foreground">
              Máximo 50% sobre el precio desde. El cliente paga el precio desde al reservar; el valor final nunca puede superar el precio hasta.
              {s.precio >= 1000 && <> Máximo permitido: <strong>{formatCLP(max)}</strong>.</>}
            </p>
          </div>

          <div>
            <span className="block text-xs font-medium mb-2">Unidad de cobro</span>
            <Segmented
              options={UNIDADES.map((u) => ({ value: u, label: UNIDAD_LABEL[u] }))}
              value={s.unidad}
              onChange={(u) => onChange({ unidad: u })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1">Duración estimada</span>
              <select
                value={s.duracionMin === null ? "null" : String(s.duracionMin)}
                onChange={(e) => onChange({ duracionMin: e.target.value === "null" ? null : Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 text-sm"
              >
                {DURACION_OPCIONES.map((o) => (
                  <option key={String(o.value)} value={o.value === null ? "null" : String(o.value)}>{o.label}</option>
                ))}
              </select>
            </label>
            <div>
              <span className="block text-xs font-medium mb-1">Garantía</span>
              <Segmented
                options={GARANTIA_OPCIONES}
                value={s.garantiaDias}
                onChange={(g) => onChange({ garantiaDias: g })}
              />
            </div>
          </div>

          <SwitchRow
            label="Materiales incluidos en el precio"
            sub="Si no, el cliente paga materiales aparte dentro del rango hasta."
            value={s.materialesIncluidos}
            onChange={(v) => onChange({ materialesIncluidos: v })}
          />

          <label className="block">
            <span className="block text-xs font-medium mb-1">Qué incluye <span className="text-[#FF3B6B]">*</span></span>
            <textarea
              rows={3} maxLength={MAX_INCLUYE} value={s.incluye}
              onChange={(e) => onChange({ incluye: e.target.value })}
              placeholder={ejemploIncluye(s.nombre)}
              className={`w-full p-3 rounded-xl bg-muted/50 border outline-none focus:border-foreground/30 resize-none text-sm ${
                s.incluye.trim().length > 0 && s.incluye.trim().length < 10 ? "border-[#FF3B6B]" : "border-border"
              }`}
            />
            <span className="block text-right text-[11px] text-muted-foreground mt-1">{s.incluye.length}/{MAX_INCLUYE} · mínimo 10</span>
          </label>

          <label className="block">
            <span className="block text-xs font-medium mb-1">Qué NO incluye</span>
            <textarea
              rows={2} maxLength={MAX_NO_INCLUYE} value={s.noIncluye}
              onChange={(e) => onChange({ noIncluye: e.target.value })}
              placeholder='Ej. "Materiales, repuestos de marca, trabajos en altura superior a 3 m."'
              className="w-full p-3 rounded-xl bg-muted/50 border border-border outline-none focus:border-foreground/30 resize-none text-sm"
            />
            <span className="block text-right text-[11px] text-muted-foreground mt-1">{s.noIncluye.length}/{MAX_NO_INCLUYE}</span>
          </label>

          <label className="block">
            <span className="block text-xs font-medium mb-1">Descripción corta</span>
            <textarea
              rows={3} maxLength={MAX_DESC} value={s.descripcion}
              onChange={(e) => onChange({ descripcion: e.target.value })}
              placeholder="Una frase que resuma tu servicio y lo que te diferencia..."
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

          {/* Vista previa */}
          <div>
            <span className="block text-xs font-medium mb-2 text-muted-foreground">Así lo verá el cliente</span>
            <ServicioPreview s={s} />
          </div>

          <button type="button" onClick={onRemove} className="text-xs font-semibold text-[#FF3B6B]">
            Quitar este servicio
          </button>
        </div>
      )}
    </div>
  );
}

function ServicioPreview({ s, fotoUrl }: { s: ServicioForm; fotoUrl?: string | null }) {
  const foto = fotoUrl ?? s.fotoPreview;
  return (
    <div className="flex gap-3 p-3 rounded-2xl bg-[#F5F5F0] border border-[#E5E7EB]">
      {foto ? (
        <img src={foto} alt="" className="size-20 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="size-20 rounded-xl shrink-0 flex items-center justify-center bg-[#EF9F27]/15">
          <Sparkles className="size-7 text-[#EF9F27]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-[#111827]">{s.nombre}</div>
        {s.descripcion.trim() && <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{s.descripcion}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {s.modalidades.map((m) => (
            <span key={m} className="px-1.5 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[10px] font-medium text-[#374151]">
              {MODALIDAD_LABEL[m] ?? m}
            </span>
          ))}
          <span className="px-1.5 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[10px] font-medium text-[#374151]">
            {duracionLabel(s.duracionMin)}
          </span>
          {s.garantiaDias > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#00C28820] text-[#00754F] text-[10px] font-semibold">
              <ShieldCheck className="size-3" /> {garantiaLabel(s.garantiaDias)}
            </span>
          )}
          {s.materialesIncluidos && (
            <span className="px-1.5 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[10px] font-medium text-[#374151]">Materiales incluidos</span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-base font-bold text-[#111827]">{s.precio >= 1000 ? formatCLP(s.precio) : "$—"}</span>
          {s.precioHasta > s.precio && <span className="text-xs text-[#6B7280]">– {formatCLP(s.precioHasta)}</span>}
          <span className="text-[11px] text-[#6B7280]">{UNIDAD_LABEL[s.unidad]}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Resumen (paso 5) ----------
interface ResumenProps {
  fotoPreview: string | null;
  nombre: string; titulo: string; categoriaNombre: string; comuna: string; anos: number; bio: string;
  telefono: string; whatsapp: string; direccion: string;
  comunasCobertura: string[]; radioKm: number;
  especialidades: string[]; idiomas: string[];
  tieneVehiculo: boolean; herramientasPropias: boolean; emiteBoleta: boolean; formasPagoExtra: string[];
  servicios: ServicioForm[]; horario: Horario; disponibleAhora: boolean; respuestaMin: number;
  onEditar: (paso: number) => void;
}

function Resumen(p: ResumenProps) {
  const dias: { key: keyof Horario; label: string }[] = [
    { key: "lun", label: "Lunes" }, { key: "mar", label: "Martes" }, { key: "mie", label: "Miércoles" }, { key: "jue", label: "Jueves" },
    { key: "vie", label: "Viernes" }, { key: "sab", label: "Sábado" }, { key: "dom", label: "Domingo" },
  ];
  const diasActivos = dias.filter((d) => p.horario[d.key]?.activo);
  const practicos = [
    p.tieneVehiculo ? "Vehículo propio" : null,
    p.herramientasPropias ? "Herramientas propias" : null,
    p.emiteBoleta ? "Emite boleta" : null,
  ].filter((x): x is string => !!x);
  const cobertura = p.comunasCobertura.length > 0
    ? p.comunasCobertura.join(", ")
    : `Radio de ${p.radioKm} km desde ${p.comuna || "tu dirección base"}`;

  return (
    <div className="space-y-4">
      {/* Cabecera estilo perfil público */}
      <ResumenCard titulo="Tus datos" onEditar={() => p.onEditar(0)}>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full overflow-hidden bg-[#F5F5F0] border border-[#E5E7EB] shrink-0 flex items-center justify-center">
            {p.fotoPreview ? <img src={p.fotoPreview} alt="" className="size-full object-cover" /> : <Camera className="size-5 text-[#9CA3AF]" />}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-[#111827] leading-tight">{p.nombre || "Sin nombre"}</div>
            <div className="text-sm font-medium text-[#EF9F27]">{p.titulo || p.categoriaNombre}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">
              {p.categoriaNombre}{p.comuna ? ` · ${p.comuna}` : ""}{p.anos ? ` · ${p.anos} años de experiencia` : ""}
            </div>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <ResumenDato k="Teléfono" v={p.telefono} />
          <ResumenDato k="WhatsApp" v={p.whatsapp} />
          <ResumenDato k="Dirección base" v={p.direccion} />
          <ResumenDato k="Cobertura" v={cobertura} />
        </dl>
      </ResumenCard>

      <ResumenCard titulo="Sobre mí" onEditar={() => p.onEditar(1)}>
        <p className="text-sm leading-relaxed text-[#111827]/80 whitespace-pre-line">{p.bio || "Sin bio."}</p>
        {p.especialidades.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Especialidades</div>
            <Chips items={p.especialidades} dark />
          </div>
        )}
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Idiomas</div>
          <Chips items={p.idiomas} />
        </div>
        {(practicos.length > 0 || p.formasPagoExtra.length > 0) && (
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Datos prácticos</div>
            <Chips items={[...practicos, ...p.formasPagoExtra.map((f) => `Extras: ${f.toLowerCase()}`)]} />
          </div>
        )}
      </ResumenCard>

      <ResumenCard titulo={`Servicios y precios (${p.servicios.length})`} onEditar={() => p.onEditar(2)}>
        <div className="space-y-2">
          {p.servicios.length === 0 && <p className="text-sm text-[#9CA3AF]">Aún no agregas servicios.</p>}
          {p.servicios.map((s) => (
            <div key={s.nombre} className="space-y-1.5">
              <ServicioPreview s={s} />
              {faltantesServicio(s).length > 0 && (
                <p className="text-[11px] text-[#854F0B] flex items-center gap-1"><AlertCircle className="size-3" /> Faltan datos: {faltantesServicio(s).join(", ")}.</p>
              )}
            </div>
          ))}
        </div>
      </ResumenCard>

      <ResumenCard titulo="Horario y disponibilidad" onEditar={() => p.onEditar(3)}>
        <ul className="space-y-1 text-xs text-[#374151]">
          {diasActivos.length === 0 && <li className="text-[#9CA3AF]">Sin horario definido.</li>}
          {diasActivos.map((d) => (
            <li key={d.key} className="flex justify-between">
              <span>{d.label}</span>
              <span className="font-medium">{p.horario[d.key].desde} – {p.horario[d.key].hasta}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white ${p.disponibleAhora ? "bg-[#00C288]" : "bg-[#FF3B6B]"}`}>
            <span className="size-1.5 rounded-full bg-white" /> {p.disponibleAhora ? "Disponible" : "No disponible"}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F5F0] border border-[#E5E7EB] text-[11px] font-medium text-[#374151]">
            <Clock className="size-3" /> {textoRespuesta(p.respuestaMin)}
          </span>
        </div>
      </ResumenCard>
    </div>
  );
}

function ResumenCard({ titulo, onEditar, children }: { titulo: string; onEditar: () => void; children: React.ReactNode }) {
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-white border border-border">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-[#111827]">{titulo}</h3>
        <button type="button" onClick={onEditar} className="inline-flex items-center gap-1 text-xs font-semibold text-[#EF9F27] hover:underline">
          <Pencil className="size-3.5" /> Editar
        </button>
      </div>
      {children}
    </section>
  );
}

function ResumenDato({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 min-w-0">
      <dt className="text-[#6B7280] shrink-0">{k}:</dt>
      <dd className="text-[#111827] font-medium truncate">{v || "—"}</dd>
    </div>
  );
}

function Chips({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            dark ? "bg-[#111827] text-white" : "bg-[#F5F5F0] border border-[#E5E7EB] text-[#374151]"
          }`}
        >
          {it}
        </span>
      ))}
    </div>
  );
}
