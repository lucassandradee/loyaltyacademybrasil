
-- Add unique constraint on user_id (one diagnostic per user)
ALTER TABLE public.diagnostic_responses ADD CONSTRAINT diagnostic_responses_user_id_key UNIQUE (user_id);

-- Allow users to update their own diagnostic responses
CREATE POLICY "Users can update own responses"
ON public.diagnostic_responses
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
