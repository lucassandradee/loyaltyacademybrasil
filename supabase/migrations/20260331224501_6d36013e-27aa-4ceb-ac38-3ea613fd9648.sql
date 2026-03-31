
CREATE TABLE public.nbo_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_data jsonb NOT NULL,
  file_name text NOT NULL DEFAULT 'Upload',
  client_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nbo_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nbo uploads" ON public.nbo_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nbo uploads" ON public.nbo_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nbo uploads" ON public.nbo_uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own nbo uploads" ON public.nbo_uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.cx_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_data jsonb NOT NULL,
  file_name text NOT NULL DEFAULT 'Upload',
  ticket_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cx_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cx uploads" ON public.cx_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cx uploads" ON public.cx_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cx uploads" ON public.cx_uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cx uploads" ON public.cx_uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);
