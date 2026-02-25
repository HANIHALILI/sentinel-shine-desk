# StatusGuard Backend - Local PostgreSQL Support

## Overview

StatusGuard has been enhanced to support local PostgreSQL deployments, eliminating the need for Supabase. The system now includes:

- **Express.js Backend Server** - REST API for all database operations
- **Auto-initializing PostgreSQL** - Database automatically created and initialized on first run
- **Docker Compose** - Easy local deployment with PostgreSQL in a container
- **Self-hosted Ready** - Complete control over your data and infrastructure

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend (Vite)                   │
│              (src/ and components/)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP API Calls
                     │
┌────────────────────▼────────────────────────────────────┐
│              Express.js Backend Server                   │
│              (server/ directory)                         │
│  - Status Pages API                                      │
│  - Services API                                          │
│  - Incidents API                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ PostgreSQL Protocol
                     │
┌────────────────────▼────────────────────────────────────┐
│           PostgreSQL Database                            │
│    - Can be local or remote                              │
│    - Auto-initialized with migrations                    │
│    - Persisted data storage                              │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Option 1: Local Setup (with local PostgreSQL)

**Prerequisites:**
- Node.js 20+
- PostgreSQL 15+ installed and running

**Steps:**

1. Clone and install:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Ensure PostgreSQL is running locally:
```bash
# macOS with Homebrew
brew services start postgresql

# Linux (Ubuntu/Debian)
sudo service postgresql start

# Windows
# Use pgAdmin or start PostgreSQL service manually
```

4. Run development server:
```bash
npm run dev
```

The server will automatically:
- Create the `statusguard` database if needed
- Run all migrations
- Start the API on `http://localhost:3001`
- Start the frontend on `http://localhost:5173`

### Option 2: Docker Compose (Recommended)

**Prerequisites:**
- Docker and Docker Compose

**Steps:**

```bash
docker-compose up -d
```

This starts:
- PostgreSQL container with persistence
- StatusGuard backend server
- All migrations run automatically

Access at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`

## Environment Variables

Create or modify `.env.local`:

```env
# Frontend
VITE_API_URL=http://localhost:3001/api

# Database Connection
DB_HOST=localhost          # PostgreSQL hostname
DB_PORT=5432             # PostgreSQL port
DB_NAME=statusguard      # Database name
DB_USER=postgres         # Database user
DB_PASSWORD=postgres     # Database password

# Server
SERVER_PORT=3001         # Backend server port
SERVER_HOST=localhost    # Backend server hostname
FRONTEND_URL=http://localhost:5173

# Auto-initialize database on startup
AUTO_INIT_DB=true        # Set to 'false' to skip auto-init
```

## Project Structure

```
.
├── server/              # Express.js backend
│   ├── index.ts         # Main server file
│   ├── config.ts        # Configuration
│   ├── db/
│   │   ├── pool.ts      # Connection pool
│   │   └── init.ts      # Migration runner
│   └── routes/
│       ├── status-pages.ts
│       ├── services.ts
│       └── incidents.ts
├── src/                 # React frontend
│   ├── lib/
│   │   └── db.ts        # NEW: HTTP API client (replaces Supabase)
│   └── components/
├── db/                  # Database migrations
│   └── migrations/
├── docker-compose.yml   # Docker Compose config
├── Dockerfile.server    # Backend Docker image
└── package.json         # Dependencies
```

## Database Migrations

Migrations run automatically on server startup. They're located in `db/migrations/`:

1. `001_initial_schema.sql` - Creates tables and indexes
2. `002_metric_queries.sql` - Creates metric functions
3. `003_seed.sql` - Seeds initial data
4. `004_partitioning.sql` - Partitioning setup (optional)

To run migrations manually:

```bash
npm run setup:db
```

## Available Commands

```bash
# Development (frontend + backend)
npm run dev

# Backend only
npm run dev:server

# Frontend only
npm run dev:client

# Build
npm run build

# Lint
npm run lint

# Tests
npm run test
npm run test:watch

# Database setup
npm run setup:db
```

## API Endpoints

### Status Pages

```
GET    /api/status-pages           # List all pages
GET    /api/status-pages/:slug     # Get page by slug
POST   /api/status-pages           # Create page
PUT    /api/status-pages/:id       # Update page
DELETE /api/status-pages/:id       # Delete page
```

### Services

```
GET    /api/services               # List all services
GET    /api/services/:id           # Get service by ID
POST   /api/services               # Create service
PUT    /api/services/:id           # Update service
DELETE /api/services/:id           # Delete service
```

### Incidents

```
GET    /api/incidents              # List all incidents
GET    /api/incidents/:id          # Get incident by ID
POST   /api/incidents              # Create incident
PUT    /api/incidents/:id          # Update incident
DELETE /api/incidents/:id          # Delete incident
```

## Migration from Supabase

The migration is already complete! The `src/lib/db.ts` file now:

1. Makes HTTP calls to the local backend API instead of Supabase SDK calls
2. Uses the same function signatures, so no other files need changes
3. Handles authentication placeholders (TODO: implement auth)

All React components continue to use the same `import { db } from '@/lib/db'` interface.

## Troubleshooting

### PostgreSQL Connection Refused

**Problem:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
- Ensure PostgreSQL is running
- Check `DB_HOST` and `DB_PORT` in `.env.local`
- Verify credentials match your PostgreSQL installation

### Database Already Exists

**Problem:** `ERROR: database "statusguard" already exists`

**Solution:**
- This is expected on subsequent runs
- Migrations are skipped if database exists
- To reset: `dropdb statusguard` then restart

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE :::3001`

**Solution:**
- Change `SERVER_PORT` in `.env.local`
- Or kill process: `lsof -ti:3001 | xargs kill -9`

## Production Deployment

For production:

1. Use a dedicated PostgreSQL instance (e.g., AWS RDS, DigitalOcean Managed DB)
2. Update `.env` with production credentials
3. Set `AUTO_INIT_DB=false` (migrations run once)
4. Use environment-specific configuration
5. Set up proper backups and monitoring

Example production `.env`:

```env
DB_HOST=db.example.com
DB_PORT=5432
DB_NAME=statusguard_prod
DB_USER=statusguard_app
DB_PASSWORD=<strong-password>
SERVER_PORT=3001
FRONTEND_URL=https://status.example.com
AUTO_INIT_DB=false
```

## TODO / Future Work

- [ ] Authentication system
- [ ] Metrics and monitoring
- [ ] Broadcasts/announcements
- [ ] WebSocket for real-time updates
- [ ] Health check service
- [ ] Automated backups
- [ ] API rate limiting
- [ ] Comprehensive logging

## Contributing

See the main [Contributing Guide](../CONTRIBUTING.md)

## License

See [LICENSE](../LICENSE)
