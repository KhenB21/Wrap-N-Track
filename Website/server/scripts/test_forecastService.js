/*
 Unit tests for services/forecastService.js -- pure functions, no DB, no server.
 Usage:
   node scripts/test_forecastService.js
*/
const assert = require('assert');
const {
  centeredMovingAverage,
  linearRegression,
  predictionIntervalHalfWidth,
  dayOfWeekFactors,
  computeConfidence,
  forecastRevenueSeries,
  computeVelocityTrend,
  daysToStockout
} = require('../services/forecastService');

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('centeredMovingAverage');
check('flat series stays flat', () => {
  const r = centeredMovingAverage([5, 5, 5, 5, 5], 3);
  assert.deepStrictEqual(r, [5, 5, 5, 5, 5]);
});
check('hand-computed window=3 over [1,2,3,4,5]', () => {
  // center i averages [i-1, i, i+1] within bounds:
  // i0: avg(1,2)=1.5  i1: avg(1,2,3)=2  i2: avg(2,3,4)=3  i3: avg(3,4,5)=4  i4: avg(4,5)=4.5
  const r = centeredMovingAverage([1, 2, 3, 4, 5], 3);
  assert.deepStrictEqual(r, [1.5, 2, 3, 4, 4.5]);
});
check('empty input returns empty output', () => {
  assert.deepStrictEqual(centeredMovingAverage([], 7), []);
});

console.log('linearRegression');
check('perfect line y = 2x + 1 recovers exact slope/intercept, zero residuals', () => {
  const xs = [0, 1, 2, 3, 4];
  const ys = xs.map(x => 2 * x + 1);
  const r = linearRegression(xs, ys);
  assert.ok(Math.abs(r.slope - 2) < 1e-9, `slope ${r.slope}`);
  assert.ok(Math.abs(r.intercept - 1) < 1e-9, `intercept ${r.intercept}`);
  assert.ok(Math.abs(r.standardError) < 1e-9, `standardError ${r.standardError}`);
  r.residuals.forEach(res => assert.ok(Math.abs(res) < 1e-9));
});
check('hand-computed slope/intercept for a small noisy set', () => {
  // xs=[0,1,2,3], ys=[1,3,2,5]
  // xMean=1.5, yMean=2.75
  // Sxy = (-1.5)(-1.75)+(-0.5)(0.25)+(0.5)(-0.75)+(1.5)(2.25) = 2.625-0.125-0.375+3.375 = 5.5
  // Sxx = 2.25+0.25+0.25+2.25 = 5
  // slope = 5.5/5 = 1.1, intercept = 2.75 - 1.1*1.5 = 2.75-1.65 = 1.1
  const r = linearRegression([0, 1, 2, 3], [1, 3, 2, 5]);
  assert.ok(Math.abs(r.slope - 1.1) < 1e-9, `slope ${r.slope}`);
  assert.ok(Math.abs(r.intercept - 1.1) < 1e-9, `intercept ${r.intercept}`);
});
check('throws on mismatched lengths', () => {
  assert.throws(() => linearRegression([0, 1], [0]));
});
check('throws on fewer than 2 points', () => {
  assert.throws(() => linearRegression([0], [0]));
});
check('vertical spread of x with zero variance yields slope 0, not NaN/Infinity', () => {
  const r = linearRegression([5, 5, 5], [1, 2, 3]);
  assert.strictEqual(r.slope, 0);
  assert.ok(Number.isFinite(r.intercept));
});

console.log('predictionIntervalHalfWidth');
check('half-width strictly increases as x0 moves further from the training window', () => {
  const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ys = xs.map(x => 3 * x + 2 + (x % 2 === 0 ? 0.5 : -0.5)); // small noise so SE > 0
  const r = linearRegression(xs, ys);
  const near = predictionIntervalHalfWidth(r, 10);
  const far = predictionIntervalHalfWidth(r, 40);
  assert.ok(far > near, `expected far (${far}) > near (${near})`);
});

console.log('dayOfWeekFactors');
check('Sunday (2026-08-23) doubled vs every other day -> Sunday factor > 1, others < 1', () => {
  // Two full weeks starting Sunday 2026-08-16 through Saturday 2026-08-29 (14 days).
  // Sunday = value 20 (x2 days), every other day = value 10 (x12 days).
  // Overall mean = (2*20 + 12*10)/14 = (40+120)/14 = 160/14.
  const dates = [];
  const values = [];
  const start = new Date('2026-08-16T00:00:00Z'); // a Sunday
  for (let i = 0; i < 14; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
    values.push(d.getUTCDay() === 0 ? 20 : 10);
  }
  const factors = dayOfWeekFactors(dates, values);
  const overallMean = 160 / 14;
  assert.ok(Math.abs(factors[0] - 20 / overallMean) < 1e-9, `Sunday factor ${factors[0]}`);
  assert.ok(Math.abs(factors[1] - 10 / overallMean) < 1e-9, `Monday factor ${factors[1]}`);
  assert.ok(factors[0] > 1 && factors[1] < 1);
});
check('weekday with zero observations falls back to factor 1', () => {
  const factors = dayOfWeekFactors(['2026-08-17'], [10]); // one Monday only
  assert.strictEqual(factors[0], 1); // Sunday unobserved
});

