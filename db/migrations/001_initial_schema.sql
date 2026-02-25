-- StatusGuard — SQLite Schema
-- Converted from PostgreSQL for SQLite compatibility

-- ============================================================
-- Status Pages
-- ============================================================
CREATE TABLE IF NOT EXISTS status_pages (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  logo_url      TEXT,
  brand_color   TEXT,
  custom_css    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_status_pages_slug ON status_pages (slug);

-- ============================================================
-- Services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id                     TEXT PRIMARY KEY,
  status_page_id         TEXT NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  endpoint               TEXT NOT NULL,
  protocol               TEXT NOT NULL CHECK (protocol IN ('HTTP', 'HTTPS', 'TCP', 'gRPC')),
  check_interval_seconds INTEGER NOT NULL DEFAULT 60 CHECK (check_interval_seconds >= 60),
  timeout_ms             INTEGER NOT NULL DEFAULT 5000,
  expected_status_code   INTEGER DEFAULT 200,
  status                 TEXT NOT NULL DEFAULT 'operational'
                            CHECK (status IN ('operational', 'degraded', 'down', 'maintenance')),
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_status_page ON services (status_page_id);

-- ============================================================
-- Health Check Results
-- ============================================================
CREATE TABLE IF NOT EXISTS health_check_results (
  id                    TEXT PRIMARY KEY,
  service_id            TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status_code           INTEGER,
  response_time_ms      REAL NOT NULL,
  is_healthy            BOOLEAN NOT NULL,
  error_message         TEXT,
  checked_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_check_results_service ON health_check_results (service_id);
CREATE INDEX IF NOT EXISTS idx_health_check_results_checked_at ON health_check_results (checked_at);

-- ============================================================
-- Incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'investigating'
                   CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity      TEXT NOT NULL DEFAULT 'major'
                   CHECK (severity IN ('minor', 'major', 'critical')),
  started_at    TEXT NOT NULL,
  resolved_at   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);

-- ============================================================
-- Incident Affected Services (M2M)
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_affected_services (
  id             TEXT PRIMARY KEY,
  incident_id    TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  service_id     TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at     TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_service_unique
  ON incident_affected_services (incident_id, service_id);

-- ============================================================
-- Incident Updates (Timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_updates (
  id            TEXT PRIMARY KEY,
  incident_id   TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'update'
                   CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'update')),
  message       TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates (incident_id);

-- ============================================================
-- Broadcasts
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id            TEXT PRIMARY KEY,
  message       TEXT NOT NULL,
  expires_at    TEXT,
  created_at    TEXT NOT NULL
);

-- ============================================================
-- Configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default retention: 30 days
INSERT OR IGNORE INTO config (key, value) VALUES ('retention_days', '30');