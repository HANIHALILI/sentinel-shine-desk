-- StatusGuard — Migration 001: Initial Schema
-- PostgreSQL-only. No external TSDB.
-- Run with: psql -f 001_initial_schema.sql

BEGIN;

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Status Pages
-- ============================================================
CREATE TABLE status_pages (
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

CREATE INDEX idx_status_pages_slug ON status_pages (slug);

-- ============================================================
-- Services
-- ============================================================
CREATE TABLE services (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id         UUID         NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  name                   VARCHAR(100) NOT NULL,
  endpoint               TEXT         NOT NULL,
  protocol               VARCHAR(5)   NOT NULL CHECK (protocol IN ('HTTP', 'HTTPS', 'TCP', 'gRPC')),
  check_interval_seconds INT          NOT NULL DEFAULT 60 CHECK (check_interval_seconds >= 60),
  timeout_ms             INT          NOT NULL DEFAULT 5000,
  expected_status_code   INT          DEFAULT 200,
  status                 VARCHAR(20)  NOT NULL DEFAULT 'operational'
                                      CHECK (status IN ('operational', 'degraded', 'down', 'maintenance')),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_status_page ON services (status_page_id);

-- ============================================================
-- Raw Metrics (health checks)
-- Single source of truth. Percentiles computed at query time.
-- ============================================================
CREATE TABLE checks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY,
  service_id  UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms  INT         NOT NULL,  -- response time in milliseconds
  is_up       BOOLEAN     NOT NULL,  -- true = successful check
  status_code INT,                   -- HTTP status code (NULL for TCP/gRPC)
  error       TEXT,                  -- error message if check failed
  PRIMARY KEY (id)
);

-- Critical composite index for time-range queries per service
CREATE INDEX idx_checks_service_time ON checks (service_id, timestamp DESC);

-- Partial index for fast "down" lookups (incident auto-creation)
CREATE INDEX idx_checks_down ON checks (service_id, timestamp DESC) WHERE is_up = false;

-- ============================================================
-- Incidents
-- ============================================================
CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id  UUID         NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'investigating'
                               CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity        VARCHAR(10)  NOT NULL DEFAULT 'minor'
                               CHECK (severity IN ('minor', 'major', 'critical')),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status_page ON incidents (status_page_id, created_at DESC);
CREATE INDEX idx_incidents_active ON incidents (status_page_id) WHERE status != 'resolved';

CREATE TABLE incident_affected_services (
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, service_id)
);

CREATE TABLE incident_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID         NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status      VARCHAR(20)  NOT NULL
              CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  message     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_updates_incident ON incident_updates (incident_id, created_at);

-- ============================================================
-- Broadcasts
-- ============================================================
CREATE TABLE broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id  UUID NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_active ON broadcasts (status_page_id, expires_at)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- ============================================================
-- Users & RBAC
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub         VARCHAR(255) NOT NULL UNIQUE,  -- OIDC subject claim
  email       VARCHAR(255),
  name        VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

CREATE TABLE roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('admin', 'editor', 'viewer'))
);

CREATE TABLE user_roles (
  user_id UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT     NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- Configuration
-- ============================================================
CREATE TABLE config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default retention: 30 days
INSERT INTO config (key, value) VALUES ('retention_days', '30');

COMMIT;
