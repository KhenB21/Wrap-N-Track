// services/forecastService.js
//
// Pure statistical forecasting -- no DB calls in here, no ML. Every function takes
// already-fetched arrays/numbers and returns a result; routes/analytics.js does the
// querying and calls into this module. That split is what makes this unit-testable
// without a database (see scripts/test_forecastService.js) and is a deliberate
// design choice, not an oversight.
//
// WHY NOT ML: 18 months of data is not enough to trust a black-box model, and every
// number this service produces has to be defensible on a whiteboard at a capstone
// defence. Least-squares regression and a moving average both are.
//
// LIMITATIONS (see also the route-level comments in routes/analytics.js):
//   - Annual seasonality is not modelled. That needs 2+ full years of history to
//     separate from trend; this system has 18 months. Faking a yearly cycle from
//     that would be worse than not claiming one.
//   - The linear trend extrapolates the recent slope forward. It has no way to see
//     a promotion, a stockout, or a supply shock coming -- it just continues what it
//     has already seen.
//   - Per-SKU demand forecasts are unreliable below ~30 days of that SKU's own sales
//     history, hence the explicit insufficient_data status rather than a fabricated
//     number (see computeVelocityTrend / the /forecast/demand route).
//   - This runs on seeded demonstration history. A good backtest number here
//     demonstrates the method is sound, not that it would perform this well against
//     real, unseeded demand.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

