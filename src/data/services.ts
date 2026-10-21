import {
  Scissors, Home, Wrench, HeartPulse, PawPrint, Truck, Laptop, Camera,
  Car, Flower2, Gift, Baby, PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CategoryId =
  | "beauty" | "home" | "tech-fix" | "health" | "pets" | "moving" | "tech" | "events"
  | "auto" | "garden" | "gifts" | "care" | "party";

export interface Category {
  id: CategoryId;
  name: string;
  bg: string;
  tokenVar: string;
  icon: LucideIcon;
  services: string[];
}

// Metadata visual (íconos, colores y orden) — el catálogo de servicios real
// se sirve desde Supabase mediante useCategoryServices, pero estos arrays
// permiten renderizar el grid de inicio y la búsqueda sin esperar la red.
export const categories: Category[] = [
  { id: "beauty", name: "Belleza y estética", bg: "#FF3B6B", tokenVar: "--cat-beauty", icon: Scissors,
    services: ["Manicure y pedicure","Peluquería","Maquillaje","Extensiones de pestañas","Depilación","Spa y masajes","Tintes y tratamientos","Micropigmentación"] },
  { id: "home", name: "Hogar y limpieza", bg: "#00B4D8", tokenVar: "--cat-home", icon: Home,
    services: ["Aseo del hogar","Lavandería","Planchado","Lavado de ventanas","Limpieza de muebles","Limpieza post-obra","Jardinería","Retiro de escombros"] },
  { id: "tech-fix", name: "Técnicos y gasfitería", bg: "#FF6B00", tokenVar: "--cat-tech-fix", icon: Wrench,
    services: ["Electricista","Gasfíter","Climatización","Cerrajero","Pintor","Instalación de TV/Rack","Yeso y albañilería","Plomería"] },
  { id: "health", name: "Salud y bienestar", bg: "#00C288", tokenVar: "--cat-health", icon: HeartPulse,
    services: ["Enfermería a domicilio","Entrenador personal","Kinesiólogo","Nutricionista","Psicólogo online","Terapeuta/Reiki","Enfermera pediátrica","Cuidador de adultos"] },
  { id: "pets", name: "Mascotas", bg: "#A855F7", tokenVar: "--cat-pets", icon: PawPrint,
    services: ["Peluquería canina","Paseo de perros","Pet sitting","Vet a domicilio","Baño y aseo","Vacunación"] },
  { id: "moving", name: "Muebles y mudanzas", bg: "#64748B", tokenVar: "--cat-moving", icon: Truck,
    services: ["Mudanzas","Armado de muebles","Organización del hogar","Embalaje","Instalación de estanterías","Decoración de interiores"] },
  { id: "tech", name: "Tecnología y digital", bg: "#EF9F27", tokenVar: "--cat-tech", icon: Laptop,
    services: ["Reparación de PC","Instalación de red/WiFi","Instalación de cámaras","Soporte impresoras","Reparación celulares","Clases de computación"] },
  { id: "events", name: "Eventos y fotografía", bg: "#EC4899", tokenVar: "--cat-events", icon: Camera,
    services: ["Fotógrafo","Videógrafo","Decorador de eventos","Chef a domicilio","DJ/sonido","Repostería"] },
  { id: "auto", name: "Automotriz a domicilio", bg: "#2563EB", tokenVar: "--cat-auto", icon: Car,
    services: ["Mecánico a domicilio","Lavado de autos","Cambio de batería","Cambio de neumáticos","Scanner y diagnóstico","Pulido y encerado"] },
  { id: "garden", name: "Jardín y piscinas", bg: "#16A34A", tokenVar: "--cat-garden", icon: Flower2,
    services: ["Jardinería","Corte de pasto","Poda de árboles","Limpieza de piscinas","Mantención de piscinas","Diseño de jardines"] },
  { id: "gifts", name: "Regalos y sorpresas", bg: "#DB2777", tokenVar: "--cat-gifts", icon: Gift,
    services: ["Florería","Desayunos sorpresa","Regalos de cumpleaños","Paquetería y envoltura","Cajas de regalo","Globos y decoración"] },
  { id: "care", name: "Cuidado y asesoría", bg: "#0D9488", tokenVar: "--cat-care", icon: Baby,
    services: ["Cuidadora de niños","Asesora del hogar","Limpieza por día","Cuidado de adulto mayor","Acompañamiento","Apoyo escolar"] },
  { id: "party", name: "Fiestas y diversión", bg: "#F59E0B", tokenVar: "--cat-party", icon: PartyPopper,
    services: ["Juegos inflables","DJ para fiestas","Food truck","Animación infantil","Cumpleaños completo","Carrito de algodón y palomitas","Bartender","Fotocabina"] },
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

export interface ProviderService {
  id: string;
  name: string;
  price: number;        // precio DESDE: lo que se cobra al reservar
  priceTo: number;      // precio HASTA: tope que el profesional no puede superar
  description: string | null;
  photoUrl: string | null;
}

export interface ProviderDetail extends ProviderListItem {
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
          titulo_profesional, anos_experiencia, horario, verificado, verificado_identidad, antecedentes_ok,
          prestador_servicios ( precio, precio_hasta, descripcion, foto_url, servicios ( id, nombre ) ),
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
        prestador_servicios: { precio: number; precio_hasta: number | null; descripcion: string | null; foto_url: string | null; servicios: { id: string; nombre: string } }[];
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
        priceTo: r.precio_hasta ?? r.precio_desde,
        services: (r.prestador_servicios ?? []).map((ps) => ({
          id: ps.servicios.id,
          name: ps.servicios.nombre,
          price: ps.precio,
          priceTo: ps.precio_hasta ?? ps.precio,
          description: ps.descripcion,
          photoUrl: ps.foto_url,
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

