import {
  Scissors, Home, Wrench, HeartPulse, PawPrint, Truck, Laptop, Camera,
  Car, Flower2, Gift, Baby, PartyPopper,
  Scale, Calculator, DraftingCompass, GraduationCap, Stethoscope,
  Sparkles, Briefcase,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Idioma } from "@/i18n";

export type CategoryId =
  | "beauty" | "home" | "tech-fix" | "health" | "pets" | "moving" | "tech" | "events"
  | "auto" | "garden" | "gifts" | "care" | "party"
  | "legal" | "finanzas" | "ingenieria" | "educacion" | "salud-pro";

export type GroupId = "hogar" | "personas" | "profesionales" | "vehiculos" | "mascotas" | "celebraciones" | "tecnologia";

export interface Group {
  id: GroupId;
  name: string;
  tagline: string;
  bg: string;
  icon: LucideIcon;
}

/** Grupos de primer nivel: la portada muestra 7 grupos en vez de 18 categorías. */
export const groups: Group[] = [
  { id: "hogar", name: "Hogar", tagline: "Limpieza, técnicos, jardín, mudanzas", bg: "#00B4D8", icon: Home },
  { id: "personas", name: "Belleza y bienestar", tagline: "Estética, salud, cuidado de personas", bg: "#FF3B6B", icon: Sparkles },
  { id: "profesionales", name: "Profesionales", tagline: "Abogados, contadores, ingenieros, salud, clases", bg: "#111827", icon: Briefcase },
  { id: "vehiculos", name: "Vehículos", tagline: "Mecánica y lavado a domicilio", bg: "#2563EB", icon: Car },
  { id: "mascotas", name: "Mascotas", tagline: "Paseo, baño, veterinario", bg: "#A855F7", icon: PawPrint },
  { id: "celebraciones", name: "Eventos y regalos", tagline: "Fiestas, fotografía, sorpresas", bg: "#EC4899", icon: PartyPopper },
  { id: "tecnologia", name: "Tecnología", tagline: "Computación, redes, celulares", bg: "#EF9F27", icon: Laptop },
];
export function getGroup(id: string) { return groups.find((g) => g.id === id); }

