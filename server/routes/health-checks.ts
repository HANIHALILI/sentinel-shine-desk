/**
 * Health Checks API Routes
 * View check history and metrics for services
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool.js';

export const healthChecksRouter = Router();

// POST trigger manual health check for a service
healthChecksRouter.post('/:serviceId/check', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const pool = getPool();

    // Fetch service details
    const serviceResult = await pool.query(
      `SELECT id, status_page_id, name, endpoint, protocol, timeout_ms, expected_status_code
       FROM services WHERE id = $1`,
      [serviceId]
    );
    if (!serviceResult.rows.length) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = serviceResult.rows[0];

    // Dynamically import and execute health check
    try {
      const { performHealthCheck, storeCheckResult } = await import('../services/health-check.js');

      // Perform the check
      const result = await performHealthCheck({
        id: service.id,
        statusPageId: service.status_page_id,
        name: service.name,
        endpoint: service.endpoint,
        protocol: service.protocol,
        timeoutMs: service.timeout_ms,
        expectedStatusCode: service.expected_status_code,
        status: 'operational',
      });

      await storeCheckResult(pool, result);

      res.json({
        serviceId: result.serviceId,
        isUp: result.isUp,
        latencyMs: result.latencyMs,
        statusCode: result.statusCode || null,
        error: result.error || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Health check execution error:', error);
      res.status(500).json({ error: 'Failed to execute health check' });
    }
  } catch (error) {
    console.error('Error triggering manual health check:', error);
    res.status(500).json({ error: 'Failed to perform health check' });
  }
});

// GET all recent checks for a service
healthChecksRouter.get('/:serviceId', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { hours = 24, limit = 100 } = req.query;

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, service_id, timestamp, latency_ms, is_up, status_code, error
       FROM checks
       WHERE service_id = $1
         AND timestamp >= NOW() - INTERVAL '1 hour' * $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [serviceId, parseInt(hours as string) || 24, parseInt(limit as string) || 100]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching health checks:', error);
    res.status(500).json({ error: 'Failed to fetch health checks' });
  }
});

// GET metrics summary for a service
healthChecksRouter.get('/:serviceId/summary', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { hours = 24 } = req.query;

    const pool = getPool();
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_checks,
         COUNT(*) FILTER (WHERE is_up) as successful_checks,
         COUNT(*) FILTER (WHERE NOT is_up) as failed_checks,
         ROUND(100.0 * COUNT(*) FILTER (WHERE is_up) / NULLIF(COUNT(*), 0), 2) as availability_percent,
         ROUND(AVG(latency_ms)::NUMERIC, 2) as avg_latency_ms,
         ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 2) as p95_latency_ms,
         ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 2) as p99_latency_ms,
         MIN(latency_ms) as min_latency_ms,
         MAX(latency_ms) as max_latency_ms
       FROM checks
       WHERE service_id = $1
         AND timestamp >= NOW() - INTERVAL '1 hour' * $2`,
      [serviceId, parseInt(hours as string) || 24]
    );

    res.json({ data: result.rows[0] || {} });
  } catch (error) {
    console.error('Error fetching health check summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET check history with aggregation (grouped by interval)
healthChecksRouter.get('/:serviceId/history', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { hours = 24, interval = '5 minutes' } = req.query;

    const pool = getPool();
    const result = await pool.query(
      `SELECT 
         DATE_TRUNC($3, timestamp) as bucket,
         COUNT(*) as check_count,
         COUNT(*) FILTER (WHERE is_up) as up_count,
         ROUND(100.0 * COUNT(*) FILTER (WHERE is_up) / NULLIF(COUNT(*), 0), 2) as availability_percent,
         ROUND(AVG(latency_ms)::NUMERIC, 2) as avg_latency_ms,
         ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 2) as p95_latency_ms
       FROM checks
       WHERE service_id = $1
         AND timestamp >= NOW() - INTERVAL '1 hour' * $2
       GROUP BY DATE_TRUNC($3, timestamp)
       ORDER BY bucket DESC`,
      [serviceId, parseInt(hours as string) || 24, interval]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching check history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET all checks for a status page (across all services)
healthChecksRouter.get('/page/:statusPageId/summary', async (req: Request, res: Response) => {
  try {
    const { statusPageId } = req.params;
    const { hours = 24 } = req.query;

    const pool = getPool();
    const result = await pool.query(
      `SELECT 
         s.id as service_id,
         s.name as service_name,
         COUNT(*) as total_checks,
         COUNT(*) FILTER (WHERE c.is_up) as successful_checks,
         ROUND(100.0 * COUNT(*) FILTER (WHERE c.is_up) / NULLIF(COUNT(*), 0), 2) as availability_percent,
         ROUND(AVG(c.latency_ms)::NUMERIC, 2) as avg_latency_ms
       FROM services s
       LEFT JOIN checks c ON s.id = c.service_id
         AND c.timestamp >= NOW() - INTERVAL '1 hour' * $2
       WHERE s.status_page_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [statusPageId, parseInt(hours as string) || 24]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching page health summary:', error);
    res.status(500).json({ error: 'Failed to fetch page health' });
  }
});
