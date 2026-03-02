
ALTER TABLE public.payment_items
ADD COLUMN payment_method text NOT NULL DEFAULT 'direct_deposit',
ADD COLUMN check_number text NULL;
