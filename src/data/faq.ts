/** Preguntas frecuentes compartidas entre la portada y /como-funciona. */
export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_CLIENTES: FaqItem[] = [
  {
    q: "¿Cómo verifican a los profesionales?",
    a: "Antes de publicar su perfil, cada profesional envía su cédula de identidad, una selfie para comprobar que es la misma persona, su certificado de antecedentes y un certificado o título del rubro en que trabaja. Nuestro equipo revisa los documentos a mano. Solo los perfiles aprobados aparecen en Homie.",
  },
  {
    q: "¿Qué pasa si el profesional quiere cobrar más?",
    a: "No puede. Cada servicio tiene un precio desde y un precio hasta que el profesional fija antes. Tú pagas el precio desde al reservar. Si al llegar el trabajo requiere más, te lo dice antes de empezar y el total nunca supera el precio hasta. Si no estás de acuerdo, puedes cancelar sin costo.",
  },
  {
    q: "¿Cuándo recibe el dinero el profesional?",
    a: "Tu pago queda retenido por Mercado Pago. Se libera al profesional solo cuando confirmas que el servicio se completó. Si no confirmas ni reclamas dentro de 72 horas, se libera automáticamente.",
  },
  {
    q: "¿Puedo cancelar una reserva?",
    a: "Sí. Si cancelas con más de 24 horas de anticipación, el reembolso es completo. Con menos de 24 horas, se retiene un 10% para compensar el tiempo bloqueado del profesional. Si el profesional cancela o no llega, el reembolso siempre es del 100%.",
  },
  {
    q: "¿Cuánto cobra Homie?",
    a: "Para ti, nada. El precio que ves es el precio que pagas. Homie cobra al profesional una comisión del 15% solo sobre servicios completados.",
  },
  {
    q: "¿Qué pasa si algo sale mal?",
    a: "Abre un reclamo desde la reserva. Mientras está abierto, el pago sigue retenido. El equipo de Homie revisa el caso con ambas partes y resuelve en un plazo máximo de 5 días hábiles: reembolso total, parcial o liberación del pago.",
  },
];

export const FAQ_PROFESIONALES: FaqItem[] = [
  {
    q: "¿Qué necesito para registrarme?",
    a: "Cédula de identidad vigente, certificado de antecedentes, un certificado o título que acredite tu rubro y una foto de perfil. La revisión toma entre 24 y 48 horas hábiles.",
  },
  {
    q: "¿Cómo funciona el rango de precio?",
    a: "Para cada servicio defines un precio desde y un precio hasta. El hasta no puede superar 1,5 veces el desde. El cliente paga el desde al reservar; si el trabajo requiere más, lo acuerdas antes de empezar dentro del rango.",
  },
  {
    q: "¿Cuándo recibo mi pago?",
    a: "Mercado Pago retiene el pago del cliente hasta que confirma que el servicio se completó, o 72 horas después si no responde. Luego se transfiere a tu cuenta descontando la comisión de Homie.",
  },
  {
    q: "¿Cuánto cobra Homie?",
    a: "Una comisión del 15% sobre cada servicio completado. Sin mensualidad, sin costo por publicar y sin cobro por servicios cancelados.",
  },
  {
    q: "¿Cómo consigo más reservas?",
    a: "Los perfiles con mejores calificaciones y respuestas rápidas aparecen primero. Mantén tu agenda al día, responde cotizaciones el mismo día y pide a tus clientes que dejen reseña.",
  },
  {
    q: "¿Qué pasa si un cliente reclama?",
    a: "El pago queda retenido mientras Homie revisa el caso. Te pedimos tu versión y evidencia (fotos, chat). Resolvemos en máximo 5 días hábiles y te avisamos por notificación y correo.",
  },
];