// ---- Nombres traducidos de grupos y categorías (los nombres de servicios se quedan como en la BD) ----
type Trad = Record<Exclude<Idioma, "es">, string>;
const GRUPO_NOMBRE: Record<GroupId, Trad> = {
  hogar: { en: "Home", ht: "Kay", pt: "Casa" },
  personas: { en: "Beauty & wellness", ht: "Bote ak byennèt", pt: "Beleza e bem-estar" },
  profesionales: { en: "Professionals", ht: "Pwofesyonèl", pt: "Profissionais" },
  vehiculos: { en: "Vehicles", ht: "Machin", pt: "Veículos" },
  mascotas: { en: "Pets", ht: "Bèt kay", pt: "Pets" },
  celebraciones: { en: "Events & gifts", ht: "Evènman ak kado", pt: "Eventos e presentes" },
  tecnologia: { en: "Technology", ht: "Teknoloji", pt: "Tecnologia" },
};
const GRUPO_TAGLINE: Record<GroupId, Trad> = {
  hogar: { en: "Cleaning, repairs, garden, moving", ht: "Netwayaj, teknisyen, jaden, demenajman", pt: "Limpeza, técnicos, jardim, mudanças" },
  personas: { en: "Beauty, health, personal care", ht: "Estetik, sante, swen moun", pt: "Estética, saúde, cuidado de pessoas" },
  profesionales: { en: "Lawyers, accountants, engineers, health, classes", ht: "Avoka, kontab, enjenyè, sante, kou", pt: "Advogados, contadores, engenheiros, saúde, aulas" },
  vehiculos: { en: "Mechanics and car wash at home", ht: "Mekanik ak lavaj machin lakay ou", pt: "Mecânica e lavagem em domicílio" },
  mascotas: { en: "Walking, grooming, vet", ht: "Pwomnad, beny, veterinè", pt: "Passeio, banho, veterinário" },
  celebraciones: { en: "Parties, photography, surprises", ht: "Fèt, fotografi, sipriz", pt: "Festas, fotografia, surpresas" },
  tecnologia: { en: "Computers, networks, phones", ht: "Òdinatè, rezo, telefòn", pt: "Computadores, redes, celulares" },
};
const CATEGORIA_NOMBRE: Record<CategoryId, Trad> = {
  beauty: { en: "Beauty & aesthetics", ht: "Bote ak estetik", pt: "Beleza e estética" },
  home: { en: "Home & cleaning", ht: "Kay ak netwayaj", pt: "Casa e limpeza" },
  "tech-fix": { en: "Repairs & plumbing", ht: "Teknisyen ak plonbri", pt: "Técnicos e encanamento" },
  health: { en: "Health & wellness", ht: "Sante ak byennèt", pt: "Saúde e bem-estar" },
  pets: { en: "Pets", ht: "Bèt kay", pt: "Pets" },
  moving: { en: "Furniture & moving", ht: "Mèb ak demenajman", pt: "Móveis e mudanças" },
  tech: { en: "Tech & digital", ht: "Teknoloji ak dijital", pt: "Tecnologia e digital" },
  events: { en: "Events & photography", ht: "Evènman ak fotografi", pt: "Eventos e fotografia" },
  auto: { en: "Automotive at home", ht: "Machin lakay ou", pt: "Automotivo em domicílio" },
  garden: { en: "Garden & pools", ht: "Jaden ak pisin", pt: "Jardim e piscinas" },
  gifts: { en: "Gifts & surprises", ht: "Kado ak sipriz", pt: "Presentes e surpresas" },
  care: { en: "Care & assistance", ht: "Swen ak asistans", pt: "Cuidado e assessoria" },
  party: { en: "Parties & fun", ht: "Fèt ak plezi", pt: "Festas e diversão" },
  legal: { en: "Lawyers", ht: "Avoka", pt: "Advogados" },
  finanzas: { en: "Accountants & business", ht: "Kontab ak antrepriz", pt: "Contadores e empresas" },
  ingenieria: { en: "Architecture & engineering", ht: "Achitekti ak jeni", pt: "Arquitetura e engenharia" },
  "salud-pro": { en: "Health professionals", ht: "Sante pwofesyonèl", pt: "Saúde profissional" },
  educacion: { en: "Classes & education", ht: "Kou ak edikasyon", pt: "Aulas e educação" },
};
/** Nombre del grupo en el idioma dado (es = nombre original). */
export function nombreGrupo(id: GroupId | string, idioma: Idioma): string {
  const g = getGroup(id);
  if (!g) return "";
  return idioma === "es" ? g.name : GRUPO_NOMBRE[g.id]?.[idioma] ?? g.name;
}
/** Tagline del grupo en el idioma dado. */
export function taglineGrupo(id: GroupId | string, idioma: Idioma): string {
  const g = getGroup(id);
  if (!g) return "";
  return idioma === "es" ? g.tagline : GRUPO_TAGLINE[g.id]?.[idioma] ?? g.tagline;
}
/** Nombre de la categoría en el idioma dado (es = nombre original). */
export function nombreCategoria(id: CategoryId | string, idioma: Idioma): string {
  const c = categories.find((x) => x.id === id);
  if (!c) return "";
  return idioma === "es" ? c.name : CATEGORIA_NOMBRE[c.id]?.[idioma] ?? c.name;
}
export function categoriesOfGroup(id: GroupId) { return categories.filter((c) => c.group === id); }

export interface Category {
  id: CategoryId;
  name: string;
  group: GroupId;
  bg: string;
  tokenVar: string;
  icon: LucideIcon;
  services: string[];
}

