-- StatusGuard — Migration 004: Optional Range Partitioning
-- Apply ONLY when checks table exceeds ~10M rows.
-- This migration converts `checks` to a partitioned table.
--
-- WARNING: This is a destructive migration. Back up data first.
-- Recommended approach: create new partitioned table, migrate data, swap.

BEGIN;

-- Step 1: Rename existing table
ALTER TABLE checks RENAME TO checks_old;

-- Step 2: Create partitioned table
CREATE TABLE checks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY,
  service_id  UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms  INT         NOT NULL,
  is_up       BOOLEAN     NOT NULL,
  status_code INT,
  error       TEXT
) PARTITION BY RANGE (timestamp);

-- Step 3: Create monthly partitions (adjust as needed)
-- Generate partitions for current year + next year
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', NOW());
  end_date   DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..23 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'checks_' || TO_CHAR(start_date, 'YYYY_MM');

    EXECUTE FORMAT(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF checks FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );

    start_date := end_date;
  END LOOP;
END $$;

-- Step 4: Recreate indexes on partitioned table
CREATE INDEX idx_checks_service_time ON checks (service_id, timestamp DESC);
CREATE INDEX idx_checks_down ON checks (service_id, timestamp DESC) WHERE is_up = false;

-- Step 5: Migrate data
INSERT INTO checks (service_id, timestamp, latency_ms, is_up, status_code, error)
SELECT service_id, timestamp, latency_ms, is_up, status_code, error
FROM checks_old;

-- Step 6: Drop old table
DROP TABLE checks_old;

COMMIT;
