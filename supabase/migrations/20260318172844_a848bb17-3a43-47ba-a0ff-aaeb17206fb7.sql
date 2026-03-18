
-- Fix: Caregivers should only see residents at their location, not ALL residents globally

-- Drop overly-broad caregiver SELECT policies
DROP POLICY IF EXISTS "Caregivers can view residents" ON public.residents;
DROP POLICY IF EXISTS "Caregivers can view medications" ON public.medications;
DROP POLICY IF EXISTS "Caregivers can view hospice agencies" ON public.hospice_agencies;

-- Recreate with location-aware checks
CREATE POLICY "Caregivers can view location residents"
ON public.residents FOR SELECT TO public
USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "Caregivers can view location medications"
ON public.medications FOR SELECT TO public
USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "Caregivers can view location hospice agencies"
ON public.hospice_agencies FOR SELECT TO public
USING (user_has_location_access(auth.uid(), location_id));
