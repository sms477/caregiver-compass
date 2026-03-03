
-- Add worker type and work state to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS worker_type text NOT NULL DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS work_state text NOT NULL DEFAULT 'CA';
