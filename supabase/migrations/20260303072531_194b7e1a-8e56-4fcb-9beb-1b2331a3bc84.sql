
-- Add RCFE regulation columns to residents
ALTER TABLE public.residents
  ADD COLUMN care_level text NOT NULL DEFAULT 'Basic',
  ADD COLUMN is_hospice boolean NOT NULL DEFAULT false,
  ADD COLUMN is_non_ambulatory boolean NOT NULL DEFAULT false,
  ADD COLUMN acuity_score integer NOT NULL DEFAULT 0,
  ADD COLUMN restricted_conditions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN last_assessment_date date,
  ADD COLUMN lic602a_expiry date,
  ADD COLUMN dnr_on_file boolean NOT NULL DEFAULT false,
  ADD COLUMN hospice_agency_id uuid;

-- Create hospice_agencies table
CREATE TABLE public.hospice_agencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  nurse_phone_24h text,
  office_phone text,
  location_id uuid REFERENCES public.locations(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add FK from residents to hospice_agencies
ALTER TABLE public.residents
  ADD CONSTRAINT residents_hospice_agency_id_fkey
  FOREIGN KEY (hospice_agency_id) REFERENCES public.hospice_agencies(id) ON DELETE SET NULL;

-- Enable RLS on hospice_agencies
ALTER TABLE public.hospice_agencies ENABLE ROW LEVEL SECURITY;

-- RLS policies for hospice_agencies (mirror residents policies)
CREATE POLICY "Admins can manage org hospice agencies"
  ON public.hospice_agencies FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Caregivers can view hospice agencies"
  ON public.hospice_agencies FOR SELECT
  USING (has_role(auth.uid(), 'caregiver'::app_role));

CREATE POLICY "Super admins can manage all hospice agencies"
  ON public.hospice_agencies FOR ALL
  USING (is_super_admin(auth.uid()));

-- Updated_at trigger for hospice_agencies
CREATE TRIGGER update_hospice_agencies_updated_at
  BEFORE UPDATE ON public.hospice_agencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
