
-- Add super_admin access to key tables

-- Shifts
CREATE POLICY "Super admins can manage all shifts"
  ON public.shifts FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Incidents
CREATE POLICY "Super admins can manage all incidents"
  ON public.incidents FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Residents
CREATE POLICY "Super admins can manage all residents"
  ON public.residents FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Medications
CREATE POLICY "Super admins can manage all medications"
  ON public.medications FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Pay runs
CREATE POLICY "Super admins can manage all pay runs"
  ON public.pay_runs FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Pay stubs
CREATE POLICY "Super admins can manage all pay stubs"
  ON public.pay_stubs FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Payment batches
CREATE POLICY "Super admins can manage all payment batches"
  ON public.payment_batches FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Payment items
CREATE POLICY "Super admins can manage all payment items"
  ON public.payment_items FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Profiles
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- Tax forms
CREATE POLICY "Super admins can manage all tax forms"
  ON public.tax_forms FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Tax filings
CREATE POLICY "Super admins can manage all tax filings"
  ON public.tax_filings FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- User roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all payroll audit logs"
  ON public.payroll_audit_log FOR SELECT
  USING (public.is_super_admin(auth.uid()));
