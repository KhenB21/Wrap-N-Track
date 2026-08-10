const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

// Simple auto-migration system that runs on server startup
async function runAutoMigrations() {
  console.log('🔄 Running auto-migrations...');
  
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations from database
    const result = await pool.query('SELECT name FROM migrations');
    const executedMigrations = result.rows.map(row => row.name);

    // Find migrations that haven't been executed
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

    // Execute pending migrations
    for (const migrationFile of pendingMigrations) {
      try {
        console.log(`🔄 Executing migration: ${migrationFile}`);
        
        const filePath = path.join(migrationsDir, migrationFile);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Start transaction
        await pool.query('BEGIN');
        
        // Execute the migration
        await pool.query(sql);
        
        // Record the migration
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migrationFile]);
        
        // Commit transaction
        await pool.query('COMMIT');
        
        console.log(`✅ Successfully executed: ${migrationFile}`);
      } catch (error) {
        // Rollback on error
        await pool.query('ROLLBACK');
        console.error(`❌ Error executing migration ${migrationFile}:`, error.message);
        console.log(`⏭️ Skipping remaining migrations until ${migrationFile} is fixed`);
        break;
      }
    }

    console.log('✅ All auto-migrations completed successfully');
  } catch (error) {
    console.error('❌ Auto-migration failed:', error.message);
    // Don't exit the process, just log the error
    // This allows the server to start even if migrations fail
  }
}

module.exports = { runAutoMigrations };
