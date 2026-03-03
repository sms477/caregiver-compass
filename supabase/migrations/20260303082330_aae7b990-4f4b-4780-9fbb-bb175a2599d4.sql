
-- Create pipeline stage enum
CREATE TYPE public.prospect_stage AS ENUM ('new', 'contacted', 'tour_scheduled', 'follow_up', 'converted');
CREATE TYPE public.prospect_source AS ENUM ('referral', 'website', 'walk_in', 'phone', 'other');
CREATE TYPE public.prospect_priority AS ENUM ('low', 'medium', 'high');

-- Prospects / Leads table
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source prospect_source NOT NULL DEFAULT 'other',
  preferred_move_in_date DATE,
  stage prospect_stage NOT NULL DEFAULT 'new',
  priority prospect_priority NOT NULL DEFAULT 'medium',
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  assigned_staff_id UUID,
  location_id UUID REFERENCES public.locations(id),
  converted_resident_id UUID REFERENCES public.residents(id),
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can manage org prospects"
  ON public.prospects FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Super admins can manage all prospects"
  ON public.prospects FOR ALL
  USING (is_super_admin(auth.uid()));

-- Family / Contacts table
CREATE TABLE public.family_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.family_contacts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_family_contacts_updated_at
  BEFORE UPDATE ON public.family_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can manage org family contacts"
  ON public.family_contacts FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Super admins can manage all family contacts"
  ON public.family_contacts FOR ALL
  USING (is_super_admin(auth.uid()));

-- Tours / Visits table
CREATE TABLE public.tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_staff_id UUID,
  assigned_staff_name TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can manage org tours"
  ON public.tours FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Super admins can manage all tours"
  ON public.tours FOR ALL
  USING (is_super_admin(auth.uid()));

-- Prospect notes / activity log
CREATE TABLE public.prospect_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'note',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prospect notes"
  ON public.prospect_notes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = prospect_id
    AND admin_can_access_location(auth.uid(), p.location_id)
  ));

CREATE POLICY "Super admins can manage all prospect notes"
  ON public.prospect_notes FOR ALL
  USING (is_super_admin(auth.uid()));
