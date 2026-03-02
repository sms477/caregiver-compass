
-- Tighten the audit_log insert policy to authenticated users only
DROP POLICY "System can insert audit log" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
