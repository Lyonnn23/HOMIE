
CREATE OR REPLACE FUNCTION public.recalc_prestador_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prestador uuid := COALESCE(NEW.prestador_id, OLD.prestador_id);
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT COALESCE(AVG(calificacion), 5.0), COUNT(*)
    INTO v_avg, v_count
  FROM public.resenas
  WHERE prestador_id = v_prestador;

  UPDATE public.prestadores
     SET calificacion_promedio = ROUND(v_avg::numeric, 2),
         resenas_count = v_count
   WHERE id = v_prestador;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_rating_ins ON public.resenas;
CREATE TRIGGER trg_recalc_rating_ins
AFTER INSERT ON public.resenas
FOR EACH ROW EXECUTE FUNCTION public.recalc_prestador_rating();

DROP TRIGGER IF EXISTS trg_recalc_rating_del ON public.resenas;
CREATE TRIGGER trg_recalc_rating_del
AFTER DELETE ON public.resenas
FOR EACH ROW EXECUTE FUNCTION public.recalc_prestador_rating();
