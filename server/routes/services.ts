/**
 * Services API Routes
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool.js';

export const servicesRouter = Router();

// GET all services (optionally filtered by status_page_id)
servicesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status_page_id } = req.query;
    const pool = getPool();

    let query = 'SELECT * FROM services ORDER BY created_at DESC';
    const params: any[] = [];

    if (status_page_id) {
      query = 'SELECT * FROM services WHERE status_page_id = $1 ORDER BY created_at DESC';
      params.push(status_page_id);
    }

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET service by ID
servicesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// POST create service
servicesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      status_page_id,
      name,
      endpoint,
      protocol,
      check_interval_seconds,
      timeout_ms,
      expected_status_code,
    } = req.body;

    if (!status_page_id || !name || !endpoint || !protocol) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO services (status_page_id, name, endpoint, protocol, check_interval_seconds, timeout_ms, expected_status_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        status_page_id,
        name,
        endpoint,
        protocol,
        check_interval_seconds || 60,
        timeout_ms || 5000,
        expected_status_code || 200,
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PUT update service
servicesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      name,
      endpoint,
      protocol,
      check_interval_seconds,
      timeout_ms,
      expected_status_code,
      status,
    } = req.body;

    const pool = getPool();
    const result = await pool.query(
      `UPDATE services
       SET name = COALESCE($1, name),
           endpoint = COALESCE($2, endpoint),
           protocol = COALESCE($3, protocol),
           check_interval_seconds = COALESCE($4, check_interval_seconds),
           timeout_ms = COALESCE($5, timeout_ms),
           expected_status_code = COALESCE($6, expected_status_code),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name,
        endpoint,
        protocol,
        check_interval_seconds,
        timeout_ms,
        expected_status_code,
        status,
        req.params.id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE service
servicesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});
