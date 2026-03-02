
ALTER TABLE public.shifts
  ADD COLUMN clock_in_location jsonb DEFAULT NULL,
  ADD COLUMN clock_out_location jsonb DEFAULT NULL,
  ADD COLUMN second_meal_break_taken boolean DEFAULT NULL,
  ADD COLUMN second_meal_break_reason text DEFAULT NULL;
