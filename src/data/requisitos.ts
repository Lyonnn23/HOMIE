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

const DEFAULT_ES: RequisitosCategoria = {
  titulo: "Tu rubro",
  intro: "Sube el documento que acredite tus estudios o experiencia.",
  documentos: [BASICO, EXPERIENCIA],
};

/**
 * Traducciones de `titulo` e `intro` por categoría (en / ht / pt).
 * Los nombres de documentos y el campo `donde` se mantienen en español porque son
 * documentos e instituciones chilenas (la UI lo indica como "documento chileno").
 */
type Trad = Record<string, { titulo: string; intro: string }>;
const TRAD: Record<"en" | "ht" | "pt", Trad> = {
  en: {
    _default: { titulo: "Your trade", intro: "Upload the document that proves your studies or experience." },
    legal: { titulo: "Lawyers", intro: "In Chile only those holding the degree granted by the Supreme Court may practice." },
    finanzas: { titulo: "Accountants and business", intro: "We verify the professional degree and, if applicable, registration with the Accountants' Association." },
    ingenieria: { titulo: "Architecture and engineering", intro: "Signing plans, regularizations or inspections requires a degree and, in some cases, official registration." },
    "salud-pro": { titulo: "Health professionals", intro: "Every health provider must be listed in the National Registry of Individual Health Providers." },
    educacion: { titulo: "Classes and education", intro: "We ask for a degree or studies in the area you teach. To work with minors, the disqualification certificate is mandatory." },
    "tech-fix": { titulo: "Technicians and plumbing", intro: "For electrical and gas installations, the law requires SEC certification." },
    home: { titulo: "Home and cleaning", intro: "We accept professional cleaning courses or verifiable experience." },
    garden: { titulo: "Garden and pools", intro: "For pools we ask for a chemical-handling course; for gardening, experience or a course." },
    moving: { titulo: "Furniture and moving", intro: "We ask for vehicle documents and a cargo transport permit." },
    beauty: { titulo: "Beauty and aesthetics", intro: "We ask for trade certification and, for invasive procedures, health authorization." },
    health: { titulo: "Health and wellness", intro: "Trainers, masseurs and therapists must prove their training." },
    care: { titulo: "Care and advice", intro: "You'll work with children or seniors: the disqualification certificate is mandatory." },
    pets: { titulo: "Pets", intro: "Veterinarians must hold a degree; walkers and groomers, a course or experience." },
    auto: { titulo: "Mobile automotive", intro: "We ask for mechanical training and a driver's license." },
    tech: { titulo: "Technology and digital", intro: "We accept a technical degree, certifications (CCNA, CompTIA, etc.) or a course." },
    events: { titulo: "Events and photography", intro: "We ask for a portfolio and, if applicable, studies in the area." },
    party: { titulo: "Parties and fun", intro: "For inflatables and food trucks we ask for insurance and permits; for entertainers, the disqualification certificate." },
    gifts: { titulo: "Gifts and surprises", intro: "We ask for tax registration and, for food, health authorization." },
  },
  ht: {
    _default: { titulo: "Metye ou", intro: "Telechaje dokiman ki pwouve etid oswa eksperyans ou." },
    legal: { titulo: "Avoka", intro: "Nan Chili sèlman moun ki gen tit Kou Siprèm nan bay la ka pratike." },
    finanzas: { titulo: "Kontab ak antrepriz", intro: "Nou verifye tit pwofesyonèl la epi, si sa aplikab, enskripsyon nan Kolèj Kontab yo." },
    ingenieria: { titulo: "Achitekti ak jeni", intro: "Pou siyen plan, regilarizasyon oswa enspeksyon yo mande tit epi, nan kèk ka, anrejistreman ofisyèl." },
    "salud-pro": { titulo: "Sante pwofesyonèl", intro: "Tout pwofesyonèl sante dwe enskri nan Rejis Nasyonal Pwofesyonèl Sante Endividyèl yo." },
    educacion: { titulo: "Klas ak edikasyon", intro: "Nou mande tit oswa etid nan domèn ou anseye a. Pou travay ak timoun minè, sètifika enkapasite a obligatwa." },
    "tech-fix": { titulo: "Teknisyen ak plonbri", intro: "Pou enstalasyon elektrik ak gaz, lalwa egzije sètifikasyon SEC." },
    home: { titulo: "Kay ak netwayaj", intro: "Nou aksepte kou netwayaj pwofesyonèl oswa eksperyans ki ka verifye." },
    garden: { titulo: "Jaden ak pisin", intro: "Pou pisin nou mande kou manyen pwodui chimik; pou jadinaj, eksperyans oswa kou." },
    moving: { titulo: "Mèb ak demenajman", intro: "Nou mande dokiman machin nan ak pèmi pou transpò chajman." },
    beauty: { titulo: "Bote ak estetik", intro: "Nou mande sètifikasyon metye a epi, pou pwosedi envazif, otorizasyon sanitè." },
    health: { titulo: "Sante ak byennèt", intro: "Antrenè, masè ak terapet dwe pwouve fòmasyon yo." },
    care: { titulo: "Swen ak konsèy", intro: "W ap travay ak timoun oswa granmoun aje: sètifika enkapasite a obligatwa." },
    pets: { titulo: "Bèt kay", intro: "Veterinè dwe gen diplòm; moun k ap pwomennen chen ak kwafè bèt, kou oswa eksperyans." },
    auto: { titulo: "Otomobil a domisil", intro: "Nou mande fòmasyon mekanik ak lisans kondwi." },
    tech: { titulo: "Teknoloji ak dijital", intro: "Nou aksepte tit teknik, sètifikasyon (CCNA, CompTIA, elatriye) oswa kou." },
    events: { titulo: "Evènman ak fotografi", intro: "Nou mande pòtfolyo epi, si sa aplikab, etid nan domèn nan." },
    party: { titulo: "Fèt ak amizman", intro: "Pou enflatab ak food truck nou mande asirans ak pèmi; pou animatè, sètifika enkapasite." },
    gifts: { titulo: "Kado ak sipriz", intro: "Nou mande anrejistreman fiskal epi, pou manje, otorizasyon sanitè." },
  },
  pt: {
    _default: { titulo: "Sua área", intro: "Envie o documento que comprove seus estudos ou experiência." },
    legal: { titulo: "Advogados", intro: "No Chile só pode exercer quem tem o título outorgado pela Corte Suprema." },
    finanzas: { titulo: "Contadores e empresas", intro: "Comprovamos o título profissional e, se aplicável, a inscrição no Colégio de Contadores." },
    ingenieria: { titulo: "Arquitetura e engenharia", intro: "Para assinar plantas, regularizações ou inspeções exige-se título e, em alguns casos, registro oficial." },
    "salud-pro": { titulo: "Saúde profissional", intro: "Todo prestador de saúde deve estar inscrito no Registro Nacional de Prestadores Individuais de Saúde." },
    educacion: { titulo: "Aulas e educação", intro: "Pedimos o título ou estudos na área que ensina. Para trabalhar com menores, o certificado de inabilidades é obrigatório." },
    "tech-fix": { titulo: "Técnicos e encanamento", intro: "Para instalações elétricas e de gás, a lei exige certificação SEC." },
    home: { titulo: "Casa e limpeza", intro: "Aceitamos cursos de limpeza profissional ou experiência comprovável." },
    garden: { titulo: "Jardim e piscinas", intro: "Para piscinas pedimos curso de manejo de químicos; para jardinagem, experiência ou curso." },
    moving: { titulo: "Móveis e mudanças", intro: "Pedimos documentos do veículo e permissão para transporte de carga." },
    beauty: { titulo: "Beleza e estética", intro: "Pedimos certificação da área e, para procedimentos invasivos, autorização sanitária." },
    health: { titulo: "Saúde e bem-estar", intro: "Personal trainers, massagistas e terapeutas devem comprovar formação." },
    care: { titulo: "Cuidado e assessoria", intro: "Você trabalhará com crianças ou idosos: o certificado de inabilidades é obrigatório." },
    pets: { titulo: "Pets", intro: "Veterinários devem ter diploma; passeadores e tosadores, curso ou experiência." },
    auto: { titulo: "Automotivo a domicílio", intro: "Pedimos formação mecânica e carteira de motorista." },
    tech: { titulo: "Tecnologia e digital", intro: "Aceitamos título técnico, certificações (CCNA, CompTIA, etc.) ou curso." },
    events: { titulo: "Eventos e fotografia", intro: "Pedimos portfólio e, se aplicável, estudos da área." },
    party: { titulo: "Festas e diversão", intro: "Para infláveis e food trucks pedimos seguro e licenças; para animação, certificado de inabilidades." },
    gifts: { titulo: "Presentes e surpresas", intro: "Pedimos registro fiscal e, para alimentos, autorização sanitária." },
  },
};

/**
 * Requisitos de una categoría. Con `idioma` (en/ht/pt) devuelve `titulo` e `intro` traducidos;
 * los nombres de documentos y `donde` quedan en español (documentos chilenos).
 */
export function requisitosDe(categoriaId: string | null | undefined, idioma?: string): RequisitosCategoria {
  const base = (categoriaId && REQUISITOS[categoriaId as CategoryId]) || DEFAULT_ES;
  const trad = idioma && idioma !== "es" ? TRAD[idioma as "en" | "ht" | "pt"] : undefined;
  if (!trad) return base;
  const tr = (categoriaId && trad[categoriaId]) || (base === DEFAULT_ES ? trad._default : undefined);
  return tr ? { ...base, titulo: tr.titulo, intro: tr.intro } : base;
}
