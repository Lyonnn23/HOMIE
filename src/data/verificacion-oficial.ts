import type { CategoryId } from "./services";

/**
 * Fuentes oficiales para que el admin verifique credenciales de un profesional
 * antes de aprobar. Solo dominios de primer nivel (sin URLs profundas que cambian).
 */
export interface FuenteOficial {
  label: string;
  url: string;
  instruccion: string;
}

const SEC: FuenteOficial = {
  label: "SEC · Consulta de instaladores autorizados",
  url: "https://www.sec.cl/",
  instruccion: "Instaladores eléctricos y de gas: buscar por RUT en el registro de instaladores autorizados.",
};
const SUPERSALUD: FuenteOficial = {
  label: "Superintendencia de Salud · Registro de prestadores",
  url: "https://www.superdesalud.gob.cl/",
  instruccion: "Buscar por RUT en el Registro Nacional de Prestadores Individuales de Salud.",
};
const PJUD: FuenteOficial = {
  label: "Poder Judicial · Consulta de abogados / títulos",
  url: "https://www.pjud.cl/",
  instruccion: "Verificar que el título de abogado esté vigente (consulta de títulos de la Corte Suprema).",
};
const REGCIVIL_MENORES: FuenteOficial = {
  label: "Registro Civil · Inhabilidades para trabajar con menores",
  url: "https://www.registrocivil.cl/",
  instruccion: "Consultar por RUT que no tenga inhabilidad para trabajar con niños, niñas o adolescentes.",
};
const CONTACH: FuenteOficial = {
  label: "Colegio de Contadores de Chile",
  url: "https://www.contach.cl/",
  instruccion: "Verificar colegiatura o registro del contador por nombre/RUT.",
};
const ARQUITECTOS: FuenteOficial = {
  label: "Colegio de Arquitectos de Chile",
  url: "https://colegioarquitectos.com/",
  instruccion: "Verificar registro del arquitecto si el certificado lo indica.",
};
const INGENIEROS: FuenteOficial = {
  label: "Colegio de Ingenieros de Chile",
  url: "https://www.ingenieros.cl/",
  instruccion: "Verificar registro del ingeniero si el certificado lo indica.",
};
const LICENCIA: FuenteOficial = {
  label: "Licencia de conducir",
  url: "https://www.registrocivil.cl/",
  instruccion: "Verificar físicamente la licencia de conducir vigente (clase acorde al servicio); el Registro Civil emite el certificado de hoja de vida del conductor.",
};
const ANTECEDENTES: FuenteOficial = {
  label: "Registro Civil · Certificado de antecedentes",
  url: "https://www.registrocivil.cl/",
  instruccion: "Lo entrega el postulante. Comprobar que sea reciente (menos de 60 días) y sin anotaciones.",
};

const POR_CATEGORIA: Partial<Record<CategoryId, FuenteOficial[]>> = {
  "tech-fix": [SEC],
  "salud-pro": [SUPERSALUD],
  health: [SUPERSALUD],
  care: [SUPERSALUD, REGCIVIL_MENORES],
  legal: [PJUD],
  educacion: [REGCIVIL_MENORES],
  finanzas: [CONTACH],
  ingenieria: [ARQUITECTOS, INGENIEROS],
  auto: [LICENCIA],
  moving: [LICENCIA],
};

/** Lista de fuentes oficiales para la categoría (siempre incluye antecedentes). */
export function fuentesOficialesDe(categoriaId: string | null | undefined): FuenteOficial[] {
  const especificas = (categoriaId && POR_CATEGORIA[categoriaId as CategoryId]) || [];
  return [...especificas, ANTECEDENTES];
}
