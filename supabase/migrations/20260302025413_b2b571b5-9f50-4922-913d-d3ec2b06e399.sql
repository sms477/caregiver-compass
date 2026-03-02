
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pay_type text NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS annual_salary numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_differentials jsonb NOT NULL DEFAULT '[]'::jsonb;
