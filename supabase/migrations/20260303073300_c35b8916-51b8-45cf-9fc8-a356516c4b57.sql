
-- Create daily_care_logs table for ADL tracking
CREATE TABLE public.daily_care_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  staff_name text NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  bathing text NOT NULL DEFAULT 'Independent',
  dressing text NOT NULL DEFAULT 'Independent',
  toileting text NOT NULL DEFAULT 'Independent',
  transfers text NOT NULL DEFAULT 'Independent',
  eating text NOT NULL DEFAULT 'Independent',
  notes text,
  location_id uuid REFERENCES public.locations(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_care_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage org care logs"
  ON public.daily_care_logs FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Caregivers can insert care logs"
  ON public.daily_care_logs FOR INSERT
  WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Caregivers can view own care logs"
  ON public.daily_care_logs FOR SELECT
  USING (auth.uid() = staff_id);

CREATE POLICY "Super admins can manage all care logs"
  ON public.daily_care_logs FOR ALL
  USING (is_super_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_daily_care_logs_updated_at
  BEFORE UPDATE ON public.daily_care_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient querying by resident + date range
CREATE INDEX idx_daily_care_logs_resident_date ON public.daily_care_logs (resident_id, log_date DESC);
