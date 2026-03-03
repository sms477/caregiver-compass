
-- Add recurring flag and label to expenses
ALTER TABLE public.expenses ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN recurring_label TEXT;
