
-- Contracts table (one-to-one with residents)
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL UNIQUE REFERENCES public.residents(id) ON DELETE CASCADE,
  base_rent numeric NOT NULL DEFAULT 0,
  current_care_surcharge numeric NOT NULL DEFAULT 0,
  pending_care_surcharge numeric NOT NULL DEFAULT 0,
  increase_effective_date date,
  security_deposit numeric NOT NULL DEFAULT 0,
  billing_day integer NOT NULL DEFAULT 1,
  location_id uuid REFERENCES public.locations(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage org contracts"
  ON public.contracts FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Super admins can manage all contracts"
  ON public.contracts FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  resident_name text NOT NULL,
  base_rent numeric NOT NULL DEFAULT 0,
  care_surcharge numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  billing_period text NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamp with time zone,
  location_id uuid REFERENCES public.locations(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage org invoices"
  ON public.invoices FOR ALL
  USING (admin_can_access_location(auth.uid(), location_id));

CREATE POLICY "Super admins can manage all invoices"
  ON public.invoices FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
