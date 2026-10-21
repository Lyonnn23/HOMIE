import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de privacidad — Homie" },
      { name: "description", content: "Cómo Homie recopila, usa, protege y conserva tus datos personales conforme a la Ley 19.628 y la Ley 21.719 de Chile, y cómo ejercer tus derechos." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Explica qué datos personales recopilamos, para qué los usamos, con quién los compartimos, cuánto tiempo los conservamos y cómo puedes ejercer tus derechos."
      updated="21 de octubre de 2026"
    >
      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de tus datos personales es <strong>Homie SpA</strong>, con domicilio en Santiago, Chile (“Homie”). Puedes contactar a nuestro encargado de protección de datos en <a href="mailto:privacidad@homie.cl">privacidad@homie.cl</a>.
      </p>
      <p>
        Tratamos tus datos conforme a la <strong>Ley 19.628</strong> sobre protección de la vida privada y a la <strong>Ley 21.719</strong>, que regula la protección y el tratamiento de datos personales y crea la Agencia de Protección de Datos Personales, en la medida en que sus disposiciones se encuentren vigentes.
      </p>

      <h2>2. Qué datos recopilamos</h2>
      <h3>Todos los usuarios</h3>
      <ul>
        <li>Datos de cuenta: nombre, correo electrónico, teléfono, foto de perfil y contraseña (almacenada cifrada).</li>
        <li>Direcciones de servicio y, si lo autorizas, ubicación aproximada del dispositivo para mostrar profesionales o distribuidoras de gas cercanas.</li>
        <li>Reservas, cotizaciones, mensajes del chat, reseñas, reclamos y reportes.</li>
        <li>Datos técnicos: dispositivo, sistema operativo, identificadores de notificaciones push, registros de acceso y errores.</li>
      </ul>
      <h3>Profesionales (verificación)</h3>
      <ul>
        <li>Cédula de identidad (ambos lados), fotografía de verificación (selfie), certificado de antecedentes y certificado, título o acreditación del rubro.</li>
        <li>Categoría, servicios, rangos de precio, zona de cobertura y horario.</li>
        <li>Datos para el pago: cuenta de Mercado Pago. Homie no almacena datos bancarios ni de tarjetas.</li>
      </ul>
      <p>
        La fotografía de verificación se usa únicamente para comparar la identidad con la cédula. No creamos perfiles biométricos ni usamos reconocimiento facial automatizado para otros fines.
      </p>

      <h2>3. Para qué usamos tus datos</h2>
      <ul>
        <li>Crear y administrar tu cuenta y permitir la relación entre clientes y profesionales (ejecución del contrato).</li>
        <li>Verificar la identidad e idoneidad de los profesionales y prevenir fraudes y suplantaciones (interés legítimo y seguridad de la plataforma).</li>
        <li>Procesar pagos, retenciones, liberaciones y reembolsos a través de Mercado Pago.</li>
        <li>Gestionar reclamos y mediación, y cumplir obligaciones legales, tributarias y requerimientos de autoridad.</li>
        <li>Enviar notificaciones sobre reservas, cotizaciones, mensajes y pagos. Las comunicaciones comerciales solo se envían con tu consentimiento y puedes desactivarlas en la configuración.</li>
        <li>Mejorar la plataforma mediante estadísticas agregadas y anonimizadas.</li>
      </ul>

      <h2>4. Con quién compartimos datos</h2>
      <ul>
        <li><strong>Entre usuarios:</strong> el profesional ve el nombre del cliente, la dirección del servicio y su teléfono solo mientras la reserva está activa. El cliente ve el perfil público del profesional (nombre, foto, categoría, precios, reseñas) y sus datos de contacto solo con reserva confirmada.</li>
        <li><strong>Proveedores:</strong> Mercado Pago (pagos), Supabase (alojamiento de datos y autenticación), servicios de envío de correo y notificaciones push, y herramientas de monitoreo de errores. Estos proveedores tratan datos por cuenta de Homie bajo contratos de confidencialidad y pueden estar ubicados fuera de Chile; en ese caso aplicamos salvaguardas contractuales adecuadas.</li>
        <li><strong>Autoridades:</strong> cuando una ley, resolución judicial o requerimiento de autoridad competente lo exija.</li>
      </ul>
      <p>Homie no vende ni arrienda datos personales a terceros.</p>

      <h2>5. Cuánto tiempo conservamos los datos</h2>
      <ul>
        <li>Datos de cuenta: mientras la cuenta esté activa y hasta 2 años después de su cierre, para atender reclamos y obligaciones legales.</li>
        <li>Documentos de verificación (cédula, selfie, antecedentes, certificado del rubro): mientras el profesional mantenga su perfil activo y hasta 12 meses después de su baja. Si la verificación es rechazada, los documentos se eliminan dentro de 90 días.</li>
        <li>Registros de reservas, pagos y boletas: 6 años, conforme a las obligaciones tributarias y contables chilenas.</li>
        <li>Mensajes del chat y reclamos: 2 años desde el cierre de la reserva.</li>
      </ul>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer en cualquier momento tus derechos de <strong>acceso, rectificación, cancelación (supresión) y oposición</strong> (derechos ARCO), así como el de <strong>portabilidad</strong> y el de <strong>bloqueo</strong> del tratamiento, en los términos de la Ley 19.628 y la Ley 21.719. También puedes retirar un consentimiento otorgado, sin efecto retroactivo.
      </p>
      <p>
        Para ejercerlos escribe a <a href="mailto:privacidad@homie.cl">privacidad@homie.cl</a> o usa la opción “Mi cuenta” en la aplicación. Responderemos dentro de 30 días corridos. Si consideras que tu solicitud no fue atendida, puedes reclamar ante la Agencia de Protección de Datos Personales o los tribunales competentes.
      </p>
      <p>
        Puedes eliminar tu cuenta desde la aplicación. Algunos datos se conservarán durante los plazos indicados en la sección 5 cuando una obligación legal lo exija.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables: cifrado en tránsito (TLS), contraseñas con hash, control de acceso por roles, documentos de verificación en almacenamiento privado con acceso restringido al equipo de verificación y registro de accesos. Ningún sistema es infalible; si ocurre una brecha que afecte tus datos, te lo informaremos y notificaremos a la autoridad cuando la ley lo exija.
      </p>

      <h2>8. Cookies y almacenamiento local</h2>
      <p>
        Usamos cookies y almacenamiento local estrictamente necesarios para mantener tu sesión, recordar preferencias (por ejemplo, el modo fácil de accesibilidad) y hacer funcionar la aplicación sin conexión. No usamos cookies publicitarias de terceros.
      </p>

      <h2>9. Menores de edad</h2>
      <p>
        Homie está dirigido a mayores de 18 años. No recopilamos a sabiendas datos de menores. Si detectamos una cuenta de un menor, la eliminaremos.
      </p>

      <h2>10. Cambios a esta política</h2>
      <p>
        Si modificamos esta política de forma relevante, te avisaremos por correo o en la aplicación con al menos 15 días de anticipación. La versión vigente siempre estará disponible en esta página. Revisa también nuestros <Link to="/terminos">Términos y condiciones</Link>.
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Esta política se rige por las leyes de la República de Chile.
      </p>
    </LegalPage>
  );
}
