
CREATE TABLE public.tax_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL,
  employee_name text NOT NULL,
  tax_year integer NOT NULL,
  form_type text NOT NULL DEFAULT 'W-2',
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  generated_by uuid NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  distributed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tax forms" ON public.tax_forms
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own tax forms" ON public.tax_forms
  FOR SELECT USING (auth.uid() = employee_id);

CREATE TRIGGER update_tax_forms_updated_at
  BEFORE UPDATE ON public.tax_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
