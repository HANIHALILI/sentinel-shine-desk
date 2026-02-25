-- Allow admins to delete incident_updates (needed for incident cascade delete)
CREATE POLICY "Admins can delete incident updates"
ON public.incident_updates
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
));
