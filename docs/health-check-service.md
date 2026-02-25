# Health Check Service - Implementation Complete

## Overview

The Health Check Service is now fully implemented and running! This is the **core of StatusGuard**.

## How It Works

### Architecture

```
Backend Server (Express.js)
    ↓
Health Check Scheduler (runs every 60 seconds)
    ↓
    ├─ Loads all services from database
    ├─ Performs HTTP/HTTPS/TCP checks in parallel
    ├─ Stores results in 'checks' table
    ├─ Auto-creates incidents when service goes DOWN
    ├─ Auto-resolves incidents when service recovers UP
    └─ Updates service status in real-time
    ↓
Database (PostgreSQL)
    ├─ checks table: Raw health check data
    ├─ services table: Service configuration
    ├─ incidents table: Auto-created when needed
    └─ incident_updates table: Resolution history
```

### Health Check Flow

1. **Every 60 seconds:**
   - Fetch all services from database
   - Perform health checks in parallel (HTTP/HTTPS/TCP)
   - Store metrics in `checks` table

2. **For DOWN services (2 consecutive failures):**
   - Create incident automatically
   - Send to "investigating" status
   - Link affected services

3. **For UP services (2 consecutive successes):**
   - Auto-resolve active incidents
   - Update to "resolved" status
   - Add resolution update

## API Endpoints

### Health Check Operations

**Manual health check (immediate):**
```bash
POST /api/health-checks/:serviceId/check
```

Response:
```json
{
  "serviceId": "uuid",
  "isUp": true,
  "latencyMs": 125,
  "statusCode": 200,
  "error": null,
  "timestamp": "2026-02-25T12:00:00Z"
}
```

### View Check History

**Get recent checks for a service:**
```bash
GET /api/health-checks/:serviceId?hours=24&limit=100
```

**Get aggregated metrics (bucketed by interval):**
```bash
GET /api/health-checks/:serviceId/history?hours=24&interval=1%20minute
```

Response:
```json
{
  "data": [
    {
      "bucket": "2026-02-25T12:00:00Z",
      "check_count": 1,
      "up_count": 1,
      "availability_percent": 100.0,
      "avg_latency_ms": 125,
      "p95_latency_ms": 125
    }
  ]
}
```

**Get summary statistics:**
```bash
GET /api/health-checks/:serviceId/summary?hours=24
```

Response:
```json
{
  "data": {
    "total_checks": 24,
    "successful_checks": 23,
    "failed_checks": 1,
    "availability_percent": 95.83,
    "avg_latency_ms": 120.5,
    "p95_latency_ms": 150,
    "p99_latency_ms": 200,
    "min_latency_ms": 100,
    "max_latency_ms": 250
  }
}
```

**Get all services summary for a status page:**
```bash
GET /api/health-checks/page/:statusPageId/summary?hours=24
```

## Supported Protocols

### HTTP/HTTPS
- Follows redirects (configurable)
- Checks response status code
- Measures latency
- Supports custom headers (TODO)

### TCP
- Raw socket connection
- Connection success = service UP
- Connection failure = service DOWN
- Timeout configurable per service

### gRPC
- Placeholder for future implementation
- Will support service check + health probe

## Configuration

### Health Check Settings

Located in `server/services/health-check.ts`:

```typescript
const CHECK_INTERVAL = 60 * 1000; // Run every 60 seconds
const CONSECUTIVE_FAILURES_FOR_INCIDENT = 2; // 2 failures = create incident
const CONSECUTIVE_SUCCESS_FOR_RECOVERY = 2; // 2 successes = resolve incident
```

### Service-Level Settings

When creating a service, configure:

```json
{
  "name": "API Server",
  "endpoint": "https://api.example.com/health",
  "protocol": "HTTPS",
  "check_interval_seconds": 60,
  "timeout_ms": 5000,
  "expected_status_code": 200
}
```

## Database Schema

### Checks Table
```sql
CREATE TABLE checks (
  id BIGINT PRIMARY KEY,           -- Auto-incrementing ID
  service_id UUID,                 -- Links to service
  timestamp TIMESTAMPTZ,           -- When check ran
  latency_ms INT,                  -- Response time
  is_up BOOLEAN,                   -- true = success, false = failure
  status_code INT,                 -- HTTP status (if applicable)
  error TEXT                       -- Error message (if failed)
);
```

### Automatic Incident Management

**When incident is created:**
- Status: `investigating`
- Severity: `major`
- Affected services linked
- Initial update added

**When incident is resolved:**
- Status: `resolved`
- `resolved_at` timestamp set
- Resolution update added

## Metrics & Statistics

Available metrics from the health check data:

- **Availability:** % of successful checks
- **Latency (Average):** Mean response time
- **Latency (P95):** 95th percentile
- **Latency (P99):** 99th percentile
- **Success/Failure counts:** Raw numbers
- **Hourly aggregation:** Bucketed by time interval

## Running the System

### Start the server (includes health checks):
```bash
npm run dev
```

### Output:
```
🚀 Starting StatusGuard server...
✓ Database initialization complete
✓ Database connection established
✓ Server running at http://localhost:3001
✓ Frontend URL: http://localhost:5173

Starting health check scheduler (every 60 seconds)...
[HealthCheck] Checking 5 services...
[HealthCheck] Cycle complete at 2026-02-25T12:00:00Z
✓ Auto-resolved incident for service: API Server
✗ Auto-created incident for service: Payment Gateway
```

## Testing Health Checks

### Via API:
```bash
# Trigger a manual check
curl -X POST http://localhost:3001/api/health-checks/SERVICE_ID/check

# View recent checks
curl http://localhost:3001/api/health-checks/SERVICE_ID?hours=24

# Get metrics summary
curl http://localhost:3001/api/health-checks/SERVICE_ID/summary
```

### Via command line:
```bash
# Create a test service
curl -X POST http://localhost:3001/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "status_page_id": "PAGE_ID",
    "name": "Test Service",
    "endpoint": "https://www.google.com",
    "protocol": "HTTPS",
    "expected_status_code": 200
  }'

# Wait for scheduler to run (60 seconds) or trigger manually:
curl -X POST http://localhost:3001/api/health-checks/SERVICE_ID/check
```

## Next Steps

Now that Health Check Service is complete:

1. **Connect Admin Panel to API** - Wire up all service management dialogs
2. **Add Authentication** - Protect admin endpoints
3. **Implement Broadcasts** - Add announcements API
4. **Dark Mode** - Toggle for UI
5. **Real-time Updates** - WebSocket for live status

## Troubleshooting

### Health checks not running
- Check server logs for `[HealthCheck]` output
- Ensure database has services with valid endpoints
- Check network connectivity to monitored services

### Incidents not being created
- Need 2 consecutive failures (configurable)
- Service must have valid endpoint and protocol
- Database connection must be working

### Slow response times
- Health checks run in parallel, shouldn't block server
- Check network latency to monitored endpoints
- Monitor database performance

## Code Structure

```
server/
├── services/health-check.ts    # Main scheduler & check logic
├── routes/health-checks.ts     # API endpoints
├── index.ts                    # Server entry point
└── db/
    └── pool.ts                 # Database connection

Database:
├── checks table                # Raw check results
├── services table              # Service definitions
└── incidents table             # Auto-created incidents
```
