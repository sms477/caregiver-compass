
-- Table to track electronic tax filings and tax remittance payments
CREATE TABLE public.tax_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year integer NOT NULL,
  filing_type text NOT NULL DEFAULT 'federal', -- 'federal', 'state', 'remittance'
  form_type text NOT NULL DEFAULT 'W-2', -- 'W-2', '941', 'DE9', 'remittance'
  agency text NOT NULL DEFAULT 'IRS', -- 'IRS', 'CA_EDD', 'CA_FTB'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'accepted', 'rejected'
  filed_by uuid NOT NULL,
  filed_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmation_number text,
  amount numeric DEFAULT 0, -- for remittance payments
  period_label text, -- e.g. "Q1 2025", "Annual 2025"
  notes text,
  filing_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.tax_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tax filings"
  ON public.tax_filings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_tax_filings_updated_at
  BEFORE UPDATE ON public.tax_filings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
