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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
      mensajes: {
        Row: {
          contenido: string
          created_at: string
          foto_url: string | null
          id: string
          leido: boolean
          remitente_id: string
          reserva_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          foto_url?: string | null
          id?: string
          leido?: boolean
          remitente_id: string
          reserva_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          leido?: boolean
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
          moneda: string
          monto_prestador: number
          monto_total: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          reserva_id: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          comision: number
          created_at?: string
          estado?: string
          id?: string
          moneda?: string
          monto_prestador: number
          monto_total: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          reserva_id: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          comision?: number
          created_at?: string
          estado?: string
          id?: string
          moneda?: string
          monto_prestador?: number
          monto_total?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          reserva_id?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      prestador_servicios: {
        Row: {
          id: string
          precio: number
          prestador_id: string
          servicio_id: string
        }
        Insert: {
          id?: string
          precio: number
          prestador_id: string
          servicio_id: string
        }
        Update: {
          id?: string
          precio?: number
          prestador_id?: string
          servicio_id?: string
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
          antecedentes_ok: boolean
          bio: string | null
          calificacion_promedio: number
          categoria_id: string
          ciudad: string
          compartir_ubicacion: boolean
          direccion: string | null
          disponibilidad_texto: string | null
          disponible_ahora: boolean
          distancia_km: number | null
          foto_url: string | null
          gallery_urls: string[]
          id: string
          lat: number | null
          lng: number | null
          nombre: string | null
          plan: string
          precio_desde: number
          precio_hasta: number
          resenas_count: number
          suspendido: boolean
          ubicacion_actualizada_at: string | null
          usuario_id: string
          verificado: boolean
          verificado_identidad: boolean
        }
        Insert: {
          antecedentes_ok?: boolean
          bio?: string | null
          calificacion_promedio?: number
          categoria_id: string
          ciudad?: string
          compartir_ubicacion?: boolean
          direccion?: string | null
          disponibilidad_texto?: string | null
          disponible_ahora?: boolean
          distancia_km?: number | null
          foto_url?: string | null
          gallery_urls?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          plan?: string
          precio_desde?: number
          precio_hasta?: number
          resenas_count?: number
          suspendido?: boolean
          ubicacion_actualizada_at?: string | null
          usuario_id: string
          verificado?: boolean
          verificado_identidad?: boolean
        }
        Update: {
          antecedentes_ok?: boolean
          bio?: string | null
          calificacion_promedio?: number
          categoria_id?: string
          ciudad?: string
          compartir_ubicacion?: boolean
          direccion?: string | null
          disponibilidad_texto?: string | null
          disponible_ahora?: boolean
          distancia_km?: number | null
          foto_url?: string | null
          gallery_urls?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          plan?: string
          precio_desde?: number
          precio_hasta?: number
          resenas_count?: number
          suspendido?: boolean
          ubicacion_actualizada_at?: string | null
          usuario_id?: string
          verificado?: boolean
          verificado_identidad?: boolean
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
            foreignKeyName: "resenas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          cliente_foto_url: string | null
          cliente_id: string
          cliente_nombre: string | null
          comision: number
          created_at: string
          direccion: string
          estado: Database["public"]["Enums"]["reserva_estado"]
          fecha: string
          hora: string
          id: string
          nota: string | null
          prestador_foto_url: string | null
          prestador_id: string
          prestador_nombre: string | null
          prestador_usuario_id: string | null
          servicio_id: string | null
          total: number
        }
        Insert: {
          cliente_foto_url?: string | null
          cliente_id: string
          cliente_nombre?: string | null
          comision?: number
          created_at?: string
          direccion: string
          estado?: Database["public"]["Enums"]["reserva_estado"]
          fecha: string
          hora: string
          id?: string
          nota?: string | null
          prestador_foto_url?: string | null
          prestador_id: string
          prestador_nombre?: string | null
          prestador_usuario_id?: string | null
          servicio_id?: string | null
          total: number
        }
        Update: {
          cliente_foto_url?: string | null
          cliente_id?: string
          cliente_nombre?: string | null
          comision?: number
          created_at?: string
          direccion?: string
          estado?: Database["public"]["Enums"]["reserva_estado"]
          fecha?: string
          hora?: string
          id?: string
          nota?: string | null
          prestador_foto_url?: string | null
          prestador_id?: string
          prestador_nombre?: string | null
          prestador_usuario_id?: string | null
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
          created_at: string
          email: string | null
          foto_url: string | null
          id: string
          nombre: string
          notif_config: Json
          onesignal_player_id: string | null
          tipo: Database["public"]["Enums"]["user_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre: string
          notif_config?: Json
          onesignal_player_id?: string | null
          tipo?: Database["public"]["Enums"]["user_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          notif_config?: Json
          onesignal_player_id?: string | null
          tipo?: Database["public"]["Enums"]["user_type"]
          user_id?: string | null
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      current_usuario_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
