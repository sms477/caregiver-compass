
-- 1. Create audit_log table for medication and incident changes
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  old_data jsonb DEFAULT NULL,
  new_data jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit log"
  ON public.audit_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reviewers can view audit log"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "System can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- 2. Medications audit trigger
CREATE OR REPLACE FUNCTION public.audit_medications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, performed_by, new_data)
    VALUES ('medications', NEW.id, 'INSERT', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, performed_by, old_data, new_data)
    VALUES ('medications', NEW.id, 'UPDATE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, performed_by, old_data)
    VALUES ('medications', OLD.id, 'DELETE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_medications
  AFTER INSERT OR UPDATE OR DELETE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.audit_medications();

-- 3. Incidents audit trigger
CREATE OR REPLACE FUNCTION public.audit_incidents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, performed_by, new_data)
    VALUES ('incidents', NEW.id, 'INSERT', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, performed_by, old_data, new_data)
    VALUES ('incidents', NEW.id, 'UPDATE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, performed_by, old_data)
    VALUES ('incidents', OLD.id, 'DELETE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_incidents
  AFTER INSERT OR UPDATE OR DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.audit_incidents();

-- 4. Reviewer read-only RLS policies
CREATE POLICY "Reviewers can view shifts"
  ON public.shifts FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view pay runs"
  ON public.pay_runs FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view pay stubs"
  ON public.pay_stubs FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view incidents"
  ON public.incidents FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view payroll audit log"
  ON public.payroll_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view tax forms"
  ON public.tax_forms FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view tax filings"
  ON public.tax_filings FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view residents"
  ON public.residents FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view medications"
  ON public.medications FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'::app_role));
