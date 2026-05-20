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
          icono: string
          id: string
          nombre: string
        }
        Insert: {
          color_fondo: string
          icono: string
          id: string
          nombre: string
        }
        Update: {
          color_fondo?: string
          icono?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      mensajes: {
        Row: {
          contenido: string
          created_at: string
          id: string
          remitente_id: string
          reserva_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          remitente_id: string
          reserva_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
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
          reserva_id: string
          stripe_session_id: string | null
        }
        Insert: {
          comision: number
          created_at?: string
          estado?: string
          id?: string
          moneda?: string
          monto_prestador: number
          monto_total: number
          reserva_id: string
          stripe_session_id?: string | null
        }
        Update: {
          comision?: number
          created_at?: string
          estado?: string
          id?: string
          moneda?: string
          monto_prestador?: number
          monto_total?: number
          reserva_id?: string
          stripe_session_id?: string | null
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
          bio: string | null
          calificacion_promedio: number
          categoria_id: string
          direccion: string | null
          disponibilidad_texto: string | null
          disponible_ahora: boolean
          distancia_km: number | null
          gallery_urls: string[]
          id: string
          lat: number | null
          lng: number | null
          precio_desde: number
          precio_hasta: number
          resenas_count: number
          usuario_id: string
          verificado: boolean
        }
        Insert: {
          bio?: string | null
          calificacion_promedio?: number
          categoria_id: string
          direccion?: string | null
          disponibilidad_texto?: string | null
          disponible_ahora?: boolean
          distancia_km?: number | null
          gallery_urls?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          precio_desde?: number
          precio_hasta?: number
          resenas_count?: number
          usuario_id: string
          verificado?: boolean
        }
        Update: {
          bio?: string | null
          calificacion_promedio?: number
          categoria_id?: string
          direccion?: string | null
          disponibilidad_texto?: string | null
          disponible_ahora?: boolean
          distancia_km?: number | null
          gallery_urls?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          precio_desde?: number
          precio_hasta?: number
          resenas_count?: number
          usuario_id?: string
          verificado?: boolean
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
      resenas: {
        Row: {
          calificacion: number
          cliente_id: string
          comentario: string | null
          created_at: string
          id: string
          prestador_id: string
          reserva_id: string | null
        }
        Insert: {
          calificacion: number
          cliente_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          prestador_id: string
          reserva_id?: string | null
        }
        Update: {
          calificacion?: number
          cliente_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          prestador_id?: string
          reserva_id?: string | null
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
          cliente_id: string
          created_at: string
          direccion: string
          estado: Database["public"]["Enums"]["reserva_estado"]
          fecha: string
          hora: string
          id: string
          nota: string | null
          prestador_id: string
          servicio_id: string | null
          total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          direccion: string
          estado?: Database["public"]["Enums"]["reserva_estado"]
          fecha: string
          hora: string
          id?: string
          nota?: string | null
          prestador_id: string
          servicio_id?: string | null
          total: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          direccion?: string
          estado?: Database["public"]["Enums"]["reserva_estado"]
          fecha?: string
          hora?: string
          id?: string
          nota?: string | null
          prestador_id?: string
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
      usuarios: {
        Row: {
          created_at: string
          email: string | null
          foto_url: string | null
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["user_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre: string
          tipo?: Database["public"]["Enums"]["user_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["user_type"]
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_usuario_id: { Args: never; Returns: string }
    }
    Enums: {
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
