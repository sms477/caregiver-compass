
-- Fix security definer view by setting it to use invoker's permissions
ALTER VIEW public.resident_acuity_summary SET (security_invoker = on);
