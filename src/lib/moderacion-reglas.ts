/** Rules shared with the applied language/contact protection in the database. */
export const PALABRAS_BLOQUEADAS = [
  "ctm", "conchetumare", "conchatumadre", "culiao", "culiá", "culia", "culiado", "weon", "weón", "hueon", "huevón",
  "maricon", "maricón", "puta", "puto", "mierda", "imbecil", "imbécil", "estupido", "estúpido", "idiota",
  "pendejo", "cabron", "cabrón", "chucha", "reculiao", "aweonao", "aweonado", "saco de", "hijo de puta",
  "negro de mierda", "flaite", "perra", "zorra", "cornudo", "retrasado", "mongolico", "mongólico",
];

function sinAcentos(texto: string): string {
  return texto.replace(/[áéíóúÁÉÍÓÚüÜ]/g, (c) => "aeiouAEIOUuU"["áéíóúÁÉÍÓÚüÜ".indexOf(c)] ?? c);
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const REGEX_OFENSIVO = new RegExp(
  "(^|[^\\p{L}\\p{N}_])(" + PALABRAS_BLOQUEADAS.map((p) => escapeRegex(sinAcentos(p))).join("|") + ")(?=$|[^\\p{L}\\p{N}_])",
  "iu",
);

const REGEX_CONTACTO =
  /(\+?56\s?9\s?\d{4}\s?\d{4}|\b9\s?\d{4}\s?\d{4}\b|\b\d{8,9}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|wa\.me|whatsapp|instagram\.com|@[a-z0-9_.]{4,}|transferencia (por )?fuera|fuera de (la )?app|sin la app|te lo dejo m[aá]s barato por fuera|por fuera)/i;

export function contieneOfensivo(texto: string): boolean {
  return REGEX_OFENSIVO.test(sinAcentos(texto));
}

export function contieneContacto(texto: string): boolean {
  return REGEX_CONTACTO.test(texto);
}