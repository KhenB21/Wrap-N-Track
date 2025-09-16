const fs = require('fs');
const path = require('path');
// Use the unified pool from config/db (respects .env.local)
const pool = require('../config/db');

// Create migrations table if it doesn't exist
async function createMigrationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migrations table created or already exists');
  } catch (error) {
    console.error('Error creating migrations table:', error);
    process.exit(1);
  }
}

// Get all migration files
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '../migrations');
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

// Get executed migrations from database
async function getExecutedMigrations() {
  const result = await pool.query('SELECT name FROM migrations');
  return result.rows.map(row => row.name);
}

// Execute a migration file
async function executeMigration(filename) {
  const filePath = path.join(__dirname, '../migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Split the file into up and down migrations
  const [upMigration, downMigration] = sql.split('-- Down Migration:');
  
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Execute the up migration
    await pool.query(upMigration.replace('-- Up Migration:', ''));
    
    // Record the migration
    await pool.query('INSERT INTO migrations (name) VALUES ($1)', [filename]);
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log(`Executed migration: ${filename}`);
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error(`Error executing migration ${filename}:`, error);
    throw error;
  }
}

// Rollback a migration
async function rollbackMigration(filename) {
  const filePath = path.join(__dirname, '../migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Get the down migration
  const downMigration = sql.split('-- Down Migration:')[1];
  
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Execute the down migration
    await pool.query(downMigration);
    
    // Remove the migration record
    await pool.query('DELETE FROM migrations WHERE name = $1', [filename]);
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log(`Rolled back migration: ${filename}`);
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error(`Error rolling back migration ${filename}:`, error);
    throw error;
  }
}

// Main migration function
async function migrate() {
  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get all migration files and executed migrations
    const migrationFiles = getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();
    
    // Find migrations that haven't been executed
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Rollback function
async function rollback() {
  try {
    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    // Rollback the last migration
    const lastMigration = executedMigrations[executedMigrations.length - 1];
    await rollbackMigration(lastMigration);
    
    console.log('Rollback completed successfully');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  migrate,
  rollback
}; 