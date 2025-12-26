-- Fix critical security issue: relay_frames table is publicly readable
-- Add user_id column to relay_frames for owner-scoped access

-- 1. Add user_id column to relay_frames
ALTER TABLE public.relay_frames ADD COLUMN user_id uuid;

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read relay frames" ON public.relay_frames;
DROP POLICY IF EXISTS "Authenticated users can delete frames" ON public.relay_frames;
DROP POLICY IF EXISTS "Authenticated users can push frames" ON public.relay_frames;
DROP POLICY IF EXISTS "Authenticated users can update frames" ON public.relay_frames;

-- 3. Create proper owner-scoped RLS policies
CREATE POLICY "Users can view their own relay frames"
ON public.relay_frames
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own relay frames"
ON public.relay_frames
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own relay frames"
ON public.relay_frames
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own relay frames"
ON public.relay_frames
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Delete any existing orphaned frames (frames without user_id)
DELETE FROM public.relay_frames WHERE user_id IS NULL;