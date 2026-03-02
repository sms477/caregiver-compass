
-- Pay runs table (audit trail)
CREATE TABLE public.pay_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_period jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_gross_pay numeric NOT NULL DEFAULT 0,
  total_taxes numeric NOT NULL DEFAULT 0,
  total_net_pay numeric NOT NULL DEFAULT 0,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pay stubs table
CREATE TABLE public.pay_stubs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id uuid REFERENCES public.pay_runs(id) NOT NULL,
  employee_id uuid NOT NULL,
  employee_name text NOT NULL,
  pay_period jsonb NOT NULL,
  line_item jsonb NOT NULL,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Payroll audit log for tracking all changes
CREATE TABLE public.payroll_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id uuid REFERENCES public.pay_runs(id),
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Updated_at trigger for pay_runs
CREATE TRIGGER update_pay_runs_updated_at
  BEFORE UPDATE ON public.pay_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE public.pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_stubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can manage pay runs
CREATE POLICY "Admins can manage pay runs" ON public.pay_runs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage pay stubs
CREATE POLICY "Admins can manage pay stubs" ON public.pay_stubs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Employees can view own pay stubs
CREATE POLICY "Employees can view own pay stubs" ON public.pay_stubs
  FOR SELECT USING (auth.uid() = employee_id);

-- Admins can manage audit log
CREATE POLICY "Admins can manage audit log" ON public.payroll_audit_log
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert audit log entries
CREATE POLICY "Admins can insert audit entries" ON public.payroll_audit_log
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
