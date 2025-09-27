#!/usr/bin/env node

const { runAutoMigrations } = require('./auto-migrate');
const pool = require('./config/db');

async function runMigrations() {
  console.log('🚀 Starting manual migration run...');
  
  try {
    // Test database connection first
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
    // Run migrations
    await runAutoMigrations();
    
    console.log('🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