console.log('computeConfidence');
check('>=120 days and >=60% complete -> high', () => {
  assert.strictEqual(computeConfidence(180, 0.9), 'high');
  assert.strictEqual(computeConfidence(120, 0.6), 'high');
});
check('>=120 days but <60% complete -> medium (fails completeness, not sample-size floor)', () => {
  assert.strictEqual(computeConfidence(180, 0.5), 'medium');
});
check('>=60 and <120 days -> medium regardless of completeness', () => {
  assert.strictEqual(computeConfidence(90, 0.95), 'medium');
  assert.strictEqual(computeConfidence(60, 0.01), 'medium');
});
check('<60 days -> low', () => {
  assert.strictEqual(computeConfidence(59, 1), 'low');
  assert.strictEqual(computeConfidence(0, 0), 'low');
});

console.log('forecastRevenueSeries');
check('confidence degrades as the window is shortened (180 -> 90 -> 30 days)', () => {
  const build = (n) => {
    const dates = [], values = [];
    const start = new Date('2026-01-01T00:00:00Z');
    for (let i = 0; i < n; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
      values.push(1000 + i * 5); // steady upward trend, always non-empty
    }
    return { dates, values };
  };
  const long = build(180);
  const mid = build(90);
  const short = build(30);
  const rLong = forecastRevenueSeries({ ...long, horizon: 7, windowDays: 180 });
  const rMid = forecastRevenueSeries({ ...mid, horizon: 7, windowDays: 180 });
  const rShort = forecastRevenueSeries({ ...short, horizon: 7, windowDays: 180 });
  assert.strictEqual(rLong.confidence, 'high');
  assert.strictEqual(rMid.confidence, 'medium');
  assert.strictEqual(rShort.confidence, 'low');
});
check('confidence band widens with horizon (day-30 wider than day-7 within the same call)', () => {
  const dates = [], values = [];
  const start = new Date('2026-01-01T00:00:00Z');
  for (let i = 0; i < 180; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
    // trend plus alternating noise so standardError > 0
    values.push(1000 + i * 3 + (i % 2 === 0 ? 15 : -15));
  }
  const r = forecastRevenueSeries({ dates, values, horizon: 30, windowDays: 180 });
  const day7 = r.points[6];
  const day30 = r.points[29];
  const widthDay7 = day7.upper - day7.lower;
  const widthDay30 = day30.upper - day30.lower;
  assert.ok(widthDay30 > widthDay7, `expected day30 width (${widthDay30}) > day7 width (${widthDay7})`);
});
check('predicted values never go negative even on a steep downward trend', () => {
  const dates = [], values = [];
  const start = new Date('2026-01-01T00:00:00Z');
  for (let i = 0; i < 60; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
    values.push(Math.max(0, 1000 - i * 20)); // crashes to zero and stays there
  }
  const r = forecastRevenueSeries({ dates, values, horizon: 30, windowDays: 180 });
  r.points.forEach(p => {
    assert.ok(p.predicted >= 0, `predicted ${p.predicted} at ${p.date}`);
    assert.ok(p.lower >= 0, `lower ${p.lower} at ${p.date}`);
  });
});
check('empty input produces a horizon of zero-value points, not a crash', () => {
  const r = forecastRevenueSeries({ dates: [], values: [], horizon: 7, windowDays: 180 });
  assert.strictEqual(r.points.length, 7);
  r.points.forEach(p => assert.strictEqual(p.predicted, 0));
  assert.strictEqual(r.confidence, 'low');
});

console.log('computeVelocityTrend');
check('both periods below the volume floor -> insufficient_volume, not a fabricated %', () => {
  const t = computeVelocityTrend(3, 1, 5);
  assert.strictEqual(t.status, 'insufficient_volume');
  assert.strictEqual(t.changePct, null);
});
check('hand-computed +100% when volume clears the floor', () => {
  const t = computeVelocityTrend(20, 10, 5);
  assert.strictEqual(t.status, 'ok');
  assert.strictEqual(t.changePct, 100);
  assert.strictEqual(t.direction, 'up');
});
check('prior period zero with real current volume -> up, no divide-by-zero', () => {
  const t = computeVelocityTrend(10, 0, 5);
  assert.strictEqual(t.status, 'ok');
  assert.strictEqual(t.changePct, null);
  assert.strictEqual(t.direction, 'up');
});
check('small change within +/-5% reads as flat', () => {
  const t = computeVelocityTrend(102, 100, 5);
  assert.strictEqual(t.direction, 'flat');
});

console.log('daysToStockout');
check('hand-computed: 40 units at 4/day = 10 days', () => {
  assert.strictEqual(daysToStockout(40, 4), 10);
});
check('zero or negative ADU -> null (cannot project, not Infinity)', () => {
  assert.strictEqual(daysToStockout(40, 0), null);
  assert.strictEqual(daysToStockout(40, -1), null);
});
check('already out of stock -> 0 days, not negative', () => {
  assert.strictEqual(daysToStockout(0, 4), 0);
  assert.strictEqual(daysToStockout(-5, 4), 0);
});

console.log(`\n${passed} checks passed${process.exitCode ? ', SOME FAILED' : ''}`);
