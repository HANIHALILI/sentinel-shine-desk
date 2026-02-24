
-- StatusGuard — Full Schema for Supabase
-- Tables: status_pages, services, checks, incidents, incident_updates, 
--         incident_affected_services, broadcasts, profiles, config

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Profiles (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE,
  email      TEXT,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'viewer' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Status Pages
-- ============================================================
CREATE TABLE public.status_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(50)  NOT NULL UNIQUE,
  description   VARCHAR(500),
  logo_url      TEXT,
  brand_color   VARCHAR(7),
  custom_css    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_pages_slug ON public.status_pages (slug);

ALTER TABLE public.status_pages ENABLE ROW LEVEL SECURITY;

-- Public read access for status pages
CREATE POLICY "Status pages are viewable by everyone"
  ON public.status_pages FOR SELECT USING (true);

-- Admin/editor can manage
CREATE POLICY "Admins and editors can insert status pages"
  ON public.status_pages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins and editors can update status pages"
  ON public.status_pages FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins can delete status pages"
  ON public.status_pages FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Services
-- ============================================================
CREATE TABLE public.services (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id         UUID         NOT NULL REFERENCES public.status_pages(id) ON DELETE CASCADE,
  name                   VARCHAR(100) NOT NULL,
  endpoint               TEXT         NOT NULL DEFAULT '',
  protocol               VARCHAR(5)   NOT NULL DEFAULT 'HTTPS' CHECK (protocol IN ('HTTP', 'HTTPS', 'TCP', 'gRPC')),
  check_interval_seconds INT          NOT NULL DEFAULT 60,
  timeout_ms             INT          NOT NULL DEFAULT 5000,
  expected_status_code   INT          DEFAULT 200,
  status                 VARCHAR(20)  NOT NULL DEFAULT 'operational'
                                      CHECK (status IN ('operational', 'degraded', 'down', 'maintenance')),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_status_page ON public.services (status_page_id);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone"
  ON public.services FOR SELECT USING (true);

CREATE POLICY "Admins and editors can insert services"
  ON public.services FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins and editors can update services"
  ON public.services FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins can delete services"
  ON public.services FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Health Checks (raw metrics)
-- ============================================================
CREATE TABLE public.checks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id  UUID        NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms  INT         NOT NULL,
  is_up       BOOLEAN     NOT NULL,
  status_code INT,
  error       TEXT
);

CREATE INDEX idx_checks_service_time ON public.checks (service_id, timestamp DESC);

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checks are viewable by everyone"
  ON public.checks FOR SELECT USING (true);

CREATE POLICY "Admins and editors can insert checks"
  ON public.checks FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- ============================================================
-- Incidents
-- ============================================================
CREATE TABLE public.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id  UUID         NOT NULL REFERENCES public.status_pages(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'investigating'
                               CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity        VARCHAR(10)  NOT NULL DEFAULT 'minor'
                               CHECK (severity IN ('minor', 'major', 'critical')),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status_page ON public.incidents (status_page_id, created_at DESC);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Incidents are viewable by everyone"
  ON public.incidents FOR SELECT USING (true);

CREATE POLICY "Admins and editors can insert incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins and editors can update incidents"
  ON public.incidents FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins can delete incidents"
  ON public.incidents FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Incident Affected Services (junction)
-- ============================================================
CREATE TABLE public.incident_affected_services (
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, service_id)
);

ALTER TABLE public.incident_affected_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Incident affected services viewable by everyone"
  ON public.incident_affected_services FOR SELECT USING (true);

CREATE POLICY "Admins and editors can insert incident affected services"
  ON public.incident_affected_services FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins can delete incident affected services"
  ON public.incident_affected_services FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Incident Updates (timeline)
-- ============================================================
CREATE TABLE public.incident_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID         NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  status      VARCHAR(20)  NOT NULL
              CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  message     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_updates_incident ON public.incident_updates (incident_id, created_at);

ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Incident updates viewable by everyone"
  ON public.incident_updates FOR SELECT USING (true);

CREATE POLICY "Admins and editors can insert incident updates"
  ON public.incident_updates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- ============================================================
-- Broadcasts
-- ============================================================
CREATE TABLE public.broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id  UUID NOT NULL REFERENCES public.status_pages(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broadcasts are viewable by everyone"
  ON public.broadcasts FOR SELECT USING (true);

CREATE POLICY "Admins and editors can insert broadcasts"
  ON public.broadcasts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins can delete broadcasts"
  ON public.broadcasts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Config table
-- ============================================================
CREATE TABLE public.config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO public.config (key, value) VALUES ('retention_days', '30');

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config is viewable by everyone"
  ON public.config FOR SELECT USING (true);

CREATE POLICY "Admins can update config"
  ON public.config FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Enable realtime for key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;

-- ============================================================
-- Metric query function (RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_service_metrics(
  p_service_id  UUID,
  p_start       TIMESTAMPTZ,
  p_end         TIMESTAMPTZ
)
RETURNS TABLE (
  bucket        TIMESTAMPTZ,
  latency_avg   DOUBLE PRECISION,
  latency_p95   DOUBLE PRECISION,
  latency_p99   DOUBLE PRECISION,
  availability  DOUBLE PRECISION,
  check_count   BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('minute', timestamp) AS bucket,
    AVG(latency_ms)::DOUBLE PRECISION AS latency_avg,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION AS latency_p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION AS latency_p99,
    (COUNT(*) FILTER (WHERE is_up)::DOUBLE PRECISION / NULLIF(COUNT(*)::DOUBLE PRECISION, 0)) * 100.0 AS availability,
    COUNT(*) AS check_count
  FROM public.checks
  WHERE service_id = p_service_id
    AND timestamp >= p_start
    AND timestamp < p_end
  GROUP BY date_trunc('minute', timestamp)
  ORDER BY bucket;
$$;

-- ============================================================
-- Service summary function (RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_service_summary(
  p_service_id UUID,
  p_hours      INT DEFAULT 24
)
RETURNS TABLE (
  availability   DOUBLE PRECISION,
  avg_latency    DOUBLE PRECISION,
  p95_latency    DOUBLE PRECISION,
  p99_latency    DOUBLE PRECISION,
  total_checks   BIGINT,
  failed_checks  BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (COUNT(*) FILTER (WHERE is_up)::DOUBLE PRECISION / NULLIF(COUNT(*)::DOUBLE PRECISION, 0)) * 100.0,
    AVG(latency_ms)::DOUBLE PRECISION,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION,
    COUNT(*),
    COUNT(*) FILTER (WHERE NOT is_up)
  FROM public.checks
  WHERE service_id = p_service_id
    AND timestamp >= NOW() - (p_hours || ' hours')::INTERVAL;
$$;

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_status_pages_updated_at
  BEFORE UPDATE ON public.status_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
