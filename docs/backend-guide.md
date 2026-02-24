# StatusGuard — Backend Implementation Guide

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│   Frontend      │───▶│   Backend            │───▶│   PostgreSQL     │
│   (this repo)   │    │   (single container) │    │   (all data)     │
│                 │◀──▶│                      │    └──────────────────┘
│                 │ WS │   - REST API         │
└─────────────────┘    │   - Health checker   │
                       │   - Scheduler        │
                       │   - WS hub           │
                       └──────────────────────┘
```

**Single database. Single backend container. No external dependencies.**

## Components

### 1. Backend Server (Single Container)

The backend runs as one process with multiple goroutines/threads:

- **REST API**: Implements `docs/openapi.yaml`. Stateless, horizontally scalable.
- **Health Checker**: Runs HTTP/HTTPS/TCP/gRPC probes at configured intervals.
- **Scheduler**: Triggers checks every 60s per service, manages retention cleanup.
- **WebSocket Hub**: Broadcasts real-time events to connected clients.
- **OIDC Validator**: Verifies JWT tokens against JWKS endpoint.

RBAC: `admin` (full), `editor` (CRUD pages/incidents), `viewer` (read-only).

### 2. PostgreSQL (Single Database)

All data lives in one PostgreSQL instance:

- **Metadata**: status_pages, services, incidents, users, roles
- **Raw Metrics**: `checks` table with per-check latency and status
- **Percentiles**: Computed at query time using `PERCENTILE_CONT()`

See `db/migrations/` for the complete schema.

## Database Schema

### Core Tables

See `db/migrations/001_initial_schema.sql` for full DDL.

Key design decisions:

| Table | Purpose |
|---|---|
| `status_pages` | Multi-tenant isolation by slug |
| `services` | Monitored endpoints, scoped to status_page_id |
| `checks` | Raw health check results (1 row per check) |
| `incidents` | Incident tracking with severity/status |
| `incident_updates` | Timeline entries for incidents |
| `broadcasts` | Banner messages per status page |
| `users` / `roles` / `user_roles` | OIDC user mapping + RBAC |
| `config` | Runtime configuration (retention_days, etc.) |

### Checks Table (Raw Metrics)

```sql
CREATE TABLE checks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY,
  service_id  UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms  INT         NOT NULL,
  is_up       BOOLEAN     NOT NULL,
  status_code INT,
  error       TEXT
);

CREATE INDEX idx_checks_service_time ON checks (service_id, timestamp DESC);
```

**Why raw storage?**

- No precomputed percentiles — avoids aggregation errors
- `PERCENTILE_CONT(0.95)` on 1440 rows (24h × 1/min) completes in <10ms
- Flexible re-aggregation at any resolution without data loss

## Percentile Strategy

All percentiles are computed at query time using PostgreSQL's ordered-set aggregate functions:

```sql
SELECT
  AVG(latency_ms)                                                    AS latency_avg,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)           AS latency_p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)           AS latency_p99,
  (COUNT(*) FILTER (WHERE is_up)::FLOAT / NULLIF(COUNT(*)::FLOAT, 0)) * 100 AS availability
FROM checks
WHERE service_id = $1
  AND timestamp >= NOW() - INTERVAL '24 hours';
