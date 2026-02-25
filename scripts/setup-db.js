/**
 * Database Setup Script
 * 
 * With SQLite, no setup is required!
 * The database will be created automatically on first run.
 * 
 * To use PostgreSQL instead, set the DATABASE_URL environment variable.
 */

console.log('\n???  StatusGuard Database Configuration\n');
console.log('Configuration:');
console.log('  Default: SQLite (file-based, no setup needed)');
console.log('  Location: ./data/statusguard.db');
console.log('  Status: Will be created automatically on first run\n');
console.log('Alternative: PostgreSQL');
console.log('  Set DATABASE_URL environment variable to use external PostgreSQL\n');
console.log('? Ready to start!\n');
process.exit(0);
