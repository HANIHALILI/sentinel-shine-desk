# StatusGuard — Backend Implementation Guide

## Architecture Overview

```
┌─────────────────┐    ┌──────────────┐    ┌──────────────────┐
│   Frontend      │───▶│   REST API   │───▶│   PostgreSQL     │
│   (this repo)   │    │   (Go/Rust)  │    │   (metadata)     │
│                 │◀──▶│              │    └──────────────────┘
│                 │ WS │              │───▶┌──────────────────┐
└─────────────────┘    └──────┬───────┘    │ TimescaleDB /    │
                              │            │ VictoriaMetrics  │
                       ┌──────▼───────┐    │ (metrics)        │
                       │   Worker     │───▶└──────────────────┘
                       │   (checks)   │
                       └──────────────┘
```

## Components

### 1. REST API Server
- Implements the OpenAPI spec in `docs/openapi.yaml`
- Stateless — horizontally scalable
- Validates OIDC JWT tokens (verify signature against JWKS endpoint)
- RBAC: `admin` (full), `editor` (CRUD pages/incidents), `viewer` (read-only)

### 2. Worker Service
- Runs monitoring checks at configured intervals
- Supports HTTP, HTTPS, TCP, gRPC probes
- Computes latency using **histogram buckets** (not simple averages)
- Writes 1-minute resolution metrics to time-series storage
- Auto-downgrades service status on consecutive failures
- Auto-creates incidents when services go down

### 3. Metrics Storage
Recommended: **TimescaleDB** (PostgreSQL extension) or **VictoriaMetrics**

Schema for TimescaleDB:
```sql
CREATE TABLE metrics (
  service_id UUID NOT NULL,
  timestamp  TIMESTAMPTZ NOT NULL,
  latency_avg    DOUBLE PRECISION,
  latency_p95    DOUBLE PRECISION,
  latency_p99    DOUBLE PRECISION,
  availability   DOUBLE PRECISION,
  PRIMARY KEY (service_id, timestamp)
);

SELECT create_hypertable('metrics', 'timestamp');

-- Retention policy: 7 days at 1m, 90 days at 1h
SELECT add_retention_policy('metrics', INTERVAL '7 days');

-- Continuous aggregate for hourly rollups
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  service_id,
  time_bucket('1 hour', timestamp) AS bucket,
  avg(latency_avg) AS latency_avg,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_p95) AS latency_p95,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_p99) AS latency_p99,
  avg(availability) AS availability
FROM metrics
GROUP BY service_id, bucket;
```

### 4. PostgreSQL (Metadata)
```sql
-- Status Pages
CREATE TABLE status_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(500),
  logo_url TEXT,
  brand_color VARCHAR(7),
  custom_css TEXT,
  broadcast_message TEXT,
  broadcast_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id UUID NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  endpoint TEXT NOT NULL,
  protocol VARCHAR(5) NOT NULL CHECK (protocol IN ('HTTP', 'HTTPS', 'TCP', 'gRPC')),
  check_interval_seconds INT NOT NULL DEFAULT 60 CHECK (check_interval_seconds >= 60),
  timeout_ms INT NOT NULL DEFAULT 5000,
  expected_status_code INT DEFAULT 200,
  status VARCHAR(20) DEFAULT 'operational',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id UUID NOT NULL REFERENCES status_pages(id),
  title VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'investigating',
  severity VARCHAR(10) NOT NULL DEFAULT 'minor',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incident_affected_services (
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, service_id)
);

CREATE TABLE incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcasts
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_page_id UUID NOT NULL REFERENCES status_pages(id),
  message TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. WebSocket Protocol

Connect to `ws://<host>/ws?statusPageId=<uuid>`

Events are JSON:
```json
{
  "type": "service.status_changed",
  "statusPageId": "uuid",
  "payload": {
    "serviceId": "uuid",
    "previousStatus": "operational",
    "newStatus": "degraded"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Event types:
- `service.status_changed`
- `incident.created`
- `incident.updated`
- `metrics.update`
- `broadcast.created`
- `broadcast.expired`

## Health Probes

```
GET /healthz         → 200 OK (liveness)
GET /readyz          → 200 OK (readiness, checks DB connection)
```

## Latency Histogram Implementation

Use HDR Histogram or t-digest for accurate percentile computation:

```go
// Per check, record latency in histogram
histogram.RecordValue(latencyMs)

// Every minute, compute and store:
avg   = histogram.Mean()
p95   = histogram.ValueAtPercentile(95.0)
p99   = histogram.ValueAtPercentile(99.0)
```

Do NOT compute percentiles from averages. Store raw histogram data and compute server-side.
