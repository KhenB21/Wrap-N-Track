const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'WrapNTrack',
    password: 'iamtheonlyhannah',
    port: 5432,
});

async function runMigration() {
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '001_initial_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split the SQL into individual statements
        const statements = sql.split('\n\n').filter(stmt => stmt.trim());

        // Execute each statement
        for (const stmt of statements) {
            // Skip empty statements
            if (!stmt.trim()) continue;

            // For the trigger function, we need to execute it as a single statement
            if (stmt.includes('CREATE OR REPLACE FUNCTION')) {
                // Remove any trailing semicolons
                const functionSql = stmt.trim().replace(/;\s*$/, '');
                await pool.query(functionSql);
            } else {
                // For other statements, just execute as is
                await pool.query(stmt);
            }
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Error running migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
