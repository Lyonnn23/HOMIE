import type { CategoryId } from "./services";

export interface Requisito {
  /** Nombre corto del documento (se usa como "tipo" sugerido). */
  nombre: string;
  /** Dónde lo obtiene el profesional. */
  donde: string;
  /** Si es obligatorio para esa categoría (el admin lo revisa). */
  obligatorio: boolean;
}

export interface RequisitosCategoria {
  titulo: string;
  intro: string;
  documentos: Requisito[];
}

const BASICO: Requisito = { nombre: "Título técnico, diploma o certificado de curso", donde: "Instituto, OTEC o centro de formación donde estudiaste", obligatorio: true };
const EXPERIENCIA: Requisito = { nombre: "Carta de recomendación o certificado laboral", donde: "Empleador o clientes anteriores (con nombre y teléfono de contacto)", obligatorio: false };

export const REQUISITOS: Record<CategoryId, RequisitosCategoria> = {
  // ---------------- Profesionales ----------------
  legal: {
    titulo: "Abogados",
    intro: "En Chile solo puede ejercer quien tiene el título otorgado por la Corte Suprema.",
    documentos: [
      { nombre: "Título de abogado (Corte Suprema)", donde: "Certificado de título en www.pjud.cl o copia del título", obligatorio: true },
      { nombre: "Certificado de vigencia del título", donde: "Poder Judicial (certificado de título vigente)", obligatorio: true },
      { nombre: "Postítulo o diplomado de la especialidad", donde: "Universidad o institución que lo impartió", obligatorio: false },
    ],
  },
  finanzas: {
    titulo: "Contadores y empresas",
    intro: "Acreditamos el título profesional y, si aplica, la inscripción en el Colegio de Contadores.",
    documentos: [
      { nombre: "Título de contador, contador auditor o ingeniero/administrador de empresas", donde: "Universidad o instituto; certificado de título", obligatorio: true },
      { nombre: "Certificado del Colegio de Contadores", donde: "www.contach.cl", obligatorio: false },
      { nombre: "Iniciación de actividades propia ante el SII", donde: "www.sii.cl → Mi SII → Situación tributaria", obligatorio: false },
    ],
  },
  ingenieria: {
    titulo: "Arquitectura e ingeniería",
    intro: "Para firmar planos, regularizaciones o inspecciones se exige título y, en algunos casos, registro oficial.",
    documentos: [
      { nombre: "Título profesional (arquitecto, ingeniero, constructor civil)", donde: "Universidad; certificado de título", obligatorio: true },
      { nombre: "Patente profesional al día", donde: "Municipalidad donde pagas tu patente", obligatorio: false },
      { nombre: "Registro MINVU / SEC / Colegio profesional (según especialidad)", donde: "MINVU (revisores), SEC (eléctricos clase A/B), Colegio de Arquitectos o Ingenieros", obligatorio: false },
    ],
  },
  "salud-pro": {
    titulo: "Salud profesional",
    intro: "Todo prestador de salud debe estar inscrito en el Registro Nacional de Prestadores Individuales de Salud.",
    documentos: [
      { nombre: "Certificado de inscripción en la Superintendencia de Salud", donde: "www.superdesalud.gob.cl → Registro de prestadores individuales", obligatorio: true },
      { nombre: "Título profesional o técnico (enfermera, matrona, kinesiólogo, TENS, etc.)", donde: "Universidad, instituto o CFT", obligatorio: true },
      { nombre: "Especialidad o certificación CONACEM (médicos)", donde: "www.conacem.cl", obligatorio: false },
    ],
  },
  educacion: {
    titulo: "Clases y educación",
    intro: "Pedimos el título o estudios en el área que enseñas. Para trabajar con menores, el certificado de inhabilidades es obligatorio.",
    documentos: [
      { nombre: "Título profesional o certificado de estudios del área", donde: "Universidad o instituto; o certificado de alumno regular", obligatorio: true },
      { nombre: "Certificado de inhabilidades para trabajar con menores", donde: "www.registrocivil.cl (gratuito, en línea)", obligatorio: true },
      { nombre: "Certificado de idioma (inglés u otro) o licencia de instructor (manejo)", donde: "Instituto de idiomas / escuela de conductores", obligatorio: false },
    ],
  },
  // ---------------- Hogar ----------------
  "tech-fix": {
    titulo: "Técnicos y gasfitería",
    intro: "Para instalaciones eléctricas y de gas, la ley exige certificación SEC.",
    documentos: [
      { nombre: "Certificado SEC (instalador eléctrico clase A/B/C/D o instalador de gas)", donde: "www.sec.cl → Instaladores autorizados", obligatorio: true },
      { nombre: "Título técnico o curso del oficio (pintor, cerrajero, climatización)", donde: "Instituto, liceo técnico u OTEC", obligatorio: false },
      EXPERIENCIA,
    ],
  },
  home: {
    titulo: "Hogar y limpieza",
    intro: "Aceptamos cursos de limpieza profesional o experiencia comprobable.",
    documentos: [
      { nombre: "Curso de aseo, limpieza industrial o manejo de productos", donde: "OTEC, SENCE o empresa de capacitación", obligatorio: false },
      { nombre: "Certificado laboral o cartas de recomendación", donde: "Empleadores o clientes anteriores con teléfono de contacto", obligatorio: true },
    ],
  },
  garden: {
    titulo: "Jardín y piscinas",
    intro: "Para piscinas pedimos curso de manejo de químicos; para jardinería, experiencia o curso.",
    documentos: [
      { nombre: "Curso de jardinería, paisajismo o mantención de piscinas", donde: "OTEC, INACAP, SENCE o distribuidor de químicos", obligatorio: false },
      EXPERIENCIA,
      { ...EXPERIENCIA, nombre: "Fotos de trabajos realizados (antes y después)", donde: "Tu propio registro", obligatorio: true },
    ],
  },
  moving: {
    titulo: "Muebles y mudanzas",
    intro: "Pedimos documentos del vehículo y permiso para transporte de carga.",
    documentos: [
      { nombre: "Licencia de conducir vigente (clase B o A según vehículo)", donde: "Municipalidad", obligatorio: true },
      { nombre: "Padrón y revisión técnica del vehículo", donde: "Registro Civil / planta de revisión técnica", obligatorio: true },
      { nombre: "Curso de armado de muebles o carpintería", donde: "OTEC o instituto", obligatorio: false },
    ],
  },
  // ---------------- Belleza y bienestar ----------------
  beauty: {
    titulo: "Belleza y estética",
    intro: "Pedimos certificación del rubro y, para procedimientos invasivos, autorización sanitaria.",
    documentos: [
      { nombre: "Título o certificado de peluquería, manicure, estética o cosmetología", donde: "Instituto o academia de belleza", obligatorio: true },
      { nombre: "Resolución sanitaria o curso de bioseguridad (micropigmentación, pestañas)", donde: "SEREMI de Salud / academia", obligatorio: false },
      { nombre: "Portafolio de trabajos", donde: "Tu propio registro o redes sociales", obligatorio: false },
    ],
  },
  health: {
    titulo: "Salud y bienestar",
    intro: "Entrenadores, masajistas y terapeutas deben acreditar formación.",
    documentos: [
      { nombre: "Título o certificado (preparador físico, masoterapia, yoga, terapias)", donde: "Instituto, escuela de yoga o academia", obligatorio: true },
      { nombre: "Certificado de primeros auxilios o RCP", donde: "Cruz Roja, ACHS o Mutual", obligatorio: false },
    ],
  },
  care: {
    titulo: "Cuidado y asesoría",
    intro: "Trabajarás con niños o adultos mayores: el certificado de inhabilidades es obligatorio.",
    documentos: [
      { nombre: "Certificado de inhabilidades para trabajar con menores", donde: "www.registrocivil.cl (gratuito, en línea)", obligatorio: true },
      { nombre: "Curso de cuidado infantil, de adulto mayor o primeros auxilios", donde: "OTEC, SENCE, Cruz Roja", obligatorio: false },
      { ...EXPERIENCIA, obligatorio: true },
    ],
  },
  // ---------------- Otros ----------------
  pets: {
    titulo: "Mascotas",
    intro: "Veterinarios deben estar titulados; paseadores y peluqueros, con curso o experiencia.",
    documentos: [
      { nombre: "Título de médico veterinario (solo para servicios veterinarios)", donde: "Universidad; certificado de título", obligatorio: false },
      { nombre: "Curso de peluquería canina, adiestramiento o manejo animal", donde: "Academia o OTEC", obligatorio: false },
      { ...EXPERIENCIA, obligatorio: true },
    ],
  },
  auto: {
    titulo: "Automotriz a domicilio",
    intro: "Pedimos formación mecánica y licencia de conducir.",
    documentos: [
      { nombre: "Título técnico en mecánica automotriz o curso certificado", donde: "Liceo técnico, INACAP, DUOC u OTEC", obligatorio: true },
      { nombre: "Licencia de conducir vigente", donde: "Municipalidad", obligatorio: true },
    ],
  },
  tech: {
    titulo: "Tecnología y digital",
    intro: "Aceptamos título técnico, certificaciones (CCNA, CompTIA, etc.) o curso.",
    documentos: [BASICO, { nombre: "Certificación técnica (Cisco, Microsoft, CompTIA, fabricante de cámaras)", donde: "Entidad certificadora", obligatorio: false }],
  },
  events: {
    titulo: "Eventos y fotografía",
    intro: "Pedimos portafolio y, si corresponde, estudios del área.",
    documentos: [
      { nombre: "Portafolio de trabajos (fotos, video, decoraciones, platos)", donde: "Tu propio registro, web o redes", obligatorio: true },
      { nombre: "Título o curso (fotografía, gastronomía, producción de eventos)", donde: "Instituto o academia", obligatorio: false },
      { nombre: "Resolución sanitaria (chef, repostería)", donde: "SEREMI de Salud", obligatorio: false },
    ],
  },
  party: {
    titulo: "Fiestas y diversión",
    intro: "Para inflables y food trucks pedimos seguro y permisos; para animación, inhabilidades.",
    documentos: [
      { nombre: "Certificado de inhabilidades para trabajar con menores (animadores)", donde: "www.registrocivil.cl", obligatorio: false },
      { nombre: "Resolución sanitaria y patente (food truck, bartender, algodón)", donde: "SEREMI de Salud / Municipalidad", obligatorio: false },
      { nombre: "Portafolio o fotos de eventos realizados", donde: "Tu propio registro", obligatorio: true },
    ],
  },
  gifts: {
    titulo: "Regalos y sorpresas",
    intro: "Pedimos iniciación de actividades y, para alimentos, resolución sanitaria.",
    documentos: [
      { nombre: "Iniciación de actividades ante el SII", donde: "www.sii.cl", obligatorio: true },
      { nombre: "Resolución sanitaria (desayunos, alimentos)", donde: "SEREMI de Salud", obligatorio: false },
      { nombre: "Portafolio de productos", donde: "Tu propio registro o redes", obligatorio: false },
    ],
  },
};

export function requisitosDe(categoriaId: string | null | undefined): RequisitosCategoria {
  return (categoriaId && REQUISITOS[categoriaId as CategoryId]) || {
    titulo: "Tu rubro",
    intro: "Sube el documento que acredite tus estudios o experiencia.",
    documentos: [BASICO, EXPERIENCIA],
  };
}