// Metadata visual (íconos, colores y orden) — el catálogo de servicios real
// se sirve desde Supabase mediante useCategoryServices, pero estos arrays
// permiten renderizar el grid de inicio y la búsqueda sin esperar la red.
export const categories: Category[] = [
  { id: "beauty", group: "personas", name: "Belleza y estética", bg: "#FF3B6B", tokenVar: "--cat-beauty", icon: Scissors,
    services: ["Manicure y pedicure","Peluquería","Maquillaje","Extensiones de pestañas","Depilación","Spa y masajes","Tintes y tratamientos","Micropigmentación"] },
  { id: "home", group: "hogar", name: "Hogar y limpieza", bg: "#00B4D8", tokenVar: "--cat-home", icon: Home,
    services: ["Aseo del hogar","Lavandería","Planchado","Lavado de ventanas","Limpieza de muebles","Limpieza post-obra","Jardinería","Retiro de escombros"] },
  { id: "tech-fix", group: "hogar", name: "Técnicos y gasfitería", bg: "#FF6B00", tokenVar: "--cat-tech-fix", icon: Wrench,
    services: ["Electricista","Gasfíter","Climatización","Cerrajero","Pintor","Instalación de TV/Rack","Yeso y albañilería","Plomería"] },
  { id: "health", group: "personas", name: "Salud y bienestar", bg: "#00C288", tokenVar: "--cat-health", icon: HeartPulse,
    services: ["Entrenador personal","Masajista","Terapeuta/Reiki","Yoga y pilates","Coach de bienestar","Cuidador de adultos"] },
  { id: "pets", group: "mascotas", name: "Mascotas", bg: "#A855F7", tokenVar: "--cat-pets", icon: PawPrint,
    services: ["Peluquería canina","Paseo de perros","Pet sitting","Vet a domicilio","Baño y aseo","Vacunación"] },
  { id: "moving", group: "hogar", name: "Muebles y mudanzas", bg: "#64748B", tokenVar: "--cat-moving", icon: Truck,
    services: ["Mudanzas","Armado de muebles","Organización del hogar","Embalaje","Instalación de estanterías","Decoración de interiores"] },
  { id: "tech", group: "tecnologia", name: "Tecnología y digital", bg: "#EF9F27", tokenVar: "--cat-tech", icon: Laptop,
    services: ["Reparación de PC","Instalación de red/WiFi","Instalación de cámaras","Soporte impresoras","Reparación celulares","Clases de computación"] },
  { id: "events", group: "celebraciones", name: "Eventos y fotografía", bg: "#EC4899", tokenVar: "--cat-events", icon: Camera,
    services: ["Fotógrafo","Videógrafo","Decorador de eventos","Chef a domicilio","DJ/sonido","Repostería"] },
  { id: "auto", group: "vehiculos", name: "Automotriz a domicilio", bg: "#2563EB", tokenVar: "--cat-auto", icon: Car,
    services: ["Mecánico a domicilio","Lavado de autos","Cambio de batería","Cambio de neumáticos","Scanner y diagnóstico","Pulido y encerado"] },
  { id: "garden", group: "hogar", name: "Jardín y piscinas", bg: "#16A34A", tokenVar: "--cat-garden", icon: Flower2,
    services: ["Jardinería","Corte de pasto","Poda de árboles","Limpieza de piscinas","Mantención de piscinas","Diseño de jardines"] },
  { id: "gifts", group: "celebraciones", name: "Regalos y sorpresas", bg: "#DB2777", tokenVar: "--cat-gifts", icon: Gift,
    services: ["Florería","Desayunos sorpresa","Regalos de cumpleaños","Paquetería y envoltura","Cajas de regalo","Globos y decoración"] },
  { id: "care", group: "personas", name: "Cuidado y asesoría", bg: "#0D9488", tokenVar: "--cat-care", icon: Baby,
    services: ["Cuidadora de niños","Asesora del hogar","Limpieza por día","Cuidado de adulto mayor","Acompañamiento","Apoyo escolar"] },
  { id: "party", group: "celebraciones", name: "Fiestas y diversión", bg: "#F59E0B", tokenVar: "--cat-party", icon: PartyPopper,
    services: ["Juegos inflables","DJ para fiestas","Food truck","Animación infantil","Cumpleaños completo","Carrito de algodón y palomitas","Bartender","Fotocabina"] },
  // ---- Profesionales ----
  { id: "legal", group: "profesionales", name: "Abogados", bg: "#1E3A8A", tokenVar: "--cat-legal", icon: Scale,
    services: ["Abogado de familia","Abogado laboral","Abogado civil","Abogado penal","Abogado inmobiliario","Abogado tributario","Abogado comercial","Abogado de extranjería","Abogado de consumo","Abogado de herencias","Abogado de tránsito","Asesoría legal online"] },
  { id: "finanzas", group: "profesionales", name: "Contadores y empresas", bg: "#0F766E", tokenVar: "--cat-finanzas", icon: Calculator,
    services: ["Contador","Contador auditor","Declaración de renta","Inicio de actividades","Asesoría tributaria","Administrador de empresas","Asesoría financiera","Remuneraciones y RRHH","Gestión de pymes","Constitución de empresas"] },
  { id: "ingenieria", group: "profesionales", name: "Arquitectura e ingeniería", bg: "#7C2D12", tokenVar: "--cat-ingenieria", icon: DraftingCompass,
    services: ["Arquitecto","Ingeniero civil","Ingeniero eléctrico","Ingeniero estructural","Constructor civil","Diseño de planos","Regularización de construcciones","Topógrafo","Prevencionista de riesgos","Inspección técnica de obras","Diseñador de interiores","Ingeniero en climatización"] },
  { id: "salud-pro", group: "profesionales", name: "Salud profesional", bg: "#047857", tokenVar: "--cat-salud-pro", icon: Stethoscope,
    services: ["Enfermera a domicilio","Matrona","Médico a domicilio","Kinesiólogo","Nutricionista","Psicólogo","Fonoaudiólogo","Terapeuta ocupacional","Podólogo","Técnico en enfermería (TENS)","Toma de exámenes a domicilio","Cuidados paliativos"] },
  { id: "educacion", group: "profesionales", name: "Clases y educación", bg: "#9333EA", tokenVar: "--cat-educacion", icon: GraduationCap,
    services: ["Profesor particular","Preparación PAES","Clases de inglés","Clases de matemáticas","Psicopedagogo","Educadora diferencial","Clases de música","Clases de computación","Clases de manejo","Asesoría de tesis"] },
];


