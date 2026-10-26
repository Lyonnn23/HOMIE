/** Mapea un estado de reserva (valor de BD) a su clave i18n "estado.*". */
export function claveEstado(estado: string): string {
  switch (estado) {
    case "pendiente": return "estado.pendiente";
    case "confirmada": return "estado.confirmada";
    case "en camino": return "estado.enCamino";
    case "completado":
    case "completada": return "estado.completada";
    case "cancelada": return "estado.cancelada";
    default: return estado;
  }
}

/** Locale para fechas según idioma. */
export function localeDe(idioma: string): string {
  return idioma === "en" ? "en-US" : idioma === "ht" ? "fr-HT" : idioma === "pt" ? "pt-BR" : "es-CL";
}
