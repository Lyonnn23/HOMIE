import type { Idioma } from "@/i18n";

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
    a: "Para ti, nada: pagas exactamente el precio del profesional, sin recargos. Homie cobra al profesional una comisión solo sobre servicios completados (gratis sus primeros 3 meses).",
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
    a: "Gratis los primeros 3 meses desde tu verificación. Después, 15% por servicio completado, 12% con Homie Premium. Sin costo por publicar y sin cobro por servicios cancelados. El cliente siempre paga exactamente tu precio.",
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

const FAQ_CLIENTES_EN: FaqItem[] = [
  {
    q: "How do you verify professionals?",
    a: "Before their profile is published, every professional sends their national ID, a selfie to confirm it's the same person, their background check and a certificate or degree for the trade they work in. Our team reviews the documents by hand. Only approved profiles appear on Homie.",
  },
  {
    q: "What if the professional wants to charge more?",
    a: "They can't. Every service has a starting price and a maximum price the professional sets in advance. You pay the starting price when you book. If on arrival the job needs more, they tell you before starting and the total never exceeds the maximum price. If you disagree, you can cancel at no cost.",
  },
  {
    q: "When does the professional receive the money?",
    a: "Your payment is held by Mercado Pago. It's released to the professional only when you confirm the service was completed. If you neither confirm nor file a claim within 72 hours, it's released automatically.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes. If you cancel more than 24 hours in advance, the refund is full. With less than 24 hours, 10% is kept to compensate the professional's blocked time. If the professional cancels or doesn't show up, the refund is always 100%.",
  },
  {
    q: "How much does Homie charge?",
    a: "For you, nothing: you pay exactly the professional's price, no surcharges. Homie charges the professional a fee only on completed services (free for their first 3 months).",
  },
  {
    q: "What if something goes wrong?",
    a: "Open a claim from the booking. While it's open, the payment stays held. Homie's team reviews the case with both parties and resolves it within 5 business days: full refund, partial refund or release of the payment.",
  },
];

const FAQ_PROFESIONALES_EN: FaqItem[] = [
  {
    q: "What do I need to sign up?",
    a: "A valid national ID, a background check, a certificate or degree proving your trade and a profile photo. Review takes 24 to 48 business hours.",
  },
  {
    q: "How does the price range work?",
    a: "For each service you set a starting price and a maximum price. The maximum can't exceed 1.5 times the starting price. The customer pays the starting price when booking; if the job needs more, you agree on it before starting, within the range.",
  },
  {
    q: "When do I get paid?",
    a: "Mercado Pago holds the customer's payment until they confirm the service was completed, or 72 hours later if they don't respond. Then it's transferred to your account minus Homie's fee.",
  },
  {
    q: "How much does Homie charge?",
    a: "Free for your first 3 months after verification. After that, 15% per completed service, 12% with Homie Premium. No cost to publish and no charge for cancelled services. The customer always pays exactly your price.",
  },
  {
    q: "How do I get more bookings?",
    a: "Profiles with better ratings and fast replies appear first. Keep your calendar up to date, answer quotes the same day and ask your customers to leave a review.",
  },
  {
    q: "What if a customer files a claim?",
    a: "The payment stays held while Homie reviews the case. We ask for your side and evidence (photos, chat). We resolve it within 5 business days and notify you by push and email.",
  },
];

