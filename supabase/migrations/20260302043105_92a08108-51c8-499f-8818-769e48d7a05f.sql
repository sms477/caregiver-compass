
-- Residents table
CREATE TABLE public.residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  room text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage residents" ON public.residents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can view residents" ON public.residents
  FOR SELECT USING (public.has_role(auth.uid(), 'caregiver'));

-- Medications table
CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  schedule text NOT NULL DEFAULT 'Morning',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage medications" ON public.medications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can view medications" ON public.medications
  FOR SELECT USING (public.has_role(auth.uid(), 'caregiver'));

-- Updated_at triggers
CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
