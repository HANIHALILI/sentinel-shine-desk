/**
 * Health Check Service
 * 
 * Background scheduler that monitors all active services.
 * - Runs every 60 seconds
 * - Performs HTTP/TCP health checks
 * - Stores metrics in 'checks' table
 * - Auto-creates incidents when service goes down
 * - Auto-resolves incidents when service recovers
 */

import http from 'http';
import https from 'https';
import { Socket } from 'net';
import { getPool } from '../db/pool.js';

// Configuration
export const CHECK_INTERVAL = 60 * 1000; // 60 seconds in milliseconds
const CONSECUTIVE_FAILURES_FOR_INCIDENT = 2; // Create incident after 2 consecutive failures
const CONSECUTIVE_SUCCESS_FOR_RECOVERY = 2; // Resolve incident after 2 consecutive successes

interface ServiceCheck {
  id: string;
  statusPageId: string;
  name: string;
  endpoint: string;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'gRPC';
  timeoutMs: number;
  expectedStatusCode: number;
  status: string;
}

interface CheckResult {
  serviceId: string;
  isUp: boolean;
  latencyMs: number;
  statusCode?: number;
  error?: string;
}

/**
 * Perform HTTP/HTTPS health check
 */
async function checkHttp(service: ServiceCheck): Promise<CheckResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(service.endpoint);
    const isHttps = service.protocol === 'HTTPS';
    const client = isHttps ? https : http;

    const request = client.get(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        timeout: service.timeoutMs,
      },
      (response) => {
        const latencyMs = Date.now() - startTime;
        const statusCode = response.statusCode || 0;
        const isUp = statusCode === service.expectedStatusCode;

        resolve({
          serviceId: service.id,
          isUp,
          latencyMs,
          statusCode,
        });

        // Drain the response to release connection
        response.on('data', () => {});
        response.on('end', () => {});
      }
    );

    request.on('timeout', () => {
      request.destroy();
      resolve({
        serviceId: service.id,
        isUp: false,
        latencyMs: service.timeoutMs,
        error: `Timeout after ${service.timeoutMs}ms`,
      });
    });

    request.on('error', (error) => {
      const latencyMs = Date.now() - startTime;
      resolve({
        serviceId: service.id,
        isUp: false,
        latencyMs,
        error: error.message,
      });
    });
  });
}

/**
 * Perform TCP health check
 */
async function checkTcp(service: ServiceCheck): Promise<CheckResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const [host, port] = service.endpoint.split(':');

    if (!port) {
      return resolve({
        serviceId: service.id,
        isUp: false,
        latencyMs: 0,
        error: 'Invalid TCP endpoint format (expected: host:port)',
      });
    }

    const socket = new Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({
        serviceId: service.id,
        isUp: false,
        latencyMs: service.timeoutMs,
        error: `TCP timeout after ${service.timeoutMs}ms`,
      });
    }, service.timeoutMs);

    socket.on('connect', () => {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      socket.destroy();

      resolve({
        serviceId: service.id,
        isUp: true,
        latencyMs,
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      resolve({
        serviceId: service.id,
        isUp: false,
        latencyMs,
        error: error.message,
      });
    });

    socket.connect(parseInt(port), host);
  });
}

/**
 * Perform health check based on protocol
 */
export async function performHealthCheck(service: ServiceCheck): Promise<CheckResult> {
  if (service.protocol === 'HTTP' || service.protocol === 'HTTPS') {
    return checkHttp(service);
  } else if (service.protocol === 'TCP') {
    return checkTcp(service);
  } else {
    return {
      serviceId: service.id,
      isUp: false,
      latencyMs: 0,
      error: `Unsupported protocol: ${service.protocol}`,
    };
  }
}

/**
 * Store check result in database
 */
