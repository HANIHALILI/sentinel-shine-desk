/**
 * Database initialization and migration runner
 * Supports both PostgreSQL and SQLite
 */

import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import BetterSqlite3 from 'better-sqlite3';
import { Pool } from 'pg';
import { config, isPostgres, isSQLite } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../..');

const migrationFiles = [
  '001_initial_schema.sql',
  '002_metric_queries.sql',
  '003_seed.sql',
];

/**
 * Run all migrations for SQLite
 */
async function runSQLiteMigrations(dbPath: string): Promise<void> {
  const db = new BetterSqlite3(dbPath);
  db.pragma('foreign_keys = ON');

  try {
    console.log('Running SQLite migrations...');

    for (const file of migrationFiles) {
      const filePath = resolve(projectRoot, 'db/migrations', file);
      
      // Skip partitioning migration for SQLite
      if (file === '004_partitioning.sql') {
        console.log(`⊘ Skipping migration: ${file} (not needed for SQLite)`);
        continue;
      }

      const sql = readFileSync(filePath, 'utf-8');

      console.log(`Running migration: ${file}`);
      // Execute SQL statements one by one (SQLite doesn't like multi-statement)
      const statements = sql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          db.exec(statement);
        }
      }
      console.log(`✓ Migration completed: ${file}`);
    }

    console.log('✓ All SQLite migrations completed successfully');
  } catch (error) {
    console.error('SQLite migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Run all migrations for PostgreSQL
 */
async function runPostgresMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('Running PostgreSQL migrations...');

    for (const file of migrationFiles) {
      const filePath = resolve(projectRoot, 'db/migrations', file);
      const sql = readFileSync(filePath, 'utf-8');

      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`✓ Migration completed: ${file}`);
    }

    console.log('✓ All PostgreSQL migrations completed successfully');
  } catch (error) {
    console.error('PostgreSQL migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if SQLite database is already initialized
 */
async function isSQLiteInitialized(dbPath: string): Promise<boolean> {
  try {
    const db = new BetterSqlite3(dbPath);
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='status_pages';
    `).all();
    db.close();
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if PostgreSQL database is already initialized
 */
async function isPostgresInitialized(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'status_pages'
      );
    `);
    return result.rows[0].exists;
  } catch {
    return false;
  }
}

/**
 * Initialize database - supports both SQLite and PostgreSQL
 */
export async function initializeDatabase(): Promise<void> {
  if (isSQLite()) {
    // SQLite initialization
    const dbPath = config.database.sqlitePath;
    
    // Ensure data directory exists
    const dataDir = resolve(dbPath, '..');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Check if already initialized
    const initialized = await isSQLiteInitialized(dbPath);

    if (!initialized) {
      // Run migrations
      await runSQLiteMigrations(dbPath);
    } else {
      console.log('Database already initialized, skipping migrations');
    }
  } else if (isPostgres()) {
    // PostgreSQL initialization
    const pool = new Pool({
      connectionString: config.database.postgresUrl,
    });

    try {
      const initialized = await isPostgresInitialized(pool);

      if (!initialized) {
        await runPostgresMigrations(pool);
      } else {
        console.log('Database already initialized, skipping migrations');
      }
    } finally {
      await pool.end();
    }
  }
}

