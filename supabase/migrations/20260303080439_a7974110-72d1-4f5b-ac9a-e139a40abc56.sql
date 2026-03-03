
-- 90-day notices sent to residents/families
CREATE TABLE public.notices_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  notice_type text NOT NULL DEFAULT '90_day_rate_increase', -- 90_day_rate_increase, care_level_change, etc.
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  effective_date date NOT NULL, -- when the new rate kicks in
  old_care_surcharge numeric NOT NULL DEFAULT 0,
  new_care_surcharge numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active, applied, cancelled
  notes text,
  location_id uuid REFERENCES public.locations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notices_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage org notices"
  ON public.notices_sent FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Super admins can manage all notices"
  ON public.notices_sent FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_notices_sent_updated_at
  BEFORE UPDATE ON public.notices_sent
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
