
-- Security definer function: check if user is admin of a given org
CREATE OR REPLACE FUNCTION public.admin_can_access_org(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT _org_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.org_memberships
      WHERE user_id = _user_id AND org_id = _org_id AND role = 'admin'
    )
  )
$$;

-- Security definer function: check if user is admin of the org that owns a location
CREATE OR REPLACE FUNCTION public.admin_can_access_location(_user_id uuid, _location_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT _location_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.org_memberships m
    JOIN public.locations l ON l.org_id = m.org_id
    WHERE m.user_id = _user_id AND l.id = _location_id AND m.role = 'admin'
  )
$$;

-- ===== PROFILES: scope admin access by org_id =====
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view org profiles"
  ON public.profiles FOR SELECT
  USING (public.admin_can_access_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update org profiles"
  ON public.profiles FOR UPDATE
  USING (public.admin_can_access_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete org profiles"
  ON public.profiles FOR DELETE
  USING (public.admin_can_access_org(auth.uid(), org_id));

-- ===== SHIFTS: scope admin access by location_id =====
DROP POLICY IF EXISTS "Admins can view all shifts" ON public.shifts;
CREATE POLICY "Admins can view org shifts"
  ON public.shifts FOR SELECT
  USING (public.admin_can_access_location(auth.uid(), location_id));

DROP POLICY IF EXISTS "Admins can update all shifts" ON public.shifts;
CREATE POLICY "Admins can update org shifts"
  ON public.shifts FOR UPDATE
  USING (public.admin_can_access_location(auth.uid(), location_id));

-- ===== PAY_RUNS: scope admin access by location_id =====
DROP POLICY IF EXISTS "Admins can manage pay runs" ON public.pay_runs;
CREATE POLICY "Admins can manage org pay runs"
  ON public.pay_runs FOR ALL
  USING (public.admin_can_access_location(auth.uid(), location_id));

-- ===== PAY_STUBS: scope admin access by location_id =====
DROP POLICY IF EXISTS "Admins can manage pay stubs" ON public.pay_stubs;
CREATE POLICY "Admins can manage org pay stubs"
  ON public.pay_stubs FOR ALL
  USING (public.admin_can_access_location(auth.uid(), location_id));

-- ===== RESIDENTS: scope admin access by location_id =====
DROP POLICY IF EXISTS "Admins can manage residents" ON public.residents;
CREATE POLICY "Admins can manage org residents"
  ON public.residents FOR ALL
  USING (public.admin_can_access_location(auth.uid(), location_id));

-- ===== INCIDENTS: scope admin access by location_id =====
DROP POLICY IF EXISTS "Admins can manage incidents" ON public.incidents;
CREATE POLICY "Admins can manage org incidents"
  ON public.incidents FOR ALL
  USING (public.admin_can_access_location(auth.uid(), location_id));

-- ===== MEDICATIONS: scope admin access by location_id =====
DROP POLICY IF EXISTS "Admins can manage medications" ON public.medications;
CREATE POLICY "Admins can manage org medications"
  ON public.medications FOR ALL
  USING (public.admin_can_access_location(auth.uid(), location_id));

-- ===== AUDIT_LOG: scope admin access =====
DROP POLICY IF EXISTS "Admins can manage audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== PAYMENT_BATCHES: scope by location =====
DROP POLICY IF EXISTS "Admins can manage payment batches" ON public.payment_batches;
CREATE POLICY "Admins can manage org payment batches"
  ON public.payment_batches FOR ALL
  USING (public.admin_can_access_location(auth.uid(), location_id));

-- ===== PAYMENT_ITEMS: keep has_role since no direct location =====
-- (these are already scoped through batch_id -> payment_batches)

-- ===== PAYROLL_AUDIT_LOG: keep has_role for now =====

-- ===== USER_ROLES: scope admin access =====
-- Admins should only manage roles for users in their org
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
