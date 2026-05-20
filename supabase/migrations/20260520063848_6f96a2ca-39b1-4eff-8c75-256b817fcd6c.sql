
-- ENUMs
CREATE TYPE public.user_type AS ENUM ('cliente','prestador');
CREATE TYPE public.reserva_estado AS ENUM ('pendiente','confirmada','en_camino','completada','cancelada');

-- usuarios
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text UNIQUE,
  foto_url text,
  tipo public.user_type NOT NULL DEFAULT 'cliente',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- categorias
CREATE TABLE public.categorias (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  icono text NOT NULL,
  color_fondo text NOT NULL
);

-- servicios
CREATE TABLE public.servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria_id text NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  descripcion text,
  UNIQUE (nombre, categoria_id)
);

-- prestadores
CREATE TABLE public.prestadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  categoria_id text NOT NULL REFERENCES public.categorias(id),
  bio text,
  calificacion_promedio numeric(2,1) NOT NULL DEFAULT 5.0,
  reseñas_count integer NOT NULL DEFAULT 0,
  precio_desde integer NOT NULL DEFAULT 0,
  precio_hasta integer NOT NULL DEFAULT 0,
  disponible_ahora boolean NOT NULL DEFAULT true,
  disponibilidad_texto text,
  direccion text,
  lat numeric(9,6),
  lng numeric(9,6),
  distancia_km numeric(4,1),
  gallery_urls text[] NOT NULL DEFAULT '{}'
);

-- prestador_servicios
CREATE TABLE public.prestador_servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  servicio_id uuid NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
  precio integer NOT NULL,
  UNIQUE (prestador_id, servicio_id)
);

-- reservas
CREATE TABLE public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.usuarios(id),
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id),
  servicio_id uuid REFERENCES public.servicios(id),
  fecha date NOT NULL,
  hora time NOT NULL,
  direccion text NOT NULL,
  estado public.reserva_estado NOT NULL DEFAULT 'pendiente',
  nota text,
  total integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- resenas
CREATE TABLE public.resenas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL,
  cliente_id uuid NOT NULL REFERENCES public.usuarios(id),
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  calificacion integer NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prestadores_categoria ON public.prestadores(categoria_id);
CREATE INDEX idx_servicios_categoria ON public.servicios(categoria_id);
CREATE INDEX idx_ps_prestador ON public.prestador_servicios(prestador_id);
CREATE INDEX idx_ps_servicio ON public.prestador_servicios(servicio_id);
CREATE INDEX idx_reservas_cliente ON public.reservas(cliente_id);
CREATE INDEX idx_resenas_prestador ON public.resenas(prestador_id);

-- RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestador_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;

-- Demo (sin auth): lectura pública de catálogos y reservas
CREATE POLICY "public read usuarios" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "public read categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "public read servicios" ON public.servicios FOR SELECT USING (true);
CREATE POLICY "public read prestadores" ON public.prestadores FOR SELECT USING (true);
CREATE POLICY "public read prestador_servicios" ON public.prestador_servicios FOR SELECT USING (true);
CREATE POLICY "public read reservas" ON public.reservas FOR SELECT USING (true);
CREATE POLICY "public read resenas" ON public.resenas FOR SELECT USING (true);

-- Insert público para reservas y reseñas (flujo demo sin login)
CREATE POLICY "public insert reservas" ON public.reservas FOR INSERT WITH CHECK (true);
CREATE POLICY "public insert resenas" ON public.resenas FOR INSERT WITH CHECK (true);
