
-- Add unique constraint for upsert support on daily_care_logs
ALTER TABLE public.daily_care_logs
  ADD CONSTRAINT daily_care_logs_resident_log_date_unique UNIQUE (resident_id, log_date);
