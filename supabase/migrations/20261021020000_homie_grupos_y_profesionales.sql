-- Grupos de primer nivel + categorías de profesionales (abogados, contadores, ingeniería, salud, educación)
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS grupo text;

INSERT INTO public.categorias (id, nombre, icono, color_fondo, color_hex, slug, grupo) VALUES
  ('legal',      'Abogados',                  'Scale',            '#1E3A8A', '#1E3A8A', 'legal',      'profesionales'),
  ('finanzas',   'Contadores y empresas',     'Calculator',       '#0F766E', '#0F766E', 'finanzas',   'profesionales'),
  ('ingenieria', 'Arquitectura e ingeniería', 'DraftingCompass',  '#7C2D12', '#7C2D12', 'ingenieria', 'profesionales'),
  ('salud-pro',  'Salud profesional',         'Stethoscope',      '#047857', '#047857', 'salud-pro',  'profesionales'),
  ('educacion',  'Clases y educación',        'GraduationCap',    '#9333EA', '#9333EA', 'educacion',  'profesionales')
ON CONFLICT (id) DO NOTHING;

UPDATE public.categorias SET grupo = CASE id
  WHEN 'home' THEN 'hogar' WHEN 'tech-fix' THEN 'hogar' WHEN 'garden' THEN 'hogar' WHEN 'moving' THEN 'hogar'
  WHEN 'beauty' THEN 'personas' WHEN 'health' THEN 'personas' WHEN 'care' THEN 'personas'
  WHEN 'legal' THEN 'profesionales' WHEN 'finanzas' THEN 'profesionales' WHEN 'ingenieria' THEN 'profesionales'
  WHEN 'salud-pro' THEN 'profesionales' WHEN 'educacion' THEN 'profesionales'
  WHEN 'auto' THEN 'vehiculos' WHEN 'pets' THEN 'mascotas'
  WHEN 'events' THEN 'celebraciones' WHEN 'party' THEN 'celebraciones' WHEN 'gifts' THEN 'celebraciones'
  WHEN 'tech' THEN 'tecnologia' ELSE grupo END;

INSERT INTO public.servicios (nombre, categoria_id) VALUES
  ('Abogado de familia','legal'),('Abogado laboral','legal'),('Abogado civil','legal'),('Abogado penal','legal'),
  ('Abogado inmobiliario','legal'),('Abogado tributario','legal'),('Abogado comercial','legal'),('Abogado de extranjería','legal'),
  ('Abogado de consumo','legal'),('Abogado de herencias','legal'),('Abogado de tránsito','legal'),('Asesoría legal online','legal'),
  ('Contador','finanzas'),('Contador auditor','finanzas'),('Declaración de renta','finanzas'),('Inicio de actividades','finanzas'),
  ('Asesoría tributaria','finanzas'),('Administrador de empresas','finanzas'),('Asesoría financiera','finanzas'),
  ('Remuneraciones y RRHH','finanzas'),('Gestión de pymes','finanzas'),('Constitución de empresas','finanzas'),
  ('Arquitecto','ingenieria'),('Ingeniero civil','ingenieria'),('Ingeniero eléctrico','ingenieria'),('Ingeniero estructural','ingenieria'),
  ('Constructor civil','ingenieria'),('Diseño de planos','ingenieria'),('Regularización de construcciones','ingenieria'),('Topógrafo','ingenieria'),
  ('Prevencionista de riesgos','ingenieria'),('Inspección técnica de obras','ingenieria'),('Diseñador de interiores','ingenieria'),('Ingeniero en climatización','ingenieria'),
  ('Enfermera a domicilio','salud-pro'),('Matrona','salud-pro'),('Médico a domicilio','salud-pro'),('Kinesiólogo','salud-pro'),
  ('Nutricionista','salud-pro'),('Psicólogo','salud-pro'),('Fonoaudiólogo','salud-pro'),('Terapeuta ocupacional','salud-pro'),
  ('Podólogo','salud-pro'),('Técnico en enfermería (TENS)','salud-pro'),('Toma de exámenes a domicilio','salud-pro'),('Cuidados paliativos','salud-pro'),
  ('Profesor particular','educacion'),('Preparación PAES','educacion'),('Clases de inglés','educacion'),('Clases de matemáticas','educacion'),
  ('Psicopedagogo','educacion'),('Educadora diferencial','educacion'),('Clases de música','educacion'),('Clases de computación','educacion'),
  ('Clases de manejo','educacion'),('Asesoría de tesis','educacion'),
  ('Masajista','health'),('Yoga y pilates','health'),('Coach de bienestar','health')
ON CONFLICT (nombre, categoria_id) DO NOTHING;

-- Los servicios de salud clínica pasan de "Salud y bienestar" a "Salud profesional"
-- (se mantienen los registros antiguos; solo se re-categorizan los servicios sin prestadores asociados)
UPDATE public.servicios s SET categoria_id = 'salud-pro'
WHERE s.categoria_id = 'health'
  AND s.nombre IN ('Enfermería a domicilio','Kinesiólogo','Nutricionista','Psicólogo online','Enfermera pediátrica')
  AND NOT EXISTS (SELECT 1 FROM public.servicios x WHERE x.categoria_id = 'salud-pro' AND x.nombre = s.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.prestador_servicios ps WHERE ps.servicio_id = s.id);
