/**
 * Status Pages API Routes
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool.js';

export const statusPagesRouter = Router();

// GET all status pages
statusPagesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, name, slug, description, logo_url, brand_color, created_at, updated_at FROM status_pages ORDER BY created_at DESC'
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching status pages:', error);
    res.status(500).json({ error: 'Failed to fetch status pages' });
  }
});

// GET status page by slug
statusPagesRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, name, slug, description, logo_url, brand_color, custom_css, created_at, updated_at FROM status_pages WHERE slug = $1',
      [req.params.slug]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching status page:', error);
    res.status(500).json({ error: 'Failed to fetch status page' });
  }
});

// POST create status page
statusPagesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, logo_url, brand_color, custom_css } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO status_pages (name, slug, description, logo_url, brand_color, custom_css)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, slug, description, logo_url, brand_color, created_at, updated_at`,
      [name, slug, description || null, logo_url || null, brand_color || null, custom_css || null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating status page:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create status page' });
  }
});

// PUT update status page
statusPagesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, logo_url, brand_color, custom_css } = req.body;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE status_pages
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           description = COALESCE($3, description),
           logo_url = COALESCE($4, logo_url),
           brand_color = COALESCE($5, brand_color),
           custom_css = COALESCE($6, custom_css),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, slug, description, logo_url, brand_color, created_at, updated_at`,
      [name, slug, description, logo_url, brand_color, custom_css, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating status page:', error);
    res.status(500).json({ error: 'Failed to update status page' });
  }
});

// DELETE status page
statusPagesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM status_pages WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting status page:', error);
    res.status(500).json({ error: 'Failed to delete status page' });
  }
});
