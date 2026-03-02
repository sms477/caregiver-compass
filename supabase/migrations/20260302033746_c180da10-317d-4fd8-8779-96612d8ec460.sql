
-- Add bank account info to employee profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_routing_number text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_type text DEFAULT 'checking';

-- Payment batches for tracking direct deposit processing
CREATE TABLE public.payment_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id uuid REFERENCES public.pay_runs(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  payment_count integer NOT NULL DEFAULT 0,
  initiated_by uuid REFERENCES auth.users(id) NOT NULL,
  initiated_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Individual payment line items
CREATE TABLE public.payment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid REFERENCES public.payment_batches(id) NOT NULL,
  employee_id uuid NOT NULL,
  employee_name text NOT NULL,
  amount numeric NOT NULL,
  bank_name text,
  account_last_four text,
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Triggers
CREATE TRIGGER update_payment_batches_updated_at
  BEFORE UPDATE ON public.payment_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_items_updated_at
  BEFORE UPDATE ON public.payment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment batches" ON public.payment_batches
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage payment items" ON public.payment_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own payments" ON public.payment_items
  FOR SELECT USING (auth.uid() = employee_id);
