/**
 * Incidents API Routes
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool.js';

export const incidentsRouter = Router();

// GET all incidents
incidentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status_page_id } = req.query;
    const pool = getPool();

    let query = 'SELECT * FROM incidents ORDER BY created_at DESC';
    const params: any[] = [];

    if (status_page_id) {
      query = 'SELECT * FROM incidents WHERE status_page_id = $1 ORDER BY created_at DESC';
      params.push(status_page_id);
    }

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// GET incident by ID
incidentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// POST create incident
incidentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { status_page_id, title, status, severity } = req.body;

    if (!status_page_id || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO incidents (status_page_id, title, status, severity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [status_page_id, title, status || 'investigating', severity || 'minor']
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

// PUT update incident
incidentsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, status, severity, resolved_at } = req.body;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE incidents
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           severity = COALESCE($3, severity),
           resolved_at = COALESCE($4, resolved_at),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, status, severity, resolved_at, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// DELETE incident
incidentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query('DELETE FROM incidents WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ error: 'Failed to delete incident' });
  }
});
