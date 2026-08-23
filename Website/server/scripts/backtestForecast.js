/*
 Backtest for the revenue forecast (services/forecastService.js).

 Holds out the most recent 30 days, forecasts them from the prior 150 days, and
 reports MAPE (mean absolute percentage error) against what actually happened.
 This is a one-off verification script, not part of the live API -- it hits the DB
 directly and prints the real number, whatever it is.

 Usage:
   cd Website/server && node scripts/backtestForecast.js
*/
require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' });
const pool = require('../config/db');
const { forecastRevenueSeries } = require('../services/forecastService');

function toDateStr(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; }

// node-pg parses a DATE column as a JS Date at LOCAL midnight, not UTC midnight --
// toDateStr (toISOString) on that silently shifts the calendar date back a day
// whenever the server's local timezone is ahead of UTC (this machine is UTC+8;
// verified against a live query). Use local getters for anything read back FROM
// a query row -- see the matching comment in routes/analytics.js.
function pgDateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const REVENUE_STATUSES = "('Order Received', 'Completed')";
const TRAIN_DAYS = 150;
const HOLDOUT_DAYS = 30;

async function main() {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = addDays(end, -(TRAIN_DAYS + HOLDOUT_DAYS - 1));
  const trainEnd = addDays(start, TRAIN_DAYS - 1);
  const holdoutStart = addDays(trainEnd, 1);
  const holdoutEnd = end;

  const r = await pool.query(`
    WITH days AS (
      SELECT generate_series($1::date, $2::date, interval '1 day')::date AS d
    ),
    daily AS (
      SELECT order_date::date AS d, COALESCE(SUM(total_cost) FILTER (WHERE status IN ${REVENUE_STATUSES}), 0) AS revenue
      FROM all_orders
      WHERE order_date::date BETWEEN $1 AND $2
      GROUP BY order_date::date
    )
    SELECT days.d, COALESCE(daily.revenue, 0) AS revenue
    FROM days LEFT JOIN daily ON daily.d = days.d
    ORDER BY days.d
  `, [toDateStr(start), toDateStr(end)]);

  const allDates = r.rows.map(row => pgDateToStr(row.d));
  const allValues = r.rows.map(row => Number(row.revenue));

  const trainDates = allDates.slice(0, TRAIN_DAYS);
  const trainValues = allValues.slice(0, TRAIN_DAYS);
  const actualHoldout = allValues.slice(TRAIN_DAYS, TRAIN_DAYS + HOLDOUT_DAYS);

  console.log(`Training window: ${trainDates[0]} .. ${trainDates[trainDates.length - 1]} (${TRAIN_DAYS} days)`);
  console.log(`Holdout window:  ${toDateStr(holdoutStart)} .. ${toDateStr(holdoutEnd)} (${HOLDOUT_DAYS} days)`);

  const forecast = forecastRevenueSeries({
    dates: trainDates, values: trainValues, horizon: HOLDOUT_DAYS, windowDays: TRAIN_DAYS
  });

  console.log(`Forecast confidence on the training window: ${forecast.confidence} (sampleSize=${forecast.sampleSize}, dataCompleteness=${forecast.dataCompleteness})`);

  // MAPE excludes actual-zero days (percentage error is undefined against a zero
  // denominator); those are reported separately rather than silently dropped.
  let sumAbsPctErr = 0;
  let countedDays = 0;
  let zeroActualDays = 0;
  const rows = [];
  for (let i = 0; i < HOLDOUT_DAYS; i++) {
    const actual = actualHoldout[i];
    const predicted = forecast.points[i].predicted;
    let pctErr = null;
    if (actual === 0) {
      zeroActualDays++;
    } else {
      pctErr = Math.abs((actual - predicted) / actual) * 100;
      sumAbsPctErr += pctErr;
      countedDays++;
    }
    rows.push({ date: forecast.points[i].date, actual, predicted, pctErr: pctErr !== null ? Math.round(pctErr * 100) / 100 : null });
  }

  console.log('\nDay-by-day (actual vs predicted):');
  rows.forEach(row => {
    console.log(`  ${row.date}  actual=${row.actual.toFixed(2).padStart(12)}  predicted=${row.predicted.toFixed(2).padStart(12)}  pctErr=${row.pctErr === null ? 'n/a (actual=0)' : row.pctErr + '%'}`);
  });

  const mape = countedDays > 0 ? sumAbsPctErr / countedDays : null;
  console.log(`\nMAPE over ${countedDays} non-zero-actual days (${zeroActualDays} zero-actual days excluded): ${mape !== null ? mape.toFixed(2) + '%' : 'n/a'}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
