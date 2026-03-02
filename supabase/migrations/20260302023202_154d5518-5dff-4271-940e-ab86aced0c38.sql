-- Create shifts table to persist caregiver shift data
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL,
  caregiver_name text NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  is_24_hour boolean NOT NULL DEFAULT false,
  meal_break_taken boolean,
  meal_break_reason text,
  sleep_start timestamptz,
  sleep_end timestamptz,
  sleep_interruptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  adl_reports jsonb NOT NULL DEFAULT '[]'::jsonb,
  emar_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Caregivers can insert their own shifts
CREATE POLICY "Caregivers can insert own shifts" ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caregiver_id);

-- Caregivers can view their own shifts
CREATE POLICY "Caregivers can view own shifts" ON public.shifts
  FOR SELECT TO authenticated
  USING (auth.uid() = caregiver_id);

-- Caregivers can update their own shifts (for clock-out, sleep tracking, etc.)
CREATE POLICY "Caregivers can update own shifts" ON public.shifts
  FOR UPDATE TO authenticated
  USING (auth.uid() = caregiver_id);

-- Admins can view all shifts
CREATE POLICY "Admins can view all shifts" ON public.shifts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all shifts
CREATE POLICY "Admins can update all shifts" ON public.shifts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();