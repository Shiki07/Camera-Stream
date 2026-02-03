-- Strengthen profiles table RLS policies to be more explicit
-- Current policies use (SELECT auth.uid()) = user_id which is secure,
-- but we'll add explicit authentication checks for clarity

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Recreate policies with explicit authentication requirement
-- These policies now explicitly require authentication via auth.uid() IS NOT NULL

CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authenticated users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authenticated users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);