export async function storeCheckResult(pool, result: CheckResult): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO checks (service_id, latency_ms, is_up, status_code, error)
       VALUES ($1, $2, $3, $4, $5)`,
      [result.serviceId, result.latencyMs, result.isUp, result.statusCode || null, result.error || null]
    );
  } catch (error) {
    console.error('Failed to store check result:', error);
  }
}

/**
 * Check if service has consecutive failures
 */
async function hasConsecutiveFailures(
  pool,
  serviceId: string,
  consecutiveCount: number
): Promise<boolean> {
  try {
    const result = await pool.query(
      `WITH recent_checks AS (
        SELECT is_up
        FROM checks
        WHERE service_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      )
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE NOT is_up) as failures
      FROM recent_checks`,
      [serviceId, consecutiveCount]
    );

    const row = result.rows[0];
    return row.total >= consecutiveCount && row.failures === consecutiveCount;
  } catch (error) {
    console.error('Error checking consecutive failures:', error);
    return false;
  }
}

/**
 * Check if service has consecutive successes
 */
async function hasConsecutiveSuccesses(
  pool,
  serviceId: string,
  consecutiveCount: number
): Promise<boolean> {
  try {
    const result = await pool.query(
      `WITH recent_checks AS (
        SELECT is_up
        FROM checks
        WHERE service_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      )
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_up) as successes
      FROM recent_checks`,
      [serviceId, consecutiveCount]
    );

    const row = result.rows[0];
    return row.total >= consecutiveCount && row.successes === consecutiveCount;
  } catch (error) {
    console.error('Error checking consecutive successes:', error);
    return false;
  }
}

/**
 * Get active incident for service (if any)
 */
async function getActiveIncident(pool, serviceId: string) {
  try {
    const result = await pool.query(
      `SELECT i.* FROM incidents i
       WHERE i.status != 'resolved'
         AND i.id IN (
           SELECT incident_id FROM incident_affected_services 
           WHERE service_id = $1
         )
       LIMIT 1`,
      [serviceId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting active incident:', error);
    return null;
  }
}

/**
 * Auto-create incident when service goes down
 */
async function createAutoIncident(pool, service: ServiceCheck): Promise<void> {
  try {
    // Check if already has active incident
    const existingIncident = await getActiveIncident(pool, service.id);
    if (existingIncident) {
      return; // Incident already exists
    }

    // Create new incident
    const incidentResult = await pool.query(
      `INSERT INTO incidents (status_page_id, title, status, severity)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        service.statusPageId,
        `Service "${service.name}" is down`,
        'investigating',
        'major',
      ]
    );

    const incidentId = incidentResult.rows[0].id;

    // Link affected service
    await pool.query(
      `INSERT INTO incident_affected_services (incident_id, service_id)
       VALUES ($1, $2)`,
      [incidentId, service.id]
    );

    // Add initial update
    await pool.query(
      `INSERT INTO incident_updates (incident_id, status, message)
       VALUES ($1, $2, $3)`,
      [incidentId, 'investigating', `Service health check failed. Latency: unknown. Status: down`]
    );

    console.log(`✗ Auto-created incident for service: ${service.name}`);
  } catch (error) {
    console.error('Failed to create auto-incident:', error);
  }
}

/**
 * Auto-resolve incident when service recovers
 */
async function resolveAutoIncident(pool, service: ServiceCheck): Promise<void> {
  try {
    const incident = await getActiveIncident(pool, service.id);
    if (!incident) {
      return; // No active incident
    }

    // Update incident status
    await pool.query(
      `UPDATE incidents
       SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [incident.id]
    );

    // Add resolution update
    await pool.query(
      `INSERT INTO incident_updates (incident_id, status, message)
       VALUES ($1, $2, $3)`,
      [incident.id, 'resolved', `Service "${service.name}" has recovered and is operational.`]
    );

    console.log(`✓ Auto-resolved incident for service: ${service.name}`);
  } catch (error) {
    console.error('Failed to resolve auto-incident:', error);
  }
}

/**
 * Update service status in database
 */
async function updateServiceStatus(pool, serviceId: string, status: string): Promise<void> {
  try {
    await pool.query('UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2', [
      status,
      serviceId,
    ]);
  } catch (error) {
    console.error('Failed to update service status:', error);
  }
}

/**
 * Run a single health check cycle
 */
export async function runHealthCheckCycle(): Promise<void> {
  const pool = getPool();

  try {
    // Fetch all active services
    const servicesResult = await pool.query('SELECT * FROM services ORDER BY status_page_id');
    const services = servicesResult.rows as ServiceCheck[];

    if (services.length === 0) {
      console.log('[HealthCheck] No services to check');
      return;
    }

    console.log(`[HealthCheck] Checking ${services.length} services...`);

    // Perform checks in parallel
    const checkResults = await Promise.all(services.map((service) => performHealthCheck(service)));

    // Process results
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      const result = checkResults[i];

      // Store the check result
      await storeCheckResult(pool, result);

      // Determine if service is down or up
      if (!result.isUp) {
        // Service is DOWN - check if we need to create incident
        const hasFailures = await hasConsecutiveFailures(
          pool,
          service.id,
          CONSECUTIVE_FAILURES_FOR_INCIDENT
        );

        if (hasFailures) {
          await createAutoIncident(pool, service);
          await updateServiceStatus(pool, service.id, 'down');
        } else {
          await updateServiceStatus(pool, service.id, 'degraded');
        }
      } else {
        // Service is UP - check if we need to resolve incident
        const hasSuccesses = await hasConsecutiveSuccesses(
          pool,
          service.id,
          CONSECUTIVE_SUCCESS_FOR_RECOVERY
        );

        if (hasSuccesses) {
          await resolveAutoIncident(pool, service);
          await updateServiceStatus(pool, service.id, 'operational');
        }
      }
    }

    console.log(`[HealthCheck] Cycle complete at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Health check cycle failed:', error);
  }
}

/**
 * Start the health check scheduler
 */
export function startHealthCheckScheduler(): NodeJS.Timeout {
  console.log('Starting health check scheduler (every 60 seconds)...');

  // Run immediately on startup (with error handling)
  runHealthCheckCycle().catch((error) => {
    console.error('⚠️ Initial health check failed:', error);
    console.log('This is expected if PostgreSQL is not yet running');
  });

  // Then run on interval
  const interval = setInterval(() => {
    runHealthCheckCycle().catch((error) => {
      console.error('⚠️ Health check cycle error:', error);
      console.log('Continuing with next cycle...');
    });
  }, CHECK_INTERVAL);

  console.log('✓ Health check scheduler started');
  return interval;
}

/**
 * Stop the health check scheduler
 */
export function stopHealthCheckScheduler(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  console.log('Health check scheduler stopped');
}
