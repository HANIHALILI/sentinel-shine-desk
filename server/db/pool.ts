/**
 * Database connection pool - unified interface
 * Supports both PostgreSQL and SQLite
 */

import BetterSqlite3 from 'better-sqlite3';
import { Pool } from 'pg';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config, isPostgres, isSQLite } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../..');
const dbPath = resolve(projectRoot, 'data/statusguard.db');

// SQLite wrapper to provide Pool-like interface
class SQLitePool {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  query(sql: string, params?: any[]): Promise<any> {
    return Promise.resolve().then(() => {
      try {
        const trimmedSql = sql.trim();

        // Convert Postgres-style $1, $2... placeholders to SQLite '?' and align params
        const placeholderCount = (sql.match(/\$\d+/g) || []).length;
        let execSql = sql;
        let execParams = params || [];

        if (placeholderCount > 0) {
          execSql = sql.replace(/\$\d+/g, '?');
          // If more params provided than placeholders, trim extras
          if (execParams.length > placeholderCount) {
            execParams = execParams.slice(0, placeholderCount);
          }
        }

        if (trimmedSql.toUpperCase().startsWith('SELECT')) {
          const stmt = this.db.prepare(execSql);
          const rows = stmt.all(...execParams);
          return {
            rows: rows as any[],
            rowCount: rows.length,
          };
        } else if (trimmedSql.toUpperCase().startsWith('INSERT')) {
          const hasReturning = /RETURNING\s+/i.test(sql);
          // Remove RETURNING clause for execution
          const cleanSql = execSql.replace(/RETURNING\s+.+?(?:;|$)/i, '').replace(/;$/, '');
          const stmt = this.db.prepare(cleanSql);
          const info = stmt.run(...execParams);

          if (hasReturning && info.changes > 0) {
            const lastId = info.lastInsertRowid;
            const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
            const tableName = tableMatch?.[1];
            if (tableName) {
              const selectStmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
              const row = selectStmt.get(lastId);
              return {
                rows: row ? [row] : [],
                rowCount: 1,
              };
            }
          }

          return {
            rows: info.changes > 0 ? [{ id: info.lastInsertRowid }] : [],
            rowCount: info.changes,
          };
        } else if (trimmedSql.toUpperCase().startsWith('UPDATE')) {
          const hasReturning = /RETURNING\s+/i.test(sql);
          const cleanSql = execSql.replace(/RETURNING\s+.+?(?:;|$)/i, '').replace(/;$/, '');
          const stmt = this.db.prepare(cleanSql);
          const info = stmt.run(...execParams);

          if (hasReturning && info.changes > 0) {
            const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
            const tableName = tableMatch?.[1];
            if (tableName && execParams.length > 0) {
              const idParam = execParams[execParams.length - 1];
              const selectStmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
              const row = selectStmt.get(idParam);
              return {
                rows: row ? [row] : [],
                rowCount: 1,
              };
            }
          }

          return {
            rows: [],
            rowCount: info.changes,
          };
        } else if (trimmedSql.toUpperCase().startsWith('DELETE')) {
          const stmt = this.db.prepare(execSql);
          const info = stmt.run(...execParams);
          return {
            rows: [],
            rowCount: info.changes,
          };
        } else {
          this.db.exec(execSql);
          return { rows: [], rowCount: 0 };
        }
      } catch (error) {
        throw error;
      }
    });
  }

  end(): Promise<void> {
    return Promise.resolve().then(() => {
      this.db.close();
    });
  }
}

let pool: Pool | SQLitePool | null = null;

/**
 * Get or create the connection pool
 */
export function getPool(): any {
  if (!pool) {
    if (isPostgres()) {
      // Use PostgreSQL
      pool = new Pool({
        connectionString: config.database.postgresUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client:', err);
      });

      console.log(`✅ Connected to PostgreSQL`);
    } else {
      // Use SQLite
      pool = new SQLitePool(dbPath);
      console.log(`✅ Connected to SQLite: ${dbPath}`);
    }
  }

  return pool;
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    if (pool instanceof Pool) {
      // PostgreSQL
      await pool.end();
    } else if (pool instanceof SQLitePool) {
      // SQLite
      await pool.end();
    }
    pool = null;
  }
}
