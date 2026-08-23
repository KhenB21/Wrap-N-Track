#!/usr/bin/env node
/**
 * clearAnalyticsHistory.js
 *
 * Removes exactly the rows produced by seedAnalyticsHistory.js -- every order whose
 * order_id begins 'SEED-' and every stock movement whose reason begins 'SEED:'.
 * Nothing else is touched, so real trading data is unaffected.
 *
 * Usage:  node scripts/clearAnalyticsHistory.js
 */
const pool = require('../config/db');
const { CLEAR_STEPS } = require('./seedAnalyticsHistory');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let total = 0;
    for (const stmt of CLEAR_STEPS) {
      const { rowCount } = await client.query(stmt);
      total += rowCount;
      console.log(String(rowCount).padStart(6) + '  ' + stmt.replace('DELETE FROM ', '').split(' WHERE')[0]);
    }
    await client.query('COMMIT');
    console.log('\nRemoved ' + total + ' seeded rows.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Clear failed, rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
