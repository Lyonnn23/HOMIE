import {
  Scissors, Home, Wrench, HeartPulse, PawPrint, Truck, Laptop, Camera,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CategoryId =
  | "beauty" | "home" | "tech-fix" | "health" | "pets" | "moving" | "tech" | "events";

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

export interface ProviderDetail extends ProviderListItem {
  bio: string;
  usuarioId: string | null;
  gallery: string[];
  services: { id: string; name: string; price: number }[];
  reviews: ProviderReview[];
  direccion: string | null;
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
          id, categoria_id, calificacion_promedio, resenas_count,
          precio_desde, disponible_ahora, disponibilidad_texto, distancia_km,
          usuarios!inner ( nombre, foto_url ),
          prestador_servicios!inner ( servicios!inner ( nombre ) )
        `)
        .eq("categoria_id", cat.id)
        .eq("prestador_servicios.servicios.nombre", serviceName);
      if (error) throw error;
      type Row = {
        id: string; categoria_id: string; calificacion_promedio: number;
        resenas_count: number; precio_desde: number; disponible_ahora: boolean;
        disponibilidad_texto: string | null; distancia_km: number | null;
        usuarios: { nombre: string; foto_url: string | null };
      };
      const rows = (data ?? []) as unknown as Row[];
      // Dedupe (un prestador puede aparecer dos veces por el inner join)
      const seen = new Set<string>();
      const out: ProviderListItem[] = [];
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        out.push({
          id: r.id,
          name: r.usuarios.nombre,
          avatarUrl: r.usuarios.foto_url,
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
          id, categoria_id, bio, calificacion_promedio, resenas_count,
          precio_desde, disponible_ahora, disponibilidad_texto, distancia_km,
          direccion, gallery_urls, usuario_id,
          usuarios ( nombre, foto_url ),
          prestador_servicios ( precio, servicios ( id, nombre ) ),
          resenas ( id, calificacion, comentario, created_at, foto_url, verificada, respuesta_prestador, respuesta_fecha, cliente_id, usuarios ( nombre ) )
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      type Row = {
        id: string; categoria_id: string; bio: string | null; usuario_id: string | null;
        calificacion_promedio: number; resenas_count: number;
        precio_desde: number; disponible_ahora: boolean;
        disponibilidad_texto: string | null; distancia_km: number | null;
        direccion: string | null; gallery_urls: string[];
        usuarios: { nombre: string; foto_url: string | null };
        prestador_servicios: { precio: number; servicios: { id: string; nombre: string } }[];
        resenas: {
          id: string; calificacion: number; comentario: string | null; created_at: string;
          foto_url: string | null; verificada: boolean | null;
          respuesta_prestador: string | null; respuesta_fecha: string | null;
          cliente_id: string | null;
          usuarios: { nombre: string } | null;
        }[];
      };
      const r = data as unknown as Row;
      return {
        id: r.id,
        name: r.usuarios.nombre,
        avatarUrl: r.usuarios.foto_url,
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
        services: (r.prestador_servicios ?? []).map((ps) => ({
          id: ps.servicios.id,
          name: ps.servicios.nombre,
          price: ps.precio,
        })),
        reviews: (r.resenas ?? []).map((rv) => {
          const author = rv.usuarios?.nombre ?? "Anónimo";
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

