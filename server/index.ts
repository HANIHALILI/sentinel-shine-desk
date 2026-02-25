/**
 * StatusGuard Backend Server
 * 
 * Supports both:
 * - SQLite (default, no setup needed)
 * - PostgreSQL (set DATABASE_URL environment variable)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { getPool, closePool } from './db/pool.js';
import { initializeDatabase } from './db/init.js';
import { startHealthCheckScheduler, stopHealthCheckScheduler } from './services/health-check.js';
import { statusPagesRouter } from './routes/status-pages.js';
import { servicesRouter } from './routes/services.js';
import { incidentsRouter } from './routes/incidents.js';
import { healthChecksRouter } from './routes/health-checks.js';
import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';

const app = express();
const { port, host } = config.server;

let healthCheckInterval: NodeJS.Timeout | null = null;

// Middleware
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/status-pages', statusPagesRouter);
app.use('/api/services', servicesRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/health-checks', healthChecksRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Initialize server
 */
async function start() {
  try {
    console.log('🚀 Starting StatusGuard server...');
    console.log(`📊 Database: ${config.database.type.toUpperCase()}`);

    // Initialize database
    console.log('Initializing database...');
    try {
      await initializeDatabase();
      console.log('✓ Database initialization complete');
    } catch (error) {
      console.error('⚠️ Database initialization failed:', error);
      if (config.database.type === 'postgres') {
        console.log('Make sure PostgreSQL is running and DATABASE_URL is set correctly');
      }
    }

    // Initialize connection pool
    console.log('Connecting to database...');
    const pool = getPool();

    // Test connection
    try {
      const result = await pool.query('SELECT 1 as test');
      console.log('✓ Database connection established');
    } catch (error) {
      console.error('⚠️ Database connection test failed:', error);
    }

    // Start server
    const server = app.listen(port, host, () => {
      console.log(`\n✓ Server running at http://${host}:${port}`);
      console.log(`✓ Frontend URL: ${config.frontend.url}`);
      console.log(`✓ Database Type: ${config.database.type.toUpperCase()}\n`);
    });

    // Start health check scheduler
    healthCheckInterval = startHealthCheckScheduler();

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      
      if (healthCheckInterval) {
        stopHealthCheckScheduler(healthCheckInterval);
      }
      
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

// Global error handler
process.on('uncaughtException', (error: any) => {
  console.error('❌ Uncaught Exception:', {
    message: error?.message || String(error),
    stack: error?.stack,
    error: JSON.stringify(error, null, 2)
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', {
    message: reason?.message || String(reason),
    stack: reason?.stack,
    reason: JSON.stringify(reason, null, 2)
  });
  process.exit(1);
});

// Start the server
start();

export default app;
