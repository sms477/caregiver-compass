
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL DEFAULT 'other',
  resident_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  resident_name text NOT NULL,
  staff_id uuid NOT NULL,
  staff_name text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL,
  immediate_action text NOT NULL DEFAULT '',
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_notes text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage incidents" ON public.incidents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can insert incidents" ON public.incidents
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'caregiver'));

CREATE POLICY "Caregivers can view own incidents" ON public.incidents
  FOR SELECT USING (auth.uid() = staff_id);

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