export function getCategory(id: string) { return categories.find((c) => c.id === id); }
export function getCategoryByService(service: string) {
  return categories.find((c) => c.services.includes(service));
}
export function formatCLP(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

// ---------- Tipos ----------
export interface ProviderListItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  categoryId: CategoryId;
  rating: number;
  reviewsCount: number;
  pricePerHour: number;
  distanceKm: number;
  availability: string;
  disponibleAhora: boolean;
}

export interface ProviderReview {
  id: string;
  author: string;
  authorId: string | null;
  rating: number;
  text: string;
  date: string;
  createdAt: string;
  fotoUrl: string | null;
  verificada: boolean;
  respuesta: string | null;
  respuestaFecha: string | null;
}

export type DiaKey = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
export type Horario = Record<DiaKey, { activo: boolean; desde: string; hasta: string }>;
export const DIAS: { key: DiaKey; label: string; corto: string }[] = [
  { key: "lun", label: "Lunes", corto: "L" }, { key: "mar", label: "Martes", corto: "M" },
  { key: "mie", label: "Miércoles", corto: "X" }, { key: "jue", label: "Jueves", corto: "J" },
  { key: "vie", label: "Viernes", corto: "V" }, { key: "sab", label: "Sábado", corto: "S" },
  { key: "dom", label: "Domingo", corto: "D" },
];
export const HORARIO_DEFAULT: Horario = {
  lun: { activo: true, desde: "09:00", hasta: "18:00" }, mar: { activo: true, desde: "09:00", hasta: "18:00" },
  mie: { activo: true, desde: "09:00", hasta: "18:00" }, jue: { activo: true, desde: "09:00", hasta: "18:00" },
  vie: { activo: true, desde: "09:00", hasta: "18:00" }, sab: { activo: false, desde: "10:00", hasta: "14:00" },
  dom: { activo: false, desde: "10:00", hasta: "14:00" },
};
/** Tope legal del rango: el precio hasta nunca supera 1.5x el precio desde. */
export const RANGO_MAX_FACTOR = 1.5;

