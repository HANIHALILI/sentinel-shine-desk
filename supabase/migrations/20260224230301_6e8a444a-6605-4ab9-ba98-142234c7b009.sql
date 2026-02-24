-- Fix all RLS policies: drop restrictive, recreate as permissive

-- ===== status_pages =====
DROP POLICY IF EXISTS "Status pages are viewable by everyone" ON public.status_pages;
DROP POLICY IF EXISTS "Admins and editors can insert status pages" ON public.status_pages;
DROP POLICY IF EXISTS "Admins and editors can update status pages" ON public.status_pages;
DROP POLICY IF EXISTS "Admins can delete status pages" ON public.status_pages;

CREATE POLICY "Status pages are viewable by everyone" ON public.status_pages FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert status pages" ON public.status_pages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins and editors can update status pages" ON public.status_pages FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins can delete status pages" ON public.status_pages FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- ===== services =====
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
DROP POLICY IF EXISTS "Admins and editors can insert services" ON public.services;
DROP POLICY IF EXISTS "Admins and editors can update services" ON public.services;
DROP POLICY IF EXISTS "Admins can delete services" ON public.services;

CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert services" ON public.services FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins and editors can update services" ON public.services FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins can delete services" ON public.services FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- ===== incidents =====
DROP POLICY IF EXISTS "Incidents are viewable by everyone" ON public.incidents;
DROP POLICY IF EXISTS "Admins and editors can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admins and editors can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admins can delete incidents" ON public.incidents;

CREATE POLICY "Incidents are viewable by everyone" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert incidents" ON public.incidents FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins and editors can update incidents" ON public.incidents FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins can delete incidents" ON public.incidents FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- ===== incident_updates =====
DROP POLICY IF EXISTS "Incident updates viewable by everyone" ON public.incident_updates;
DROP POLICY IF EXISTS "Admins and editors can insert incident updates" ON public.incident_updates;

CREATE POLICY "Incident updates viewable by everyone" ON public.incident_updates FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert incident updates" ON public.incident_updates FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));

-- ===== incident_affected_services =====
DROP POLICY IF EXISTS "Incident affected services viewable by everyone" ON public.incident_affected_services;
DROP POLICY IF EXISTS "Admins and editors can insert incident affected services" ON public.incident_affected_services;
DROP POLICY IF EXISTS "Admins can delete incident affected services" ON public.incident_affected_services;

CREATE POLICY "Incident affected services viewable by everyone" ON public.incident_affected_services FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert incident affected services" ON public.incident_affected_services FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins can delete incident affected services" ON public.incident_affected_services FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- ===== broadcasts =====
DROP POLICY IF EXISTS "Broadcasts are viewable by everyone" ON public.broadcasts;
DROP POLICY IF EXISTS "Admins and editors can insert broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Admins can delete broadcasts" ON public.broadcasts;

CREATE POLICY "Broadcasts are viewable by everyone" ON public.broadcasts FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admins can delete broadcasts" ON public.broadcasts FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- ===== checks =====
DROP POLICY IF EXISTS "Checks are viewable by everyone" ON public.checks;
DROP POLICY IF EXISTS "Admins and editors can insert checks" ON public.checks;

CREATE POLICY "Checks are viewable by everyone" ON public.checks FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert checks" ON public.checks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','editor')));

-- ===== config =====
DROP POLICY IF EXISTS "Config is viewable by everyone" ON public.config;
DROP POLICY IF EXISTS "Admins can update config" ON public.config;

CREATE POLICY "Config is viewable by everyone" ON public.config FOR SELECT USING (true);
CREATE POLICY "Admins can update config" ON public.config FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can insert config" ON public.config FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- ===== profiles =====
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
