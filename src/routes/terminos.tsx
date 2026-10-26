import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
    { property: "og:title", content: "Términos y condiciones — Homie" },
    { property: "og:description", content: "Términos y condiciones de uso de Homie, marketplace de servicios a domicilio en Chile: rol de intermediario, comisión, pagos, cancelaciones, reclamos y mediación." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    
      { title: "Términos y condiciones — Homie" },
      { name: "description", content: "Términos y condiciones de uso de Homie, marketplace de servicios a domicilio en Chile: rol de intermediario, comisión, pagos, cancelaciones, reclamos y mediación." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TerminosPage,
});

function TerminosPage() {
  return (
    <LegalPage
      title="Términos y condiciones de uso"
      intro="Estos términos regulan el uso de la plataforma Homie por parte de clientes y profesionales. Al crear una cuenta o reservar un servicio, los aceptas."
      updated="21 de octubre de 2026"
    >
      <h2>1. Quiénes somos y qué es Homie</h2>
      <p>
        Homie es una plataforma operada por <strong>Homie SpA</strong> (en adelante, “Homie”), sociedad constituida en Chile, que conecta a personas que necesitan servicios a domicilio (“Clientes”) con profesionales y oficios independientes que los ofrecen (“Profesionales”). Juntos, Clientes y Profesionales son los “Usuarios”.
      </p>
      <p>
        Homie actúa exclusivamente como <strong>intermediario tecnológico</strong>. Homie no presta los servicios publicados, no emplea a los Profesionales ni los representa. El contrato de prestación de servicios se celebra directamente entre el Cliente y el Profesional.
      </p>

      <h2>2. Cuentas y requisitos</h2>
      <ul>
        <li>Para usar Homie debes tener al menos 18 años y capacidad legal para contratar.</li>
        <li>Debes entregar información veraz y mantenerla actualizada. Eres responsable de la actividad realizada con tu cuenta y de resguardar tu contraseña.</li>
        <li>Homie puede suspender o cerrar cuentas que infrinjan estos términos, entreguen información falsa, usen la plataforma para fines ilícitos o generen reclamos reiterados fundados.</li>
      </ul>

      <h2>3. Verificación de Profesionales</h2>
      <p>
        Para publicar servicios, el Profesional debe completar un proceso de verificación que incluye: cédula de identidad vigente, fotografía de verificación (selfie), certificado de antecedentes y un certificado, título o acreditación del rubro en que trabaja. Homie revisa estos antecedentes de forma manual y puede rechazar o revocar la verificación sin expresión de causa.
      </p>
      <p>
        La verificación es una revisión documental razonable y no constituye garantía absoluta de la idoneidad, calidad o resultado del trabajo del Profesional. El tratamiento de los documentos se rige por nuestra <Link to="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>4. Precios y rango garantizado</h2>
      <ul>
        <li>Cada Profesional fija para sus servicios un <strong>precio desde</strong> y un <strong>precio hasta</strong>. El precio hasta no puede superar 1,5 veces el precio desde.</li>
        <li>Al reservar, el Cliente paga el precio desde. Si al evaluar el trabajo en el domicilio el Profesional estima que requiere un valor mayor, debe informarlo y acordarlo con el Cliente <strong>antes de iniciar</strong>. El valor final nunca puede superar el precio hasta publicado al momento de la reserva.</li>
        <li>Si el Cliente no acepta el ajuste informado antes de iniciar, puede cancelar la reserva sin costo.</li>
        <li>Cualquier cobro fuera de la plataforma o por sobre el precio hasta constituye una infracción grave y puede dar lugar al cierre de la cuenta del Profesional.</li>
      </ul>

      <h2>5. Pagos y pago protegido</h2>
      <p>
        Los pagos se procesan a través de <strong>Mercado Pago</strong>, proveedor externo sujeto a sus propios términos. Homie no almacena datos de tarjetas.
      </p>
      <ul>
        <li>El monto pagado por el Cliente queda retenido hasta que el Cliente confirma en la plataforma que el servicio fue completado.</li>
        <li>Si el Cliente no confirma ni abre un reclamo dentro de <strong>72 horas</strong> desde la hora programada de término del servicio, el pago se libera automáticamente.</li>
        <li>Mientras exista un reclamo abierto, el pago permanece retenido hasta su resolución.</li>
      </ul>

      <h2>6. Comisión de Homie</h2>
      <p>
        Homie cobra al Profesional una <strong>comisión del 15%</strong> sobre el valor final de cada servicio completado (<strong>12%</strong> para Profesionales con Homie Premium vigente), que se descuenta antes de transferir el pago. Durante un <strong>periodo gratis de 90 días</strong> contados desde la verificación del perfil, la comisión es de 0%. No se cobra comisión sobre reservas canceladas ni reembolsadas en su totalidad. Para el Cliente, el uso de Homie <strong>no tiene recargo</strong>: paga exactamente el precio publicado por el Profesional, menos los cupones que aplique. Homie podrá modificar la comisión informándolo con al menos 30 días de anticipación.
      </p>

      <h2>7. Cancelaciones y reembolsos</h2>
      <ul>
        <li><strong>Cancelación por el Cliente con más de 24 horas</strong> de anticipación a la hora reservada: reembolso del 100%.</li>
        <li><strong>Cancelación por el Cliente con 24 horas o menos</strong>: se retiene un 10% del precio desde como compensación al Profesional por el tiempo bloqueado; el 80% restante se reembolsa.</li>
        <li><strong>Cancelación por el Profesional o inasistencia</strong>: reembolso del 100% al Cliente, sin importar la anticipación. Las inasistencias reiteradas afectan la posición del Profesional y pueden derivar en suspensión.</li>
        <li>Los reembolsos se gestionan por el mismo medio de pago en los plazos que establezca Mercado Pago y el emisor de la tarjeta.</li>
      </ul>

      <h2>8. Reclamos y mediación</h2>
      <p>
        Si el servicio no se realizó, se realizó parcialmente o presenta problemas, el Cliente puede abrir un reclamo desde la reserva dentro de 72 horas. Homie solicitará la versión y evidencia de ambas partes (fotos, mensajes del chat, comprobantes) y resolverá en un plazo máximo de <strong>5 días hábiles</strong>, pudiendo disponer el reembolso total o parcial o la liberación del pago. La mediación de Homie es un mecanismo de buena fe y no reemplaza los derechos que la ley otorga a los Usuarios, en particular los de la Ley 19.496 sobre protección de los derechos de los consumidores cuando resulte aplicable.
      </p>

      <h2>9. Obligaciones de los Usuarios</h2>
      <ul>
        <li>Clientes: entregar información correcta del servicio y la dirección, estar disponibles a la hora reservada y ofrecer condiciones seguras para el trabajo.</li>
        <li>Profesionales: cumplir con lo publicado, llegar puntualmente, respetar el rango de precio, emitir la boleta o factura que corresponda según la legislación tributaria chilena y contar con las autorizaciones que su rubro exija.</li>
        <li>Ambos: comunicarse con respeto, no compartir datos de contacto para evadir la plataforma y no publicar contenido falso, ofensivo o que vulnere derechos de terceros.</li>
      </ul>

      <h2>10. Reseñas</h2>
      <p>
        Solo los Clientes con un servicio completado pueden dejar una reseña. Las reseñas deben ser veraces y respetuosas. Homie puede eliminar reseñas que infrinjan estas reglas o la ley, pero no edita su contenido ni las elimina por ser negativas.
      </p>

      <h2>11. Responsabilidad</h2>
      <p>
        En su calidad de intermediario, Homie no responde por la ejecución, calidad, oportunidad o resultado de los servicios, ni por daños derivados de la relación entre Cliente y Profesional, sin perjuicio de los mecanismos de pago protegido y mediación descritos. La responsabilidad de Homie frente a un Usuario, por cualquier causa, se limita al monto de la comisión percibida por Homie en la reserva que origine el reclamo, salvo dolo o culpa grave, y en todo caso sin perjuicio de los derechos irrenunciables que la ley reconoce.
      </p>
      <p>
        Homie procura mantener la plataforma disponible de forma continua, pero no garantiza la ausencia de interrupciones, errores o pérdida de información.
      </p>

      <h2>12. Propiedad intelectual</h2>
      <p>
        La marca Homie, el software, el diseño y los contenidos de la plataforma pertenecen a Homie SpA o a sus licenciantes. Los Usuarios conservan los derechos sobre el contenido que suben (fotos, descripciones, reseñas) y otorgan a Homie una licencia gratuita, no exclusiva y mundial para mostrarlo dentro de la plataforma y en sus comunicaciones.
      </p>

      <h2>13. Modificaciones</h2>
      <p>
        Homie puede modificar estos términos. Los cambios relevantes se informarán por correo electrónico o aviso en la aplicación con al menos 15 días de anticipación. El uso de la plataforma después de esa fecha implica aceptación de los nuevos términos.
      </p>

      <h2>14. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los tribunales ordinarios de justicia de la ciudad y comuna de Santiago, sin perjuicio del derecho del consumidor a recurrir ante el Juzgado de Policía Local de su domicilio o ante el SERNAC cuando corresponda.
      </p>

      <h2>15. Contacto</h2>
      <p>
        Para consultas sobre estos términos escríbenos a <a href="mailto:legal@homie.cl">legal@homie.cl</a> o desde el centro de ayuda en la aplicación.
      </p>
    </LegalPage>
  );
}
