
-- Add location_id to existing tables (nullable for backward compat with existing data)

ALTER TABLE public.residents ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;
ALTER TABLE public.shifts ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;
ALTER TABLE public.incidents ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;
ALTER TABLE public.medications ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;
ALTER TABLE public.pay_runs ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;
ALTER TABLE public.pay_stubs ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;
ALTER TABLE public.payment_batches ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create indexes for location-scoped queries
CREATE INDEX idx_residents_location ON public.residents(location_id);
CREATE INDEX idx_shifts_location ON public.shifts(location_id);
CREATE INDEX idx_incidents_location ON public.incidents(location_id);
CREATE INDEX idx_medications_location ON public.medications(location_id);
CREATE INDEX idx_pay_runs_location ON public.pay_runs(location_id);
CREATE INDEX idx_pay_stubs_location ON public.pay_stubs(location_id);
CREATE INDEX idx_org_memberships_user ON public.org_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON public.org_memberships(org_id);
