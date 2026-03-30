
-- Add file_name column for history display
ALTER TABLE public.rfv_uploads ADD COLUMN IF NOT EXISTS file_name text NOT NULL DEFAULT 'Upload';

-- Add client_count column for quick display
ALTER TABLE public.rfv_uploads ADD COLUMN IF NOT EXISTS client_count integer NOT NULL DEFAULT 0;

-- Drop unique constraint on user_id to allow multiple uploads
ALTER TABLE public.rfv_uploads DROP CONSTRAINT IF EXISTS rfv_uploads_user_id_key;

-- Allow users to delete own uploads
CREATE POLICY "Users can delete own rfv uploads"
  ON public.rfv_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
