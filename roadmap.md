# Migraciones solicitadas

- [x] Corregir la vista previa contra el esquema aplicado: compilación correcta, 16 pruebas aprobadas e inicio, idioma y administración comprobados con sesión activa; sin activar migraciones pendientes ni cambiar comisiones o permisos.
- [ ] Habilitar edición de cobros e historial administrativo de moderación: requieren sus migraciones pendientes; las pantallas informan su indisponibilidad y mantienen el control de acceso.
- [ ] Aplicar las cinco plantillas de autenticación existentes y sus asuntos en español: requiere configurar un dominio de envío propio antes de activar los correos personalizados.
- [x] Aplicar y verificar 20261022020000_homie_crecimiento.sql: permisos y límites comprobados, cupón HOMIE20 creado, recordatorios cada 15 minutos, chat privado; 45 pruebas pasan y lectura de invitaciones, cupones, métricas y soporte comprobada con sesión activa.
- [ ] Activar y comprobar notificaciones al dispositivo: faltan el identificador de la aplicación y la clave de OneSignal.
- [ ] Comprobar canje y pago de cupones, bono por servicio completado y fotos del chat desde la app: requiere cuentas participantes y una reserva verificable; no hay profesionales verificados ni reservas de la cuenta disponible.
- [x] Aplicar y verificar 20261022010000_homie_ficha_servicio.sql: 13 campos y sus límites comprobados; 25 pruebas pasan y la app compila correctamente.
- [ ] Comprobar edición y lectura de la ficha desde la app: no hay profesionales verificados visibles y la sesión disponible es de cliente.
- [x] Aplicar y verificar 20261021060000_homie_pro_ya_modalidad.sql: planes y permisos comprobados, nueve pruebas pasan, urgencia creada y cancelada desde la app.
- [ ] Comprobar activación y pago de Pro desde la app: requiere una cuenta profesional verificada; la sesión disponible es de cliente.
- [x] Restringir fotos privadas para cliente, profesionales autorizados y administradores; carga, ampliación y lectura tras cancelar comprobadas, sin lectura anónima.
- [x] Aplicar y verificar 20261021040000_homie_operacion.sql.
- [x] Aplicar y verificar 20261021030000_homie_cotizaciones.sql.
- [x] Aplicar y verificar 20261021050000_admin_actualiza_reservas.sql después de operación.
- [x] Resolver el hallazgo de lectura de fotos públicas sin cambiar su visibilidad sin autorización.
- [x] Verificar lectura de solicitudes sin recursión de permisos: dos pruebas y lectura en la app con sesión activa.
- [x] Crear el espacio privado de fotos de solicitudes.