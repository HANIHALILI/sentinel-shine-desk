/**
 * Server Configuration
 * Supports both PostgreSQL (DATABASE_URL env var) and SQLite (default)
 */

export const config = {
  // Determine database type from environment
  database: {
    // If DATABASE_URL is set, use PostgreSQL (for external/cloud databases)
    // Otherwise use local SQLite
    type: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
    
    // PostgreSQL configuration (if DATABASE_URL is provided)
    postgresUrl: process.env.DATABASE_URL || '',
    
    // SQLite configuration (default)
    sqlitePath: process.env.SQLITE_PATH || './data/statusguard.db',
  },

  // Server
  server: {
    port: parseInt(process.env.SERVER_PORT || '3001'),
    host: process.env.SERVER_HOST || 'localhost',
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:8080',
  },
};

// Helper to check which database is being used
export function isPostgres(): boolean {
  return config.database.type === 'postgres';
}

export function isSQLite(): boolean {
  return config.database.type === 'sqlite';
}
