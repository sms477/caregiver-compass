
-- Staff certifications table
CREATE TABLE public.staff_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cert_type text NOT NULL, -- e.g. 'CPR', 'First Aid', 'TB Clearance', 'Food Handler'
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, expired, pending_renewal
  location_id uuid REFERENCES public.locations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage org staff certs"
  ON public.staff_certifications FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Super admins can manage all staff certs"
  ON public.staff_certifications FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view own certs"
  ON public.staff_certifications FOR SELECT
  USING (auth.uid() = profile_id);

CREATE TRIGGER update_staff_certifications_updated_at
  BEFORE UPDATE ON public.staff_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