export type UnidadCobro = "hora" | "visita" | "trabajo" | "sesion" | "dia" | "m2";
export const UNIDAD_LABEL: Record<UnidadCobro, string> = {
  trabajo: "por trabajo", hora: "por hora", visita: "por visita", sesion: "por sesión", dia: "por día", m2: "por m²",
};
export const UNIDADES: UnidadCobro[] = ["trabajo", "hora", "visita", "sesion", "dia", "m2"];
export function esUnidad(u: string | null | undefined): u is UnidadCobro {
  return !!u && (UNIDADES as string[]).includes(u);
}

/** Opciones de duración estimada (minutos; null = varios días). */
export const DURACION_OPCIONES: { value: number | null; label: string }[] = [
  { value: 30, label: "30 min" }, { value: 60, label: "1 h" }, { value: 120, label: "2 h" }, { value: 180, label: "3 h" },
  { value: 240, label: "Medio día" }, { value: 480, label: "Día completo" }, { value: null, label: "Varios días" },
];
export function duracionLabel(min: number | null | undefined): string {
  if (min === null || min === undefined) return "Varios días";
  const exact = DURACION_OPCIONES.find((o) => o.value === min);
  if (exact) return exact.label;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const GARANTIA_OPCIONES: { value: number; label: string }[] = [
  { value: 0, label: "Sin garantía" }, { value: 7, label: "7 días" }, { value: 30, label: "30 días" },
  { value: 90, label: "90 días" }, { value: 365, label: "1 año" },
];
export function garantiaLabel(dias: number): string {
  if (!dias) return "Sin garantía";
  const o = GARANTIA_OPCIONES.find((g) => g.value === dias);
  return o ? `Garantía ${o.label}` : `Garantía ${dias} días`;
}

export const IDIOMAS_OPCIONES = ["Español", "Inglés", "Portugués", "Creole", "Lengua de señas chilena"];
export const FORMAS_PAGO_EXTRA = ["Efectivo", "Transferencia"];

export interface ProviderService {
  id: string;
  name: string;
  price: number;        // precio DESDE: lo que se cobra al reservar
  priceTo: number;      // precio HASTA: tope que el profesional no puede superar
  description: string | null;
  photoUrl: string | null;
  modalidades: string[]; // ⊆ {domicilio, online, local}
  unidad: UnidadCobro;
  duracionMin: number | null;
  garantiaDias: number;
  materialesIncluidos: boolean;
  incluye: string | null;
  noIncluye: string | null;
}

export interface ProviderDetail extends ProviderListItem {
  especialidades: string[];
  comunasCobertura: string[];
  radioKm: number;
  idiomas: string[];
  tieneVehiculo: boolean;
  herramientasPropias: boolean;
  emiteBoleta: boolean;
  proHasta: string | null;
  bio: string;
  usuarioId: string | null;
  gallery: string[];
  services: ProviderService[];
  reviews: ProviderReview[];
  direccion: string | null;
  comuna: string | null;
  bannerUrl: string | null;
  colorPerfil: string | null;
  tituloProfesional: string | null;
  anosExperiencia: number | null;
  horario: Horario;
  verificado: boolean;
  verificadoIdentidad: boolean;
  antecedentesOk: boolean;
  priceTo: number;
}


// ---------- Helpers ----------
/** true si el profesional tiene Homie Premium vigente (columna `pro_hasta`). */
export function esPro(proHasta: string | null | undefined): boolean {
  return !!proHasta && new Date(proHasta).getTime() > Date.now();
}

/** Umbrales para que Premium empuje en el ranking (espejo de config_publica). */
export const RANKING_MIN_RATING_PREMIUM = 4.0;
export const RANKING_MIN_RESENAS_PREMIUM = 3;

/** Calificación ponderada (bayesiana): con pocas reseñas se acerca a 4.5. Espejo de `puntaje_ranking` en SQL. */
export function ratingBayesiano(rating: number, reviewsCount: number): number {
  return ((rating * reviewsCount) + (4.5 * 5)) / (reviewsCount + 5);
}

/** Premium solo destaca con buena reputación. */
export function premiumDestaca(r: { premium: boolean; rating: number; reviewsCount: number }): boolean {
  return r.premium && r.rating >= RANKING_MIN_RATING_PREMIUM && r.reviewsCount >= RANKING_MIN_RESENAS_PREMIUM;
}

/**
 * Puntaje de reputación para ordenar resultados. Misma fórmula que `puntaje_ranking` en la BD
 * (sin el ajuste por completadas/canceladas, que no se consulta en el listado).
 */
export function rankingScore(r: {
  rating: number; reviewsCount: number; disponibleAhora: boolean; availability?: string | null; premium: boolean;
}): number {
  let v = ratingBayesiano(r.rating, r.reviewsCount) * 20; // 0..100
  if (r.disponibleAhora) v += 8;
  const disp = r.availability ?? "";
  if (disp.includes("15 min")) v += 4;
  else if (disp.includes("1 h")) v += 2;
  if (premiumDestaca(r)) v += 12;
  return Math.round(v * 100) / 100;
}
export const MODALIDAD_LABEL: Record<string, string> = { domicilio: "A domicilio", online: "Online", local: "En local" };

function timeAgoEs(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const weeks = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)));
  return `${weeks} sem atrás`;
}

