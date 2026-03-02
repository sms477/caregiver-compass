
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS w4 jsonb NOT NULL DEFAULT '{"additionalWithholding": 0, "isExempt": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS deductions jsonb NOT NULL DEFAULT '[]'::jsonb;
