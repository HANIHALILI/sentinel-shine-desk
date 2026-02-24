-- StatusGuard — Migration 002: Metric Query Functions
-- Query-time percentile computation using native PostgreSQL.
-- No precomputed aggregates. All computed from raw `checks` table.

BEGIN;

-- ============================================================
-- Get aggregated metrics for a service over a time range
-- Returns bucketed data at the requested resolution.
--
-- Usage:
--   SELECT * FROM get_service_metrics(
--     '550e8400-e29b-41d4-a716-446655440000',
--     '1 minute'::INTERVAL,
--     NOW() - INTERVAL '24 hours',
--     NOW()
--   );
-- ============================================================
CREATE OR REPLACE FUNCTION get_service_metrics(
  p_service_id  UUID,
  p_resolution  INTERVAL,
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
LANGUAGE sql STABLE
AS $$
  SELECT
    time_bucket AS bucket,
    AVG(latency_ms)::DOUBLE PRECISION AS latency_avg,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION AS latency_p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION AS latency_p99,
    (COUNT(*) FILTER (WHERE is_up)::DOUBLE PRECISION / NULLIF(COUNT(*)::DOUBLE PRECISION, 0)) * 100.0 AS availability,
    COUNT(*) AS check_count
  FROM (
    SELECT
      -- Floor timestamp to bucket boundary
      date_trunc('minute', timestamp) -
        ((EXTRACT(EPOCH FROM date_trunc('minute', timestamp))::BIGINT %
          EXTRACT(EPOCH FROM p_resolution)::BIGINT) * INTERVAL '1 second') AS time_bucket,
      latency_ms,
      is_up
    FROM checks
    WHERE service_id = p_service_id
      AND timestamp >= p_start
      AND timestamp < p_end
  ) bucketed
  GROUP BY time_bucket
  ORDER BY time_bucket;
$$;

-- ============================================================
-- Get overall service stats (availability, latency) for display
-- ============================================================
CREATE OR REPLACE FUNCTION get_service_summary(
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
LANGUAGE sql STABLE
AS $$
  SELECT
    (COUNT(*) FILTER (WHERE is_up)::DOUBLE PRECISION / NULLIF(COUNT(*)::DOUBLE PRECISION, 0)) * 100.0,
    AVG(latency_ms)::DOUBLE PRECISION,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::DOUBLE PRECISION,
    COUNT(*),
    COUNT(*) FILTER (WHERE NOT is_up)
  FROM checks
  WHERE service_id = p_service_id
    AND timestamp >= NOW() - (p_hours || ' hours')::INTERVAL;
$$;

-- ============================================================
-- Retention cleanup — call from pg_cron or backend scheduler
-- Deletes checks older than configured retention_days
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_checks()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_retention_days INT;
  v_deleted BIGINT;
BEGIN
  SELECT value::INT INTO v_retention_days FROM config WHERE key = 'retention_days';
  IF v_retention_days IS NULL THEN
    v_retention_days := 30;
  END IF;

  DELETE FROM checks
  WHERE timestamp < NOW() - (v_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================
-- Consecutive failure detection for auto-incident creation
-- Returns the count of consecutive failed checks for a service
-- ============================================================
CREATE OR REPLACE FUNCTION get_consecutive_failures(p_service_id UUID)
RETURNS INT
LANGUAGE sql STABLE
AS $$
  WITH ordered_checks AS (
    SELECT is_up,
           ROW_NUMBER() OVER (ORDER BY timestamp DESC) AS rn
    FROM checks
    WHERE service_id = p_service_id
    ORDER BY timestamp DESC
    LIMIT 100
  )
  SELECT COALESCE(MIN(rn) - 1, 0)::INT
  FROM ordered_checks
  WHERE is_up = true;
$$;

COMMIT;