// Centered moving average. Uses a shrinking window at the two ends (average of
// whatever's available) rather than dropping edge points -- that keeps the output
// the same length as the input, so every caller downstream doesn't have to special
// case a shorter smoothed series.
function centeredMovingAverage(values, windowSize = 7) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const half = Math.floor(windowSize / 2);
  return values.map((_, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length - 1, i + half);
    const slice = values.slice(lo, hi + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

// Ordinary least squares on (xs, ys). Returns slope/intercept plus the pieces
// (n, xMean, sxx, standardError) needed by predictionIntervalHalfWidth to build a
// widening out-of-sample interval -- the "standard error of the residuals" the
// spec asks for is sqrt(sum of squared residuals / (n - 2)), the usual simple-
// regression estimator (n - 2 degrees of freedom: one each for slope and intercept).
function linearRegression(xs, ys) {
  const n = xs.length;
  if (n !== ys.length || n < 2) {
    throw new Error('linearRegression requires xs and ys of equal length >= 2');
  }
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - xMean) * (ys[i] - yMean);
    sxx += (xs[i] - xMean) * (xs[i] - xMean);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;
  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const ssr = residuals.reduce((a, r) => a + r * r, 0);
  const standardError = n > 2 ? Math.sqrt(ssr / (n - 2)) : 0;
  return { slope, intercept, residuals, standardError, n, xMean, sxx };
}

// Half-width of the prediction interval at a new x0, using the standard OLS
// out-of-sample prediction-interval formula: SE * sqrt(1 + 1/n + (x0-xMean)^2/Sxx).
// The (x0-xMean)^2/Sxx term is what makes the band widen as x0 (the forecast day)
// moves further from the training window -- a flat +/-1.96*SE band would not widen
// with horizon, which is both statistically wrong for extrapolation and fails the
// "band widens with horizon" check this service is verified against.
function predictionIntervalHalfWidth(regression, x0, zScore = 1.96) {
  const { standardError, n, xMean, sxx } = regression;
  const leverage = sxx === 0 ? 1 : ((x0 - xMean) * (x0 - xMean)) / sxx;
  return zScore * standardError * Math.sqrt(1 + 1 / n + leverage);
}

// Each weekday's mean value divided by the overall mean, e.g. { 0: 0.8, ..., 6: 1.3 }
// for Sun..Sat, computed from the RAW (unsmoothed) series -- the 7-day centered
// moving average already averages away most of the weekly shape, so the factor has
// to come from the original values to have anything left to measure. Falls back to
// a flat 1 for a weekday with no observations or a zero overall mean.
function dayOfWeekFactors(dates, values) {
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  let total = 0;
  for (let i = 0; i < dates.length; i++) {
    const dow = new Date(dates[i] + 'T00:00:00Z').getUTCDay();
    sums[dow] += values[i];
    counts[dow] += 1;
    total += values[i];
  }
  const overallMean = values.length > 0 ? total / values.length : 0;
  const factors = {};
  for (let d = 0; d < 7; d++) {
    factors[d] = (counts[d] === 0 || overallMean === 0) ? 1 : (sums[d] / counts[d]) / overallMean;
  }
  return factors;
}

// Confidence is derived from how much real data backed the forecast, never
// asserted by the caller. Thresholds are the ones specified for this phase.
function computeConfidence(sampleSize, dataCompleteness) {
  if (sampleSize >= 120 && dataCompleteness >= 0.6) return 'high';
  if (sampleSize >= 60) return 'medium';
  return 'low';
}

// Orchestrates the revenue forecast: smooth -> regress the smoothed series against
// a day index -> extrapolate `horizon` days past the last date -> re-apply the raw
// day-of-week shape -> attach a widening prediction interval. `windowDays` is the
// configured lookback (reported alongside `sampleSize` so a caller can tell "we
// asked for N days" apart from "we only had M days of real data to work with" --
// they're equal in the current deployment since 18 months of seeded history is
// always available, but the fields are kept distinct because that would not hold
// for a newly-deployed store).
function forecastRevenueSeries({ dates, values, horizon, windowDays }) {
  if (!Array.isArray(dates) || !Array.isArray(values) || dates.length !== values.length) {
    throw new Error('forecastRevenueSeries requires parallel dates/values arrays');
  }
  const sampleSize = values.length;
  const resolvedWindowDays = windowDays || sampleSize;
  const nonEmptyDays = values.filter(v => v > 0).length;
  const dataCompleteness = sampleSize > 0 ? nonEmptyDays / sampleSize : 0;
  const confidence = computeConfidence(sampleSize, dataCompleteness);

  const smoothed = centeredMovingAverage(values, 7);
  const xs = smoothed.map((_, i) => i);
  const dowFactors = dayOfWeekFactors(dates, values);
  const regression = sampleSize >= 2 ? linearRegression(xs, smoothed) : null;

  const lastDate = sampleSize > 0 ? new Date(dates[dates.length - 1] + 'T00:00:00Z') : new Date();
  const points = [];
  for (let h = 1; h <= horizon; h++) {
    const futureDate = new Date(lastDate.getTime() + h * MS_PER_DAY);
    const dateStr = futureDate.toISOString().slice(0, 10);

    if (!regression) {
      points.push({ date: dateStr, predicted: 0, lower: 0, upper: 0 });
      continue;
    }

    const x0 = sampleSize - 1 + h;
    const factor = dowFactors[futureDate.getUTCDay()];
    const trendValue = regression.slope * x0 + regression.intercept;
    const halfWidth = predictionIntervalHalfWidth(regression, x0);

    points.push({
      date: dateStr,
      predicted: round2(Math.max(0, trendValue * factor)),
      lower: round2(Math.max(0, (trendValue - halfWidth) * factor)),
      upper: round2(Math.max(0, (trendValue + halfWidth) * factor))
    });
  }

  return {
    points,
    confidence,
    method: 'moving-average + least-squares linear trend + day-of-week factor',
    windowDays: resolvedWindowDays,
    sampleSize,
    dataCompleteness: round4(dataCompleteness)
  };
}

// --- demand / stockout helpers -------------------------------------------------

// last-30 vs prior-30 velocity trend, with a minimum-volume floor: below it, a swing
// from e.g. 1 unit to 3 units would report as "+200%", which is noise at that
// volume, not a trend worth acting on.
function computeVelocityTrend(last30Qty, prior30Qty, minVolume = 5) {
  if (last30Qty < minVolume && prior30Qty < minVolume) {
    return { status: 'insufficient_volume', changePct: null, direction: 'flat' };
  }
  if (prior30Qty === 0) {
    return { status: 'ok', changePct: null, direction: last30Qty > 0 ? 'up' : 'flat' };
  }
  const changePct = ((last30Qty - prior30Qty) / prior30Qty) * 100;
  const direction = changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'flat';
  return { status: 'ok', changePct: round2(changePct), direction };
}

function daysToStockout(availableStock, averageDailyUsage) {
  if (averageDailyUsage <= 0) return null;
  if (availableStock <= 0) return 0;
  return round2(availableStock / averageDailyUsage);
}

module.exports = {
  centeredMovingAverage,
  linearRegression,
  predictionIntervalHalfWidth,
  dayOfWeekFactors,
  computeConfidence,
  forecastRevenueSeries,
  computeVelocityTrend,
  daysToStockout
};
