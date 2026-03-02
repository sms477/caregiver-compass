
-- 1. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create locations table
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  license_number text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create org_memberships table
CREATE TABLE public.org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'caregiver',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id, location_id, role)
);

ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE user_id = _user_id AND org_id = _org_id
  ) OR public.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.user_has_location_access(_user_id uuid, _location_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m
      JOIN public.locations l ON l.org_id = m.org_id
      WHERE m.user_id = _user_id
        AND l.id = _location_id
        AND (m.location_id IS NULL OR m.location_id = _location_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.user_has_role_at_location(_user_id uuid, _location_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m
      JOIN public.locations l ON l.org_id = m.org_id
      WHERE m.user_id = _user_id
        AND l.id = _location_id
        AND (m.location_id IS NULL OR m.location_id = _location_id)
        AND m.role = _role
    )
$$;

-- 5. RLS for organizations
CREATE POLICY "Super admins can manage all orgs"
  ON public.organizations FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can view their org"
  ON public.organizations FOR SELECT
  USING (public.user_in_org(auth.uid(), id));

CREATE POLICY "Org owners can update their org"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- 6. RLS for locations
CREATE POLICY "Super admins can manage all locations"
  ON public.locations FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can manage locations"
  ON public.locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships
      WHERE user_id = auth.uid()
        AND org_id = locations.org_id
        AND role = 'admin'
        AND location_id IS NULL
    )
  );

CREATE POLICY "Members can view their locations"
  ON public.locations FOR SELECT
  USING (public.user_has_location_access(auth.uid(), id));

-- 7. RLS for org_memberships
CREATE POLICY "Super admins can manage all memberships"
  ON public.org_memberships FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can manage memberships"
  ON public.org_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships me
      WHERE me.user_id = auth.uid()
        AND me.org_id = org_memberships.org_id
        AND me.role = 'admin'
        AND me.location_id IS NULL
    )
  );

CREATE POLICY "Users can view own memberships"
  ON public.org_memberships FOR SELECT
  USING (user_id = auth.uid());
