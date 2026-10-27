/**
 * Moderación de texto (chat, reseñas, solicitudes, cotizaciones).
 *
 * 1) Reglas locales, sin red: lenguaje ofensivo (misma lista que `palabras_bloqueadas`),
 *    fuga de datos de contacto (solo en chat sin pago) y heurísticas de spam en reseñas.
 * 2) Opcional: si existe ANTHROPIC_API_KEY, clasificación con Claude (claude-haiku-4-5).
 *    Ante cualquier error de la API se permite el texto (fail open) y se registra en consola.
 *
 * El historial persistente requiere la migración de moderacion_eventos todavía pendiente.
 * Los bloqueos siguen activos sin almacenar textos personales en los logs.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contieneContacto, contieneOfensivo } from "@/lib/moderacion-reglas";

export type OrigenModeracion = "chat" | "resena" | "respuesta" | "solicitud" | "cotizacion";

export interface ResultadoModeracion {
  ok: boolean;
  motivo?: string;
  mensaje?: string;
}

const inputSchema = z.object({
  texto: z.string().max(5000),
  origen: z.enum(["chat", "resena", "respuesta", "solicitud", "cotizacion"]),
  reservaId: z.string().uuid().optional(),
});

const MENSAJES: Record<string, string> = {
  ofensivo: "Tu mensaje contiene lenguaje ofensivo. Por favor, escríbelo con respeto.",
  contacto_sin_pago: "Por tu seguridad, los datos de contacto se comparten cuando la reserva está pagada. El pago queda protegido por Homie.",
  resena_corta: "Tu reseña es muy corta. Cuéntanos un poco más de tu experiencia.",
  resena_url: "Las reseñas no pueden incluir enlaces.",
  resena_duplicada: "Ya publicaste una reseña con el mismo texto hace poco. Escribe una reseña distinta para este servicio.",
  ia_ofensivo: "Tu mensaje contiene lenguaje ofensivo. Por favor, escríbelo con respeto.",
  ia_contacto: "Por tu seguridad, los datos de contacto se comparten dentro de Homie una vez pagada la reserva.",
  ia_spam: "Tu mensaje parece publicidad o spam. Escribe algo relacionado con el servicio.",
  ia_amenaza: "Tu mensaje contiene amenazas o intimidación. Homie no permite este tipo de contenido.",
};

const REGEX_URL = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|cl|net|org|io|app|me)(\/|\b))/i;

interface ClasificacionIA {
  ofensivo?: boolean;
  contacto?: boolean;
  spam?: boolean;
  amenaza?: boolean;
}

async function clasificarConIA(texto: string, origen: OrigenModeracion, apiKey: string | undefined): Promise<ClasificacionIA | null> {
  if (!apiKey) return null;
  const contexto: Record<OrigenModeracion, string> = {
    chat: "un mensaje de chat entre un cliente y un profesional de servicios para el hogar",
    resena: "una reseña de un cliente sobre un profesional",
    respuesta: "la respuesta de un profesional a una reseña",
    solicitud: "una solicitud de presupuesto de un cliente",
    cotizacion: "una cotización que un profesional envía a un cliente",
  };
  const system =
    "Eres el moderador de Homie, una app chilena de servicios para el hogar. " +
    "Clasifica el texto del usuario y responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con esta forma exacta: " +
    '{"ofensivo":boolean,"contacto":boolean,"spam":boolean,"amenaza":boolean}. ' +
    "ofensivo = insultos, lenguaje de odio o acoso. " +
    "contacto = intenta compartir teléfono, email, redes sociales o cerrar el trato fuera de la app. " +
    "spam = publicidad, texto sin sentido o contenido no relacionado con el servicio. " +
    "amenaza = amenazas, intimidación o extorsión. " +
    "Las quejas duras pero respetuosas NO son ofensivas.";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 100,
        system,
        messages: [
          { role: "user", content: `Contexto: ${contexto[origen]}.\n\nTexto:\n"""${texto.slice(0, 2000)}"""` },
          { role: "assistant", content: "{" },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[moderacion] Anthropic API", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const raw = "{" + (json.content?.find((c) => c.type === "text")?.text ?? "");
    const m = raw.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as ClasificacionIA;
  } catch (e) {
    console.error("[moderacion] fallo IA (se permite el texto)", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const moderarTexto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<ResultadoModeracion> => {
    const texto = data.texto.trim();
    if (!texto) return { ok: true };

    const { data: usuario } = await context.supabase
      .from("usuarios")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const usuarioId = usuario?.id ?? null;

    async function bloquear(motivo: string): Promise<ResultadoModeracion> {
      // Keep blocking without attempting writes to a not-yet-deployed relation.
      console.warn("[moderacion] texto bloqueado", { origen: data.origen, motivo });
      return { ok: false, motivo, mensaje: MENSAJES[motivo] ?? "Tu mensaje no cumple las normas de Homie." };
    }

    // (a) Lenguaje ofensivo
    if (contieneOfensivo(texto)) return bloquear("ofensivo");

    // (b) Datos de contacto en chat sin pago
    if (data.origen === "chat" && data.reservaId && contieneContacto(texto)) {
      const { data: pago } = await context.supabase
        .from("pagos")
        .select("id")
        .eq("reserva_id", data.reservaId)
        .eq("estado", "pagado")
        .limit(1)
        .maybeSingle();
      if (!pago) return bloquear("contacto_sin_pago");
    }

    // (c) Spam / reseña falsa
    if (data.origen === "resena") {
      if (texto.length < 5) return bloquear("resena_corta");
      if (REGEX_URL.test(texto)) return bloquear("resena_url");
      if (usuarioId) {
        const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: previas } = await context.supabase
          .from("resenas")
          .select("comentario")
          .eq("cliente_id", usuarioId)
          .gte("created_at", desde)
          .limit(20);
        const norm = texto.toLowerCase().replace(/\s+/g, " ");
        if ((previas ?? []).some((r) => (r.comentario ?? "").trim().toLowerCase().replace(/\s+/g, " ") === norm)) {
          return bloquear("resena_duplicada");
        }
      }
    }

    // (d) IA opcional
    const ia = await clasificarConIA(texto, data.origen, process.env['ANTHROPIC_API_KEY']);
    if (ia) {
      if (ia.amenaza) return bloquear("ia_amenaza");
      if (ia.ofensivo) return bloquear("ia_ofensivo");
      if (ia.contacto && data.origen !== "chat") return bloquear("ia_contacto");
      if (ia.contacto && data.origen === "chat" && data.reservaId) {
        const { data: pago } = await context.supabase
          .from("pagos").select("id").eq("reserva_id", data.reservaId).eq("estado", "pagado").limit(1).maybeSingle();
        if (!pago) return bloquear("ia_contacto");
      }
      if (ia.spam) return bloquear("ia_spam");
    }

    return { ok: true };
  });
