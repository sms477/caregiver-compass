
-- Create security definer function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role = 'admin'
      AND location_id IS NULL
  )
$$;

-- Fix org_memberships policy
DROP POLICY IF EXISTS "Org admins can manage memberships" ON public.org_memberships;
CREATE POLICY "Org admins can manage memberships"
ON public.org_memberships
FOR ALL
USING (public.is_org_admin(auth.uid(), org_id));

-- Fix locations policy
DROP POLICY IF EXISTS "Org admins can manage locations" ON public.locations;
CREATE POLICY "Org admins can manage locations"
ON public.locations
FOR ALL
USING (public.is_org_admin(auth.uid(), org_id));