```

For bucketed metrics (chart data), use `get_service_metrics()` function from `db/migrations/002_metric_queries.sql`.

**Do NOT precompute percentiles. Do NOT average percentiles. Always compute from raw data.**

## Retention Strategy

### Configuration

Retention is stored in the `config` table:

```sql
SELECT value FROM config WHERE key = 'retention_days';  -- default: 30
```

### Nightly Cleanup

The backend scheduler runs `cleanup_old_checks()` daily:

```sql
SELECT cleanup_old_checks();  -- returns number of deleted rows
```

This deletes all checks older than `retention_days`. The composite index on `(service_id, timestamp DESC)` ensures efficient deletion.

### Partitioning (Optional)

When the `checks` table exceeds ~10M rows, apply `db/migrations/004_partitioning.sql` to partition by month. This enables:

- Fast partition drops instead of row-by-row deletion
- Parallel query execution across partitions
- Better vacuum performance

## Load Calculations

| Parameter | Value |
|---|---|
| Services | 100 |
| Check interval | 60 seconds |
| Checks per day | 144,000 |
| Checks per month | ~4,320,000 |
| Row size (avg) | ~120 bytes |
| Monthly storage | ~500 MB |
| 30-day retention | ~15M rows, ~1.7 GB |

PostgreSQL handles this easily with proper indexing.

### Query Performance

- 24h metrics for 1 service (1440 rows): **<10ms**
- Service summary (24h): **<5ms**
- Retention cleanup (batch delete): **<1s** with index scan

## Health Check Implementation

```go
// Pseudocode for the health checker
func (w *Worker) RunCheck(service Service) {
    start := time.Now()
    var isUp bool
    var statusCode int
    var errMsg string

    switch service.Protocol {
    case "HTTP", "HTTPS":
        resp, err := httpClient.Get(service.Endpoint)
        latency := time.Since(start).Milliseconds()
        if err != nil {
            isUp = false
            errMsg = err.Error()
        } else {
            statusCode = resp.StatusCode
            isUp = (statusCode == service.ExpectedStatusCode)
        }
    case "TCP":
        conn, err := net.DialTimeout("tcp", service.Endpoint, timeout)
        latency := time.Since(start).Milliseconds()
        isUp = (err == nil)
        if err != nil { errMsg = err.Error() }
        if conn != nil { conn.Close() }
    case "gRPC":
        // gRPC health check protocol
    }

    // Store raw check result
    db.Exec(`INSERT INTO checks (service_id, latency_ms, is_up, status_code, error)
             VALUES ($1, $2, $3, $4, $5)`,
        service.ID, latency, isUp, statusCode, errMsg)

    // Auto-incident logic
    failures := db.QueryRow(`SELECT get_consecutive_failures($1)`, service.ID)
    if failures >= 3 && !hasActiveIncident(service.ID) {
        createAutoIncident(service)
        updateServiceStatus(service.ID, "down")
    }

    // Auto-resolve
    if isUp && hasAutoIncident(service.ID) {
        resolveAutoIncident(service.ID)
        updateServiceStatus(service.ID, "operational")
    }
}
```

## Auto-Incident Logic

1. After **3 consecutive failures**, auto-create an incident:
   - Title: `"[Auto] {service.Name} is down"`
   - Severity: `major`
   - Status: `investigating`
2. When service recovers, auto-resolve:
   - Add update: `"Service has recovered automatically"`
   - Set `resolved_at = NOW()`
   - Set service status back to `operational`

Use `get_consecutive_failures()` from `db/migrations/002_metric_queries.sql`.

## WebSocket Protocol

Connect to `ws://<host>/ws?statusPageId=<uuid>`

Events are JSON:
```json
{
  "type": "service.status_changed",
  "statusPageId": "uuid",
  "payload": {
    "serviceId": "uuid",
    "previousStatus": "operational",
    "newStatus": "down"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Event types: `service.status_changed`, `incident.created`, `incident.updated`, `metrics.update`, `broadcast.created`, `broadcast.expired`

## Health Probes

```
GET /healthz     → 200 OK (liveness — always returns OK)
GET /readyz      → 200 OK (readiness — verifies DB connection)
```

## First-Run Behavior

On first OIDC login, if zero users with `admin` role exist, the backend grants `admin` to the first authenticated user. This bootstraps the system without manual SQL.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OIDC_ISSUER` | Yes | OIDC provider issuer URL |
| `OIDC_AUDIENCE` | Yes | Expected JWT audience |
| `LISTEN_ADDR` | No | Server bind address (default: `:8080`) |
| `CHECK_CONCURRENCY` | No | Max concurrent health checks (default: `50`) |
| `RETENTION_CLEANUP_CRON` | No | Cron schedule for cleanup (default: `0 3 * * *`) |