// ---------- Hooks ----------
export function useProvidersForService(serviceName: string) {
  const cat = getCategoryByService(serviceName);
  return useQuery({
    queryKey: ["providers-for-service", serviceName],
    enabled: !!cat,
    queryFn: async (): Promise<ProviderListItem[]> => {
      if (!cat) return [];
      const { data, error } = await supabase
        .from("prestadores")
        .select(`
          id, categoria_id, nombre, foto_url, calificacion_promedio, resenas_count,
          precio_desde, disponible_ahora, disponibilidad_texto, distancia_km,
          prestador_servicios!inner ( servicios!inner ( nombre ) )
        `)
        .eq("categoria_id", cat.id)
        .eq("prestador_servicios.servicios.nombre", serviceName);
      if (error) throw error;
      type Row = {
        id: string; categoria_id: string;
        nombre: string | null; foto_url: string | null;
        calificacion_promedio: number;
        resenas_count: number; precio_desde: number; disponible_ahora: boolean;
        disponibilidad_texto: string | null; distancia_km: number | null;
      };
      const rows = (data ?? []) as unknown as Row[];
      const seen = new Set<string>();
      const out: ProviderListItem[] = [];
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        out.push({
          id: r.id,
          name: r.nombre ?? "Prestador",
          avatarUrl: r.foto_url,
          categoryId: r.categoria_id as CategoryId,
          rating: Number(r.calificacion_promedio),
          reviewsCount: r.resenas_count,
          pricePerHour: r.precio_desde,
          distanceKm: Number(r.distancia_km ?? 0),
          availability: r.disponibilidad_texto ?? "Disponible",
          disponibleAhora: r.disponible_ahora,
        });
      }
      return out;
    },
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ["provider", id],
    queryFn: async (): Promise<ProviderDetail | null> => {
      const { data, error } = await supabase
        .from("prestadores")
        .select(`
          id, categoria_id, nombre, foto_url, bio, calificacion_promedio, resenas_count,
          precio_desde, precio_hasta, disponible_ahora, disponibilidad_texto, distancia_km,
          direccion, gallery_urls, usuario_id, comuna, banner_url, color_perfil,
          titulo_profesional, anos_experiencia, horario, verificado, verificado_identidad, antecedentes_ok, pro_hasta,
          especialidades, comunas_cobertura, radio_km, idiomas, tiene_vehiculo, herramientas_propias, emite_boleta,
          prestador_servicios ( precio, precio_hasta, descripcion, foto_url, modalidades, unidad, duracion_min, garantia_dias, materiales_incluidos, incluye, no_incluye, servicios ( id, nombre ) ),
          resenas ( id, calificacion, comentario, created_at, foto_url, verificada, respuesta_prestador, respuesta_fecha, cliente_id, cliente_nombre )
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      type Row = {
        id: string; categoria_id: string;
        nombre: string | null; foto_url: string | null;
        bio: string | null; usuario_id: string | null;
        calificacion_promedio: number; resenas_count: number;
        precio_desde: number; precio_hasta: number | null; disponible_ahora: boolean;
        disponibilidad_texto: string | null; distancia_km: number | null;
        direccion: string | null; gallery_urls: string[];
        comuna: string | null; banner_url: string | null; color_perfil: string | null;
        titulo_profesional: string | null; anos_experiencia: number | null; horario: Horario | null;
        verificado: boolean | null; verificado_identidad: boolean | null; antecedentes_ok: boolean | null;
        pro_hasta: string | null;
        especialidades: string[] | null; comunas_cobertura: string[] | null; radio_km: number | null; idiomas: string[] | null;
        tiene_vehiculo: boolean | null; herramientas_propias: boolean | null; emite_boleta: boolean | null;
        prestador_servicios: {
          precio: number; precio_hasta: number | null; descripcion: string | null; foto_url: string | null; modalidades: string[] | null;
          unidad: string | null; duracion_min: number | null; garantia_dias: number | null; materiales_incluidos: boolean | null;
          incluye: string | null; no_incluye: string | null;
          servicios: { id: string; nombre: string };
        }[];
        resenas: {
          id: string; calificacion: number; comentario: string | null; created_at: string;
          foto_url: string | null; verificada: boolean | null;
          respuesta_prestador: string | null; respuesta_fecha: string | null;
          cliente_id: string | null;
          cliente_nombre: string | null;
        }[];
      };
      const r = data as unknown as Row;
      return {
        id: r.id,
        name: r.nombre ?? "Prestador",
        avatarUrl: r.foto_url,
        categoryId: r.categoria_id as CategoryId,
        bio: r.bio ?? "",
        usuarioId: r.usuario_id,
        rating: Number(r.calificacion_promedio),
        reviewsCount: r.resenas_count,
        pricePerHour: r.precio_desde,
        distanceKm: Number(r.distancia_km ?? 0),
        availability: r.disponibilidad_texto ?? "Disponible",
        disponibleAhora: r.disponible_ahora,
        gallery: r.gallery_urls ?? [],
        direccion: r.direccion,
        comuna: r.comuna,
        bannerUrl: r.banner_url,
        colorPerfil: r.color_perfil,
        tituloProfesional: r.titulo_profesional,
        anosExperiencia: r.anos_experiencia,
        horario: { ...HORARIO_DEFAULT, ...(r.horario ?? {}) },
        verificado: !!r.verificado,
        verificadoIdentidad: !!r.verificado_identidad,
        antecedentesOk: !!r.antecedentes_ok,
        proHasta: r.pro_hasta ?? null,
        priceTo: r.precio_hasta ?? r.precio_desde,
        especialidades: r.especialidades ?? [],
        comunasCobertura: r.comunas_cobertura ?? [],
        radioKm: r.radio_km ?? 15,
        idiomas: r.idiomas ?? ["Español"],
        tieneVehiculo: !!r.tiene_vehiculo,
        herramientasPropias: r.herramientas_propias !== false,
        emiteBoleta: !!r.emite_boleta,
        services: (r.prestador_servicios ?? []).map((ps) => ({
          id: ps.servicios.id,
          name: ps.servicios.nombre,
          price: ps.precio,
          priceTo: ps.precio_hasta ?? ps.precio,
          description: ps.descripcion,
          photoUrl: ps.foto_url,
          modalidades: ps.modalidades && ps.modalidades.length > 0 ? ps.modalidades : ["domicilio"],
          unidad: esUnidad(ps.unidad) ? ps.unidad : "trabajo",
          duracionMin: ps.duracion_min ?? null,
          garantiaDias: ps.garantia_dias ?? 0,
          materialesIncluidos: !!ps.materiales_incluidos,
          incluye: ps.incluye,
          noIncluye: ps.no_incluye,
        })),
        reviews: (r.resenas ?? []).map((rv) => {
          const author = rv.cliente_nombre ?? "Anónimo";
          const parts = author.split(" ");
          const initials = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : author;
          return {
            id: rv.id,
            author: initials,
            authorId: rv.cliente_id,
            rating: rv.calificacion,
            text: rv.comentario ?? "",
            date: timeAgoEs(rv.created_at),
            createdAt: rv.created_at,
            fotoUrl: rv.foto_url,
            verificada: rv.verificada !== false,
            respuesta: rv.respuesta_prestador,
            respuestaFecha: rv.respuesta_fecha,
          };
        }),
      };
    },
  });
}

