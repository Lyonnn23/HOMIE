export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      calificaciones_cliente: {
        Row: {
          cliente_id: string
          comentario: string | null
          created_at: string
          id: string
          prestador_id: string
          puntaje: number
          reserva_id: string
        }
        Insert: {
          cliente_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          prestador_id: string
          puntaje: number
          reserva_id: string
        }
        Update: {
          cliente_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          prestador_id?: string
          puntaje?: number
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_cliente_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_cliente_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
          {
            foreignKeyName: "calificaciones_cliente_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: true
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          color_fondo: string
          color_hex: string | null
          icono: string
          id: string
          nombre: string
          slug: string | null
        }
        Insert: {
          color_fondo: string
          color_hex?: string | null
          icono: string
          id: string
          nombre: string
          slug?: string | null
        }
        Update: {
          color_fondo?: string
          color_hex?: string | null
          icono?: string
          id?: string
          nombre?: string
          slug?: string | null
        }
        Relationships: []
      }
      config_privada: {
        Row: {
          clave: string
          valor: string
        }
        Insert: {
          clave: string
          valor: string
        }
        Update: {
          clave?: string
          valor?: string
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          created_at: string
          disponible_desde: string | null
          estado: string
          id: string
          mensaje: string
          precio: number
          precio_hasta: number
          prestador_id: string
          solicitud_id: string
        }
        Insert: {
          created_at?: string
          disponible_desde?: string | null
          estado?: string
          id?: string
          mensaje: string
          precio: number
          precio_hasta: number
          prestador_id: string
          solicitud_id: string
        }
        Update: {
          created_at?: string
          disponible_desde?: string | null
          estado?: string
          id?: string
          mensaje?: string
          precio?: number
          precio_hasta?: number
          prestador_id?: string
          solicitud_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
          {
            foreignKeyName: "cotizaciones_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      creditos: {
        Row: {
          created_at: string
          id: string
          monto: number
          motivo: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monto: number
          motivo?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monto?: number
          motivo?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      cupon_usos: {
        Row: {
          codigo: string
          created_at: string
          descuento: number
          id: string
          reserva_id: string | null
          usuario_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descuento: number
          id?: string
          reserva_id?: string | null
          usuario_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descuento?: number
          id?: string
          reserva_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupon_usos_codigo_fkey"
            columns: ["codigo"]
            isOneToOne: false
            referencedRelation: "cupones"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "cupon_usos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupon_usos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cupones: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          minimo: number
          solo_primera_compra: boolean
          tipo: string
          tope: number | null
          usos: number
          usos_max: number | null
          usos_por_usuario: number
          usuario_id: string | null
          valor: number
          vence_at: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          minimo?: number
          solo_primera_compra?: boolean
          tipo: string
          tope?: number | null
          usos?: number
          usos_max?: number | null
          usos_por_usuario?: number
          usuario_id?: string | null
          valor: number
          vence_at?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          minimo?: number
          solo_primera_compra?: boolean
          tipo?: string
          tope?: number | null
          usos?: number
          usos_max?: number | null
          usos_por_usuario?: number
          usuario_id?: string | null
          valor?: number
          vence_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cupones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      direcciones_guardadas: {
        Row: {
          comuna: string | null
          created_at: string
          detalle: string | null
          direccion: string
          etiqueta: string
          id: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          comuna?: string | null
          created_at?: string
          detalle?: string | null
          direccion: string
          etiqueta: string
          id?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          comuna?: string | null
          created_at?: string
          detalle?: string | null
          direccion?: string
          etiqueta?: string
          id?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_guardadas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          prestador_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          prestador_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          prestador_id?: string
        }
        Relationships: []
      }
      liquidaciones: {
        Row: {
          created_at: string
          id: string
          medio: string | null
          monto: number
          nota: string | null
          pagada_at: string
          pagada_por: string | null
          prestador_id: string
          referencia: string | null
          reservas: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          medio?: string | null
          monto: number
          nota?: string | null
          pagada_at?: string
          pagada_por?: string | null
          prestador_id: string
          referencia?: string | null
          reservas?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          medio?: string | null
          monto?: number
          nota?: string | null
          pagada_at?: string
          pagada_por?: string | null
          prestador_id?: string
          referencia?: string | null
          reservas?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
        ]
      }
      mensajes: {
        Row: {
          contenido: string
          created_at: string
          foto_url: string | null
          id: string
          lat: number | null
          leido: boolean
          lng: number | null
          remitente_id: string
          reserva_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          foto_url?: string | null
          id?: string
          lat?: number | null
          leido?: boolean
          lng?: number | null
          remitente_id: string
          reserva_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          lat?: number | null
          leido?: boolean
          lng?: number | null
          remitente_id?: string
          reserva_id?: string
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          created_at: string
          id: string
          leida: boolean
          mensaje: string
          reserva_id: string | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje: string
          reserva_id?: string | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje?: string
          reserva_id?: string | null
          tipo?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          comision: number
          created_at: string
          estado: string
          id: string
          liquidacion_id: string | null
          moneda: string
          monto_prestador: number
          monto_total: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          reembolsado_at: string | null
          reserva_id: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          comision: number
          created_at?: string
          estado?: string
          id?: string
          liquidacion_id?: string | null
          moneda?: string
          monto_prestador: number
          monto_total: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          reembolsado_at?: string | null
          reserva_id: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          comision?: number
          created_at?: string
          estado?: string
          id?: string
          liquidacion_id?: string | null
          moneda?: string
          monto_prestador?: number
          monto_total?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          reembolsado_at?: string | null
          reserva_id?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      palabras_bloqueadas: {
        Row: {
          palabra: string
        }
        Insert: {
          palabra: string
        }
        Update: {
          palabra?: string
        }
        Relationships: []
      }
      planes_pro: {
        Row: {
          activo: boolean
          dias: number
          id: string
          nombre: string
          precio: number
        }
        Insert: {
          activo?: boolean
          dias: number
          id: string
          nombre: string
          precio: number
        }
        Update: {
          activo?: boolean
          dias?: number
          id?: string
          nombre?: string
          precio?: number
        }
        Relationships: []
      }
      prestador_contacto: {
        Row: {
          banco: string | null
          numero_cuenta: string | null
          prestador_id: string
          rut: string | null
          telefono: string | null
          tipo_cuenta: string | null
          titular: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          banco?: string | null
          numero_cuenta?: string | null
          prestador_id: string
          rut?: string | null
          telefono?: string | null
          tipo_cuenta?: string | null
          titular?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          banco?: string | null
          numero_cuenta?: string | null
          prestador_id?: string
          rut?: string | null
          telefono?: string | null
          tipo_cuenta?: string | null
          titular?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestador_contacto_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: true
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestador_contacto_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: true
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
        ]
      }
      prestador_servicios: {
        Row: {
          descripcion: string | null
          duracion_min: number | null
          foto_url: string | null
          garantia_dias: number
          id: string
          incluye: string | null
          materiales_incluidos: boolean
          modalidades: string[]
          no_incluye: string | null
          precio: number
          precio_hasta: number
          prestador_id: string
          servicio_id: string
          unidad: string
        }
        Insert: {
          descripcion?: string | null
          duracion_min?: number | null
          foto_url?: string | null
          garantia_dias?: number
          id?: string
          incluye?: string | null
          materiales_incluidos?: boolean
          modalidades?: string[]
          no_incluye?: string | null
          precio: number
          precio_hasta: number
          prestador_id: string
          servicio_id: string
          unidad?: string
        }
        Update: {
          descripcion?: string | null
          duracion_min?: number | null
          foto_url?: string | null
          garantia_dias?: number
          id?: string
          incluye?: string | null
          materiales_incluidos?: boolean
          modalidades?: string[]
          no_incluye?: string | null
          precio?: number
          precio_hasta?: number
          prestador_id?: string
          servicio_id?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestador_servicios_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestador_servicios_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
          {
            foreignKeyName: "prestador_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "guia_precios"
            referencedColumns: ["servicio_id"]
          },
          {
            foreignKeyName: "prestador_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      prestadores: {
        Row: {
          anos_experiencia: number | null
          antecedentes_ok: boolean
          banner_url: string | null
          bio: string | null
          calificacion_promedio: number
          categoria_id: string
          ciudad: string
          color_perfil: string | null
          compartir_ubicacion: boolean
          comuna: string | null
          comunas_cobertura: string[]
          direccion: string | null
          disponibilidad_texto: string | null
          disponible_ahora: boolean
          distancia_km: number | null
          emite_boleta: boolean
          especialidades: string[]
          formas_pago_extra: string[]
          foto_url: string | null
          gallery_urls: string[]
          herramientas_propias: boolean
          horario: Json
          id: string
          idiomas: string[]
          lat: number | null
          lng: number | null
          nombre: string | null
          plan: string
          precio_desde: number
          precio_hasta: number
          pro_hasta: string | null
          pro_trial_usado: boolean
          radio_km: number
          resenas_count: number
          suspendido: boolean
          tiene_vehiculo: boolean
          titulo_profesional: string | null
          ubicacion_actualizada_at: string | null
          usuario_id: string
          verificado: boolean
          verificado_identidad: boolean
          vistas: number
        }
        Insert: {
          anos_experiencia?: number | null
          antecedentes_ok?: boolean
          banner_url?: string | null
          bio?: string | null
          calificacion_promedio?: number
          categoria_id: string
          ciudad?: string
          color_perfil?: string | null
          compartir_ubicacion?: boolean
          comuna?: string | null
          comunas_cobertura?: string[]
          direccion?: string | null
          disponibilidad_texto?: string | null
          disponible_ahora?: boolean
          distancia_km?: number | null
          emite_boleta?: boolean
          especialidades?: string[]
          formas_pago_extra?: string[]
          foto_url?: string | null
          gallery_urls?: string[]
          herramientas_propias?: boolean
          horario?: Json
          id?: string
          idiomas?: string[]
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          plan?: string
          precio_desde?: number
          precio_hasta?: number
          pro_hasta?: string | null
          pro_trial_usado?: boolean
          radio_km?: number
          resenas_count?: number
          suspendido?: boolean
          tiene_vehiculo?: boolean
          titulo_profesional?: string | null
          ubicacion_actualizada_at?: string | null
          usuario_id: string
          verificado?: boolean
          verificado_identidad?: boolean
          vistas?: number
        }
        Update: {
          anos_experiencia?: number | null
          antecedentes_ok?: boolean
          banner_url?: string | null
          bio?: string | null
          calificacion_promedio?: number
          categoria_id?: string
          ciudad?: string
          color_perfil?: string | null
          compartir_ubicacion?: boolean
          comuna?: string | null
          comunas_cobertura?: string[]
          direccion?: string | null
          disponibilidad_texto?: string | null
          disponible_ahora?: boolean
          distancia_km?: number | null
          emite_boleta?: boolean
          especialidades?: string[]
          formas_pago_extra?: string[]
          foto_url?: string | null
          gallery_urls?: string[]
          herramientas_propias?: boolean
          horario?: Json
          id?: string
          idiomas?: string[]
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          plan?: string
          precio_desde?: number
          precio_hasta?: number
          pro_hasta?: string | null
          pro_trial_usado?: boolean
          radio_km?: number
          resenas_count?: number
          suspendido?: boolean
          tiene_vehiculo?: boolean
          titulo_profesional?: string | null
          ubicacion_actualizada_at?: string | null
          usuario_id?: string
          verificado?: boolean
          verificado_identidad?: boolean
          vistas?: number
        }
        Relationships: [
          {
            foreignKeyName: "prestadores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestadores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamos: {
        Row: {
          asunto: string
          autor_id: string
          created_at: string
          detalle: string
          estado: string
          id: string
          reserva_id: string | null
          respondido_at: string | null
          respuesta_admin: string | null
          tipo: string
        }
        Insert: {
          asunto: string
          autor_id: string
          created_at?: string
          detalle: string
          estado?: string
          id?: string
          reserva_id?: string | null
          respondido_at?: string | null
          respuesta_admin?: string | null
          tipo: string
        }
        Update: {
          asunto?: string
          autor_id?: string
          created_at?: string
          detalle?: string
          estado?: string
          id?: string
          reserva_id?: string | null
          respondido_at?: string | null
          respuesta_admin?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "reclamos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reportes: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          id: string
          motivo: string
          reportado_id: string
          reportante_id: string
          reserva_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          motivo: string
          reportado_id: string
          reportante_id: string
          reserva_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          motivo?: string
          reportado_id?: string
          reportante_id?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reportes_reportado_id_fkey"
            columns: ["reportado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reportes_reportante_id_fkey"
            columns: ["reportante_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reportes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      resenas: {
        Row: {
          calificacion: number
          cliente_id: string
          cliente_nombre: string | null
          comentario: string | null
          created_at: string
          foto_url: string | null
          id: string
          prestador_id: string
          reserva_id: string | null
          respuesta_fecha: string | null
          respuesta_prestador: string | null
          verificada: boolean
        }
        Insert: {
          calificacion: number
          cliente_id: string
          cliente_nombre?: string | null
          comentario?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          prestador_id: string
          reserva_id?: string | null
          respuesta_fecha?: string | null
          respuesta_prestador?: string | null
          verificada?: boolean
        }
        Update: {
          calificacion?: number
          cliente_id?: string
          cliente_nombre?: string | null
          comentario?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          prestador_id?: string
          reserva_id?: string | null
          respuesta_fecha?: string | null
          respuesta_prestador?: string | null
          verificada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resenas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenas_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenas_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
          {
            foreignKeyName: "resenas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_codigos: {
        Row: {
          codigo: string
          intentos: number
          reserva_id: string
        }
        Insert: {
          codigo: string
          intentos?: number
          reserva_id: string
        }
        Update: {
          codigo?: string
          intentos?: number
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserva_codigos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: true
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          aviso_pago_enviado: boolean
          aviso_resena_enviado: boolean
          cancelada_por: string | null
          cliente_calificacion: number | null
          cliente_foto_url: string | null
          cliente_id: string
          cliente_nombre: string | null
          comision: number
          completada_at: string | null
          created_at: string
          cupon_codigo: string | null
          descuento: number
          direccion: string
          estado: Database["public"]["Enums"]["reserva_estado"]
          fecha: string
          hora: string
          id: string
          modalidad: string
          motivo_cancelacion: string | null
          nota: string | null
          prestador_foto_url: string | null
          prestador_id: string
          prestador_nombre: string | null
          prestador_usuario_id: string | null
          recordatorio_enviado: boolean
          servicio_id: string | null
          total: number
        }
        Insert: {
          aviso_pago_enviado?: boolean
          aviso_resena_enviado?: boolean
          cancelada_por?: string | null
          cliente_calificacion?: number | null
          cliente_foto_url?: string | null
          cliente_id: string
          cliente_nombre?: string | null
          comision?: number
          completada_at?: string | null
          created_at?: string
          cupon_codigo?: string | null
          descuento?: number
          direccion: string
          estado?: Database["public"]["Enums"]["reserva_estado"]
          fecha: string
          hora: string
          id?: string
          modalidad?: string
          motivo_cancelacion?: string | null
          nota?: string | null
          prestador_foto_url?: string | null
          prestador_id: string
          prestador_nombre?: string | null
          prestador_usuario_id?: string | null
          recordatorio_enviado?: boolean
          servicio_id?: string | null
          total: number
        }
        Update: {
          aviso_pago_enviado?: boolean
          aviso_resena_enviado?: boolean
          cancelada_por?: string | null
          cliente_calificacion?: number | null
          cliente_foto_url?: string | null
          cliente_id?: string
          cliente_nombre?: string | null
          comision?: number
          completada_at?: string | null
          created_at?: string
          cupon_codigo?: string | null
          descuento?: number
          direccion?: string
          estado?: Database["public"]["Enums"]["reserva_estado"]
          fecha?: string
          hora?: string
          id?: string
          modalidad?: string
          motivo_cancelacion?: string | null
          nota?: string | null
          prestador_foto_url?: string | null
          prestador_id?: string
          prestador_nombre?: string | null
          prestador_usuario_id?: string | null
          recordatorio_enviado?: boolean
          servicio_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
          {
            foreignKeyName: "reservas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "guia_precios"
            referencedColumns: ["servicio_id"]
          },
          {
            foreignKeyName: "reservas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios: {
        Row: {
          categoria_id: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          categoria_id: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          categoria_id?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicios_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes: {
        Row: {
          categoria_id: string
          cliente_id: string
          comuna: string | null
          cotizacion_aceptada_id: string | null
          created_at: string
          detalle: string
          direccion: string | null
          estado: string
          expira_at: string
          fecha_deseada: string | null
          fotos: string[]
          id: string
          presupuesto_max: number | null
          servicio_id: string | null
          titulo: string
          urgente: boolean
        }
        Insert: {
          categoria_id: string
          cliente_id: string
          comuna?: string | null
          cotizacion_aceptada_id?: string | null
          created_at?: string
          detalle: string
          direccion?: string | null
          estado?: string
          expira_at?: string
          fecha_deseada?: string | null
          fotos?: string[]
          id?: string
          presupuesto_max?: number | null
          servicio_id?: string | null
          titulo: string
          urgente?: boolean
        }
        Update: {
          categoria_id?: string
          cliente_id?: string
          comuna?: string | null
          cotizacion_aceptada_id?: string | null
          created_at?: string
          detalle?: string
          direccion?: string | null
          estado?: string
          expira_at?: string
          fecha_deseada?: string | null
          fotos?: string[]
          id?: string
          presupuesto_max?: number | null
          servicio_id?: string | null
          titulo?: string
          urgente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "guia_precios"
            referencedColumns: ["servicio_id"]
          },
          {
            foreignKeyName: "solicitudes_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      soporte_mensajes: {
        Row: {
          contenido: string
          created_at: string
          de_admin: boolean
          id: string
          leido: boolean
          usuario_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          de_admin?: boolean
          id?: string
          leido?: boolean
          usuario_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          de_admin?: boolean
          id?: string
          leido?: boolean
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soporte_mensajes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripciones_pro: {
        Row: {
          created_at: string
          estado: string
          id: string
          monto: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          periodo_desde: string | null
          periodo_hasta: string | null
          plan_id: string
          prestador_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          monto: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          periodo_desde?: string | null
          periodo_hasta?: string | null
          plan_id: string
          prestador_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          monto?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          periodo_desde?: string | null
          periodo_hasta?: string | null
          plan_id?: string
          prestador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_pro_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes_pro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_pro_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_pro_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
        ]
      }
      urgencias: {
        Row: {
          categoria_id: string
          cliente_id: string
          created_at: string
          descripcion: string
          direccion: string
          estado: string
          eta_min: number | null
          expira_at: string
          id: string
          lat: number | null
          lng: number | null
          prestador_id: string | null
          reserva_id: string | null
          servicio_id: string | null
          telefono: string | null
        }
        Insert: {
          categoria_id: string
          cliente_id: string
          created_at?: string
          descripcion: string
          direccion: string
          estado?: string
          eta_min?: number | null
          expira_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          prestador_id?: string | null
          reserva_id?: string | null
          servicio_id?: string | null
          telefono?: string | null
        }
        Update: {
          categoria_id?: string
          cliente_id?: string
          created_at?: string
          descripcion?: string
          direccion?: string
          estado?: string
          eta_min?: number | null
          expira_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          prestador_id?: string | null
          reserva_id?: string | null
          servicio_id?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "urgencias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgencias_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgencias_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "saldos_prestadores"
            referencedColumns: ["prestador_id"]
          },
          {
            foreignKeyName: "urgencias_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgencias_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "guia_precios"
            referencedColumns: ["servicio_id"]
          },
          {
            foreignKeyName: "urgencias_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          bono_referido_pagado: boolean
          calificacion_cliente: number | null
          calificaciones_cliente_count: number
          codigo_referido: string | null
          created_at: string
          email: string | null
          foto_url: string | null
          id: string
          nombre: string
          notif_config: Json
          onesignal_player_id: string | null
          referido_por: string | null
          tipo: Database["public"]["Enums"]["user_type"]
          user_id: string | null
        }
        Insert: {
          bono_referido_pagado?: boolean
          calificacion_cliente?: number | null
          calificaciones_cliente_count?: number
          codigo_referido?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre: string
          notif_config?: Json
          onesignal_player_id?: string | null
          referido_por?: string | null
          tipo?: Database["public"]["Enums"]["user_type"]
          user_id?: string | null
        }
        Update: {
          bono_referido_pagado?: boolean
          calificacion_cliente?: number | null
          calificaciones_cliente_count?: number
          codigo_referido?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          notif_config?: Json
          onesignal_player_id?: string | null
          referido_por?: string | null
          tipo?: Database["public"]["Enums"]["user_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_referido_por_fkey"
            columns: ["referido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      verificaciones_prestador: {
        Row: {
          certificados: string[]
          created_at: string
          estado: string
          foto_carnet_frente: string | null
          foto_carnet_reverso: string | null
          foto_selfie: string | null
          id: string
          motivo_rechazo: string | null
          prestador_id: string
          revisado_por: string | null
        }
        Insert: {
          certificados?: string[]
          created_at?: string
          estado?: string
          foto_carnet_frente?: string | null
          foto_carnet_reverso?: string | null
          foto_selfie?: string | null
          id?: string
          motivo_rechazo?: string | null
          prestador_id: string
          revisado_por?: string | null
        }
        Update: {
          certificados?: string[]
          created_at?: string
          estado?: string
          foto_carnet_frente?: string | null
          foto_carnet_reverso?: string | null
          foto_selfie?: string | null
          id?: string
          motivo_rechazo?: string | null
          prestador_id?: string
          revisado_por?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      guia_precios: {
        Row: {
          categoria_id: string | null
          precio_max: number | null
          precio_mediana: number | null
          precio_min: number | null
          profesionales: number | null
          servicio: string | null
          servicio_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      saldos_prestadores: {
        Row: {
          comision_homie: number | null
          monto_pendiente: number | null
          nombre: string | null
          prestador_id: string | null
          reserva_ids: string[] | null
          reservas_pendientes: number | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestadores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aceptar_cotizacion: {
        Args: {
          _cotizacion_id: string
          _direccion: string
          _fecha: string
          _hora: string
        }
        Returns: string
      }
      aceptar_urgencia: {
        Args: { _eta_min: number; _urgencia_id: string }
        Returns: string
      }
      activar_pro_pagado: {
        Args: { _mp_payment_id: string; _suscripcion_id: string }
        Returns: undefined
      }
      activar_prueba_pro: { Args: never; Returns: string }
      admin_embudo: {
        Args: { _dias?: number }
        Returns: {
          clientes: number
          comisiones: number
          cotizaciones: number
          ingresos: number
          prestadores_con_perfil: number
          prestadores_registrados: number
          prestadores_verificados: number
          pro_activos: number
          registros: number
          reservas_canceladas: number
          reservas_completadas: number
          reservas_creadas: number
          reservas_pagadas: number
          solicitudes: number
          ticket_promedio: number
          urgencias: number
          urgencias_asignadas: number
        }[]
      }
      admin_resumen: {
        Args: never
        Returns: {
          clientes: number
          comision_mes: number
          ingresos_mes: number
          por_liquidar: number
          prestadores_verificados: number
          reclamos_abiertos: number
          reservas_hoy: number
          reservas_mes: number
          reservas_pendientes: number
          verificaciones_pendientes: number
        }[]
      }
      admin_serie_diaria: {
        Args: { _dias?: number }
        Returns: {
          dia: string
          ingresos: number
          pagos: number
          registros: number
          reservas: number
        }[]
      }
      asignar_admin_por_email: { Args: { _email: string }; Returns: undefined }
      completar_con_codigo: {
        Args: { _codigo: string; _reserva_id: string }
        Returns: boolean
      }
      contacto_prestador: {
        Args: { _reserva_id: string }
        Returns: {
          telefono: string
          whatsapp: string
        }[]
      }
      contiene_lenguaje_ofensivo: { Args: { _texto: string }; Returns: boolean }
      current_usuario_id: { Args: never; Returns: string }
      distancia_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      enviar_recordatorios: { Args: never; Returns: undefined }
      es_pro: { Args: { _prestador_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      horas_ocupadas: {
        Args: { _fecha: string; _prestador_id: string }
        Returns: {
          hora: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      puede_leer_foto_solicitud: {
        Args: { _object_path: string }
        Returns: boolean
      }
      registrar_liquidacion: {
        Args: {
          _medio: string
          _nota: string
          _prestador_id: string
          _referencia: string
        }
        Returns: string
      }
      registrar_vista: { Args: { _prestador_id: string }; Returns: undefined }
      solicitud_es_del_cliente_actual: {
        Args: { _solicitud_id: string }
        Returns: boolean
      }
      solicitud_tiene_cotizacion_del_prestador_actual: {
        Args: { _solicitud_id: string }
        Returns: boolean
      }
      stats_prestador: {
        Args: { _prestador_id: string }
        Returns: {
          calificacion: number
          cotizaciones_enviadas: number
          cotizaciones_ganadas: number
          ingresos_mes: number
          ingresos_total: number
          resenas: number
          reservas_mes: number
          servicios_completados: number
          tasa_aceptacion: number
          vistas_perfil: number
        }[]
      }
      stats_publicas: {
        Args: never
        Returns: {
          calificacion: number
          profesionales: number
          resenas: number
          servicios_completados: number
        }[]
      }
      tasa_comision: { Args: { _prestador_id: string }; Returns: number }
      unaccent_safe: { Args: { _t: string }; Returns: string }
      usar_codigo_referido: { Args: { _codigo: string }; Returns: string }
      validar_cupon: {
        Args: { _codigo: string; _precio: number }
        Returns: {
          descuento: number
          mensaje: string
          valido: boolean
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin" | "superadmin"
      reserva_estado:
        | "pendiente"
        | "confirmada"
        | "en_camino"
        | "completada"
        | "cancelada"
      user_type: "cliente" | "prestador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "superadmin"],
      reserva_estado: [
        "pendiente",
        "confirmada",
        "en_camino",
        "completada",
        "cancelada",
      ],
      user_type: ["cliente", "prestador"],
    },
  },
} as const
