import {
  Scissors, Home, Wrench, HeartPulse, PawPrint, Truck, Laptop, Camera,
  type LucideIcon,
} from "lucide-react";

export type CategoryId =
  | "beauty" | "home" | "tech-fix" | "health" | "pets" | "moving" | "tech" | "events";

export interface Category {
  id: CategoryId;
  name: string;
  bg: string;        // hex bg for cards
  tokenVar: string;  // css var name
  icon: LucideIcon;
  services: string[];
}

export const categories: Category[] = [
  {
    id: "beauty", name: "Belleza y estética", bg: "#FBEAF0", tokenVar: "--cat-beauty", icon: Scissors,
    services: ["Manicure y pedicure","Peluquería","Maquillaje","Extensiones de pestañas","Depilación","Spa y masajes","Tintes y tratamientos","Micropigmentación"],
  },
  {
    id: "home", name: "Hogar y limpieza", bg: "#E6F1FB", tokenVar: "--cat-home", icon: Home,
    services: ["Aseo del hogar","Lavandería","Planchado","Lavado de ventanas","Limpieza de muebles","Limpieza post-obra","Jardinería","Retiro de escombros"],
  },
  {
    id: "tech-fix", name: "Técnicos y gasfitería", bg: "#FAEEDA", tokenVar: "--cat-tech-fix", icon: Wrench,
    services: ["Electricista","Gasfíter","Climatización","Cerrajero","Pintor","Instalación de TV/Rack","Yeso y albañilería","Plomería"],
  },
  {
    id: "health", name: "Salud y bienestar", bg: "#E1F5EE", tokenVar: "--cat-health", icon: HeartPulse,
    services: ["Enfermería a domicilio","Entrenador personal","Kinesiólogo","Nutricionista","Psicólogo online","Terapeuta/Reiki","Enfermera pediátrica","Cuidador de adultos"],
  },
  {
    id: "pets", name: "Mascotas", bg: "#EEEDFE", tokenVar: "--cat-pets", icon: PawPrint,
    services: ["Peluquería canina","Paseo de perros","Pet sitting","Vet a domicilio","Baño y aseo","Vacunación"],
  },
  {
    id: "moving", name: "Muebles y mudanzas", bg: "#F1EFE8", tokenVar: "--cat-moving", icon: Truck,
    services: ["Mudanzas","Armado de muebles","Organización del hogar","Embalaje","Instalación de estanterías","Decoración de interiores"],
  },
  {
    id: "tech", name: "Tecnología y digital", bg: "#FAECE7", tokenVar: "--cat-tech", icon: Laptop,
    services: ["Reparación de PC","Instalación de red/WiFi","Instalación de cámaras","Soporte impresoras","Reparación celulares","Clases de computación"],
  },
  {
    id: "events", name: "Eventos y fotografía", bg: "#EAF3DE", tokenVar: "--cat-events", icon: Camera,
    services: ["Fotógrafo","Videógrafo","Decorador de eventos","Chef a domicilio","DJ/sonido","Repostería"],
  },
];

export interface Review { author: string; rating: number; text: string; date: string; }

export interface Provider {
  id: string;
  name: string;
  avatarSeed: number;
  category: CategoryId;
  services: { name: string; price: number }[];
  rating: number;
  reviewsCount: number;
  pricePerHour: number;
  distanceKm: number;
  availability: string;
  bio: string;
  gallery: string[];
  reviews: Review[];
}

const firstNames = ["Camila","Javiera","Matías","Constanza","Felipe","Antonia","Diego","Valentina","Cristóbal","Fernanda","Ignacio","Sofía","Tomás","Martina","Benjamín","Isidora","Vicente","Catalina","Joaquín","Florencia","Sebastián","Maite","Andrés","Renata"];
const lastNames = ["González","Muñoz","Rojas","Díaz","Pérez","Soto","Contreras","Silva","Martínez","Sepúlveda","Morales","Rodríguez","López","Fuentes","Hernández","Torres","Araya","Castro","Álvarez","Espinoza"];

const sampleReviews = [
  "Excelente trabajo, muy puntual y profesional.",
  "Recomendado 100%, súper amable y prolijo.",
  "Quedé encantada con el resultado, volveré a contratar.",
  "Muy buena atención, dejó todo impecable.",
  "Llegó a la hora exacta y trabajó muy rápido.",
  "Cumplió con todo lo acordado, súper recomendado.",
  "Trato muy cálido y resultado de calidad.",
];

const galleryPool = [
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600",
  "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600",
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
];

const availabilityPool = ["Disponible ahora","Disponible hoy","Disponible mañana","Disponible esta semana"];

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function buildProviders(): Provider[] {
  const out: Provider[] = [];
  let avatar = 1;
  let seed = 1;
  for (const cat of categories) {
    const rand = seededRand(seed++);
    for (let i = 0; i < 4; i++) {
      const fn = firstNames[Math.floor(rand() * firstNames.length)];
      const ln = lastNames[Math.floor(rand() * lastNames.length)];
      const rating = +(4 + rand()).toFixed(1) > 5 ? 5.0 : +(4 + rand()).toFixed(1);
      const priceBase = 8000 + Math.floor(rand() * 35) * 1000;
      const offered = cat.services
        .slice()
        .sort(() => rand() - 0.5)
        .slice(0, 3 + Math.floor(rand() * 3))
        .map((s) => ({ name: s, price: 8000 + Math.floor(rand() * 40) * 1000 }));
      const reviewsCount = 12 + Math.floor(rand() * 220);
      out.push({
        id: `${cat.id}-${i + 1}`,
        name: `${fn} ${ln}`,
        avatarSeed: ((avatar++ - 1) % 70) + 1,
        category: cat.id,
        services: offered,
        rating,
        reviewsCount,
        pricePerHour: priceBase,
        distanceKm: +(0.3 + rand() * 8).toFixed(1),
        availability: availabilityPool[Math.floor(rand() * availabilityPool.length)],
        bio: `Profesional con más de ${2 + Math.floor(rand() * 12)} años de experiencia en ${cat.name.toLowerCase()}. Servicio puntual, prolijo y con todos los materiales incluidos. Atención en toda la región metropolitana.`,
        gallery: galleryPool.slice().sort(() => rand() - 0.5).slice(0, 4),
        reviews: Array.from({ length: 4 }).map(() => ({
          author: `${firstNames[Math.floor(rand() * firstNames.length)]} ${lastNames[Math.floor(rand() * lastNames.length)][0]}.`,
          rating: 4 + Math.round(rand()),
          text: sampleReviews[Math.floor(rand() * sampleReviews.length)],
          date: `${1 + Math.floor(rand() * 11)} sem atrás`,
        })),
      });
    }
  }
  return out;
}

export const providers: Provider[] = buildProviders();

export function getCategory(id: string) { return categories.find((c) => c.id === id); }
export function getCategoryByService(service: string) {
  return categories.find((c) => c.services.includes(service));
}
export function getProvidersForService(service: string) {
  const cat = getCategoryByService(service);
  if (!cat) return [];
  return providers.filter((p) => p.category === cat.id);
}
export function getProvider(id: string) { return providers.find((p) => p.id === id); }
export function formatCLP(n: number) {
  return "$" + n.toLocaleString("es-CL");
}