const FAQ_CLIENTES_HT: FaqItem[] = [
  {
    q: "Kijan nou verifye pwofesyonèl yo?",
    a: "Anvan pwofil li pibliye, chak pwofesyonèl voye kat idantite li, yon selfi pou konfime se menm moun nan, kazye jidisyè li ak yon sètifika oswa diplòm nan domèn li travay la. Ekip nou an tcheke dokiman yo manyèlman. Sèlman pwofil ki apwouve yo parèt sou Homie.",
  },
  {
    q: "Kisa k ap pase si pwofesyonèl la vle fè m peye plis?",
    a: "Li pa kapab. Chak sèvis gen yon pri depa ak yon pri maksimòm pwofesyonèl la fikse davans. Ou peye pri depa a lè ou rezève. Si lè li rive travay la mande plis, li di ou sa anvan li kòmanse epi total la pa janm depase pri maksimòm nan. Si ou pa dakò, ou ka anile san frè.",
  },
  {
    q: "Kilè pwofesyonèl la resevwa lajan an?",
    a: "Mercado Pago kenbe peman ou. Li lage bay pwofesyonèl la sèlman lè ou konfime sèvis la fini. Si ou pa konfime ni fè reklamasyon nan 72 èdtan, li lage otomatikman.",
  },
  {
    q: "Èske m ka anile yon rezèvasyon?",
    a: "Wi. Si ou anile plis pase 24 èdtan davans, ranbousman an konplè. Mwens pase 24 èdtan, yo kenbe 10% pou konpanse tan pwofesyonèl la te bloke. Si pwofesyonèl la anile oswa li pa vini, ranbousman an toujou 100%.",
  },
  {
    q: "Konbyen Homie mande?",
    a: "Pou ou, anyen: ou peye egzakteman pri pwofesyonèl la, san frè anplis. Homie mande pwofesyonèl la yon komisyon sèlman sou sèvis ki fini (gratis pandan 3 premye mwa yo).",
  },
  {
    q: "Kisa k ap pase si yon bagay pa mache?",
    a: "Louvri yon reklamasyon depi nan rezèvasyon an. Pandan li louvri, peman an rete bloke. Ekip Homie a gade ka a ak tou de pati yo epi rezoud li nan 5 jou ouvrab maksimòm: ranbousman total, pasyèl oswa lage peman an.",
  },
];

const FAQ_PROFESIONALES_HT: FaqItem[] = [
  {
    q: "Kisa m bezwen pou m enskri?",
    a: "Kat idantite valab, kazye jidisyè, yon sètifika oswa diplòm ki pwouve domèn ou ak yon foto pwofil. Revizyon an pran ant 24 ak 48 èdtan ouvrab.",
  },
  {
    q: "Kijan ran pri a mache?",
    a: "Pou chak sèvis ou defini yon pri depa ak yon pri maksimòm. Maksimòm nan pa ka depase 1,5 fwa pri depa a. Kliyan an peye pri depa a lè li rezève; si travay la mande plis, ou dakò sou sa anvan ou kòmanse, nan limit ran an.",
  },
  {
    q: "Kilè m resevwa peman mwen?",
    a: "Mercado Pago kenbe peman kliyan an jiskaske li konfime sèvis la fini, oswa 72 èdtan apre si li pa reponn. Apre sa li transfere sou kont ou apre yo retire komisyon Homie a.",
  },
  {
    q: "Konbyen Homie mande?",
    a: "Gratis pandan 3 premye mwa apre verifikasyon ou. Apre sa, 15% pa sèvis fini, 12% ak Homie Premium. Pa gen frè pou pibliye ni pou sèvis anile. Kliyan an toujou peye egzakteman pri ou.",
  },
  {
    q: "Kijan m ka jwenn plis rezèvasyon?",
    a: "Pwofil ki gen pi bon nòt ak repons rapid parèt an premye. Kenbe ajanda ou ajou, reponn devi yo menm jou a epi mande kliyan ou yo kite yon avi.",
  },
  {
    q: "Kisa k ap pase si yon kliyan fè reklamasyon?",
    a: "Peman an rete bloke pandan Homie ap gade ka a. Nou mande vèsyon ou ak prèv (foto, chat). Nou rezoud li nan 5 jou ouvrab maksimòm epi nou avèti ou pa notifikasyon ak imèl.",
  },
];

