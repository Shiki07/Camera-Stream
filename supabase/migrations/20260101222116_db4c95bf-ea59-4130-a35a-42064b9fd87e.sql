-- Optimize RLS policies to use (SELECT auth.uid()) pattern for better performance
-- This prevents auth.uid() from being re-evaluated for every row

-- ============ recordings ============
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can create their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can update their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON public.recordings;

CREATE POLICY "Users can view their own recordings" ON public.recordings FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own recordings" ON public.recordings FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own recordings" ON public.recordings FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own recordings" ON public.recordings FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ motion_events ============
DROP POLICY IF EXISTS "Users can view their own motion_events" ON public.motion_events;
DROP POLICY IF EXISTS "Users can create their own motion_events" ON public.motion_events;
DROP POLICY IF EXISTS "Users can update their own motion_events" ON public.motion_events;
DROP POLICY IF EXISTS "Users can delete their own motion_events" ON public.motion_events;

CREATE POLICY "Users can view their own motion_events" ON public.motion_events FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own motion_events" ON public.motion_events FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own motion_events" ON public.motion_events FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own motion_events" ON public.motion_events FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ camera_credentials ============
DROP POLICY IF EXISTS "Users can view their own camera_credentials" ON public.camera_credentials;
DROP POLICY IF EXISTS "Users can create their own camera_credentials" ON public.camera_credentials;
DROP POLICY IF EXISTS "Users can update their own camera_credentials" ON public.camera_credentials;
DROP POLICY IF EXISTS "Users can delete their own camera_credentials" ON public.camera_credentials;

CREATE POLICY "Users can view their own camera_credentials" ON public.camera_credentials FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own camera_credentials" ON public.camera_credentials FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own camera_credentials" ON public.camera_credentials FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own camera_credentials" ON public.camera_credentials FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ profiles ============
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ camera_settings ============
DROP POLICY IF EXISTS "Users can view their own camera_settings" ON public.camera_settings;
DROP POLICY IF EXISTS "Users can create their own camera_settings" ON public.camera_settings;
DROP POLICY IF EXISTS "Users can update their own camera_settings" ON public.camera_settings;
DROP POLICY IF EXISTS "Users can delete their own camera_settings" ON public.camera_settings;

CREATE POLICY "Users can view their own camera_settings" ON public.camera_settings FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own camera_settings" ON public.camera_settings FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own camera_settings" ON public.camera_settings FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own camera_settings" ON public.camera_settings FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ push_subscriptions ============
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ relay_frames ============
DROP POLICY IF EXISTS "Users can view their own relay frames" ON public.relay_frames;
DROP POLICY IF EXISTS "Users can create their own relay frames" ON public.relay_frames;
DROP POLICY IF EXISTS "Users can update their own relay frames" ON public.relay_frames;
DROP POLICY IF EXISTS "Users can delete their own relay frames" ON public.relay_frames;

CREATE POLICY "Users can view their own relay frames" ON public.relay_frames FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own relay frames" ON public.relay_frames FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own relay frames" ON public.relay_frames FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own relay frames" ON public.relay_frames FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ shared_streams ============
DROP POLICY IF EXISTS "Users can view their own shared_streams" ON public.shared_streams;
DROP POLICY IF EXISTS "Users can create their own shared_streams" ON public.shared_streams;
DROP POLICY IF EXISTS "Users can update their own shared_streams" ON public.shared_streams;
DROP POLICY IF EXISTS "Users can delete their own shared_streams" ON public.shared_streams;

CREATE POLICY "Users can view their own shared_streams" ON public.shared_streams FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own shared_streams" ON public.shared_streams FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own shared_streams" ON public.shared_streams FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own shared_streams" ON public.shared_streams FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============ user_tokens ============
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can create their own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.user_tokens;

CREATE POLICY "Users can view their own tokens" ON public.user_tokens FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create their own tokens" ON public.user_tokens FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own tokens" ON public.user_tokens FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own tokens" ON public.user_tokens FOR DELETE USING ((SELECT auth.uid()) = user_id);