const FAQ_CLIENTES_PT: FaqItem[] = [
  {
    q: "Como vocês verificam os profissionais?",
    a: "Antes de publicar o perfil, cada profissional envia seu documento de identidade, uma selfie para comprovar que é a mesma pessoa, sua certidão de antecedentes e um certificado ou diploma da área em que trabalha. Nossa equipe revisa os documentos manualmente. Só os perfis aprovados aparecem na Homie.",
  },
  {
    q: "E se o profissional quiser cobrar mais?",
    a: "Não pode. Cada serviço tem um preço inicial e um preço máximo que o profissional define antes. Você paga o preço inicial ao reservar. Se ao chegar o serviço precisar de mais, ele avisa antes de começar e o total nunca passa do preço máximo. Se não concordar, você pode cancelar sem custo.",
  },
  {
    q: "Quando o profissional recebe o dinheiro?",
    a: "Seu pagamento fica retido no Mercado Pago. É liberado ao profissional só quando você confirma que o serviço foi concluído. Se você não confirmar nem reclamar em 72 horas, é liberado automaticamente.",
  },
  {
    q: "Posso cancelar uma reserva?",
    a: "Sim. Se cancelar com mais de 24 horas de antecedência, o reembolso é total. Com menos de 24 horas, 10% fica retido para compensar o tempo bloqueado do profissional. Se o profissional cancelar ou não aparecer, o reembolso é sempre de 100%.",
  },
  {
    q: "Quanto a Homie cobra?",
    a: "Para você, nada: você paga exatamente o preço do profissional, sem acréscimos. A Homie cobra do profissional uma comissão só sobre serviços concluídos (grátis nos primeiros 3 meses).",
  },
  {
    q: "E se algo der errado?",
    a: "Abra uma reclamação pela reserva. Enquanto estiver aberta, o pagamento segue retido. A equipe da Homie analisa o caso com as duas partes e resolve em até 5 dias úteis: reembolso total, parcial ou liberação do pagamento.",
  },
];

const FAQ_PROFESIONALES_PT: FaqItem[] = [
  {
    q: "O que preciso para me cadastrar?",
    a: "Documento de identidade válido, certidão de antecedentes, um certificado ou diploma que comprove sua área e uma foto de perfil. A revisão leva de 24 a 48 horas úteis.",
  },
  {
    q: "Como funciona a faixa de preço?",
    a: "Para cada serviço você define um preço inicial e um preço máximo. O máximo não pode passar de 1,5 vez o inicial. O cliente paga o inicial ao reservar; se o serviço precisar de mais, você combina antes de começar, dentro da faixa.",
  },
  {
    q: "Quando recebo meu pagamento?",
    a: "O Mercado Pago retém o pagamento do cliente até ele confirmar que o serviço foi concluído, ou 72 horas depois se ele não responder. Depois é transferido para sua conta descontando a comissão da Homie.",
  },
  {
    q: "Quanto a Homie cobra?",
    a: "Grátis nos primeiros 3 meses após a verificação. Depois, 15% por serviço concluído, 12% com Homie Premium. Sem custo para publicar e sem cobrança por serviços cancelados. O cliente sempre paga exatamente o seu preço.",
  },
  {
    q: "Como consigo mais reservas?",
    a: "Os perfis com melhores avaliações e respostas rápidas aparecem primeiro. Mantenha sua agenda em dia, responda orçamentos no mesmo dia e peça aos clientes que deixem avaliação.",
  },
  {
    q: "E se um cliente reclamar?",
    a: "O pagamento fica retido enquanto a Homie analisa o caso. Pedimos sua versão e evidências (fotos, chat). Resolvemos em até 5 dias úteis e avisamos por notificação e e-mail.",
  },
];

export const FAQ_CLIENTES_BY_LANG: Record<Idioma, FaqItem[]> = {
  es: FAQ_CLIENTES, en: FAQ_CLIENTES_EN, ht: FAQ_CLIENTES_HT, pt: FAQ_CLIENTES_PT,
};
export const FAQ_PROFESIONALES_BY_LANG: Record<Idioma, FaqItem[]> = {
  es: FAQ_PROFESIONALES, en: FAQ_PROFESIONALES_EN, ht: FAQ_PROFESIONALES_HT, pt: FAQ_PROFESIONALES_PT,
};
