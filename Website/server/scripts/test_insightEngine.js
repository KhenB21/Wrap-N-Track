/*
 Unit tests for services/insightEngine.js -- pure functions, no DB, no server.
 Usage:
   node scripts/test_insightEngine.js
*/
const assert = require('assert');
const {
  checkRevenueTrend,
  checkStockoutRisk,
  checkVelocityChange,
  checkUnverifiedProofs,
  checkLateDeliveries,
  checkCancellationRateSpike,
  checkDeadStock,
  checkOutstandingAr,
  generateInsights
} = require('../services/insightEngine');

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

console.log('checkRevenueTrend');
check('+15% with a top product fires, names the product and its real delta', () => {
  const r = checkRevenueTrend({
    currentRevenue: 115000, previousRevenue: 100000,
    topProduct: { sku: 'SKU1', name: 'Gift Box', currentValue: 40000, previousValue: 25000 }
  });
  assert.ok(r, 'expected an insight');
  assert.strictEqual(r.insight.severity, 'warning');
  assert.ok(r.insight.body.includes('Gift Box'), 'body should name the top product');
  assert.ok(r.insight.body.includes('15'), 'body should reference the real percentage');
  assert.strictEqual(r.requiresFinancialScope, true);
});
check('-30% is critical severity', () => {
  const r = checkRevenueTrend({
    currentRevenue: 70000, previousRevenue: 100000,
    topProduct: { sku: 'SKU1', name: 'Gift Box', currentValue: 5000, previousValue: 20000 }
  });
  assert.strictEqual(r.insight.severity, 'critical');
  assert.strictEqual(r.insight.body.includes('down'), true);
});
check('+5% (below threshold) does not fire', () => {
  const r = checkRevenueTrend({
    currentRevenue: 105000, previousRevenue: 100000,
    topProduct: { sku: 'SKU1', name: 'Gift Box', currentValue: 1, previousValue: 1 }
  });
  assert.strictEqual(r, null);
});
check('no topProduct -> silent even though the swing qualifies (no fabricated attribution)', () => {
  const r = checkRevenueTrend({ currentRevenue: 200000, previousRevenue: 100000, topProduct: null });
  assert.strictEqual(r, null);
});
check('previousRevenue = 0 -> silent (undefined percentage base)', () => {
  const r = checkRevenueTrend({ currentRevenue: 5000, previousRevenue: 0, topProduct: { sku: 'X', name: 'X', currentValue: 5000, previousValue: 0 } });
  assert.strictEqual(r, null);
});

console.log('checkStockoutRisk');
check('daysToStockout < leadTimeDays fires', () => {
  const r = checkStockoutRisk({ sku: 'SKU1', name: 'Ribbon', daysToStockout: 3, leadTimeDays: 7, recommendedReorderQuantity: 50 });
  assert.ok(r);
  assert.ok(r.insight.body.includes('3'));
  assert.ok(r.insight.body.includes('7-day'));
  assert.strictEqual(r.requiresFinancialScope, false);
});
check('daysToStockout well beyond leadTimeDays does not fire', () => {
  const r = checkStockoutRisk({ sku: 'SKU1', name: 'Ribbon', daysToStockout: 60, leadTimeDays: 7, recommendedReorderQuantity: 0 });
  assert.strictEqual(r, null);
});
check('daysToStockout exactly equal to leadTimeDays fires (would arrive exactly on empty)', () => {
  const r = checkStockoutRisk({ sku: 'SKU1', name: 'Ribbon', daysToStockout: 7, leadTimeDays: 7, recommendedReorderQuantity: 10 });
  assert.ok(r);
});
check('null daysToStockout (insufficient sales history upstream) -> silent, not fabricated', () => {
  const r = checkStockoutRisk({ sku: 'SKU1', name: 'Ribbon', daysToStockout: null, leadTimeDays: 7, recommendedReorderQuantity: 10 });
  assert.strictEqual(r, null);
});
check('already out of stock (daysToStockout=0) is critical', () => {
  const r = checkStockoutRisk({ sku: 'SKU1', name: 'Ribbon', daysToStockout: 0, leadTimeDays: 7, recommendedReorderQuantity: 10 });
  assert.strictEqual(r.insight.severity, 'critical');
});

console.log('checkVelocityChange');
check('+40% ok-status trend fires', () => {
  const r = checkVelocityChange({ sku: 'SKU1', name: 'Mug', trend: { status: 'ok', changePct: 40, direction: 'up' } });
  assert.ok(r);
  assert.ok(r.insight.body.includes('40'));
});
check('+10% (below threshold) does not fire', () => {
  const r = checkVelocityChange({ sku: 'SKU1', name: 'Mug', trend: { status: 'ok', changePct: 10, direction: 'up' } });
  assert.strictEqual(r, null);
});
check('insufficient_volume status does not fire, even with a large nominal changePct', () => {
  const r = checkVelocityChange({ sku: 'SKU1', name: 'Mug', trend: { status: 'insufficient_volume', changePct: null, direction: 'flat' } });
  assert.strictEqual(r, null);
});

console.log('checkUnverifiedProofs');
check('a proof older than 48h fires', () => {
  const r = checkUnverifiedProofs([{ invoiceNumber: 'INV-1', orderId: 'O-1', ageHours: 72 }]);
  assert.ok(r);
  assert.ok(r.insight.body.includes('1 payment proof'));
});
check('all proofs under 48h -> silent', () => {
  const r = checkUnverifiedProofs([{ invoiceNumber: 'INV-1', orderId: 'O-1', ageHours: 10 }, { invoiceNumber: 'INV-2', orderId: 'O-2', ageHours: 47.9 }]);
  assert.strictEqual(r, null);
});
check('empty queue -> silent', () => {
  assert.strictEqual(checkUnverifiedProofs([]), null);
  assert.strictEqual(checkUnverifiedProofs(undefined), null);
});
check('5+ stale proofs is critical even if none individually very old', () => {
  const proofs = Array.from({ length: 5 }, (_, i) => ({ invoiceNumber: `INV-${i}`, orderId: `O-${i}`, ageHours: 50 }));
  const r = checkUnverifiedProofs(proofs);
  assert.strictEqual(r.insight.severity, 'critical');
});

console.log('checkLateDeliveries');
check('one late delivery fires with singular wording', () => {
  const r = checkLateDeliveries([{ orderId: 'O-1', customerName: 'A', daysLate: 2 }]);
  assert.ok(r);
  assert.ok(r.insight.title.includes('1 delivery'));
});
check('no late deliveries -> silent', () => {
  assert.strictEqual(checkLateDeliveries([{ orderId: 'O-1', customerName: 'A', daysLate: 0 }]), null);
  assert.strictEqual(checkLateDeliveries([]), null);
});
check('10+ late deliveries or >=7 days late is critical', () => {
  const r1 = checkLateDeliveries([{ orderId: 'O-1', customerName: 'A', daysLate: 8 }]);
  assert.strictEqual(r1.insight.severity, 'critical');
  const many = Array.from({ length: 10 }, (_, i) => ({ orderId: `O-${i}`, customerName: 'A', daysLate: 1 }));
  assert.strictEqual(checkLateDeliveries(many).insight.severity, 'critical');
});

console.log('checkCancellationRateSpike');
check('current 15% vs trailing 5% (3x, +10pp) fires critical', () => {
  const r = checkCancellationRateSpike({ currentRate: 15, trailingAverage: 5 });
  assert.ok(r);
  assert.strictEqual(r.insight.severity, 'critical');
});
check('small absolute move (0.2% vs 0.1%, technically +100% relative) stays silent below the floor', () => {
  const r = checkCancellationRateSpike({ currentRate: 0.2, trailingAverage: 0.1 });
  assert.strictEqual(r, null);
});
check('current only modestly above trailing (6% vs 5%, +1pp) does not fire', () => {
  const r = checkCancellationRateSpike({ currentRate: 6, trailingAverage: 5 });
  assert.strictEqual(r, null);
});
check('unknown trailing average -> silent, not fabricated', () => {
  assert.strictEqual(checkCancellationRateSpike({ currentRate: 20, trailingAverage: null }), null);
  assert.strictEqual(checkCancellationRateSpike({ currentRate: 20, trailingAverage: undefined }), null);
});

console.log('checkDeadStock');
check('above threshold fires, names the real value', () => {
  const r = checkDeadStock({ deadStockValue: 30000, threshold: 20000 });
  assert.ok(r);
  assert.ok(r.insight.body.includes('30,000.00'));
  assert.strictEqual(r.requiresFinancialScope, true);
});
check('at or below threshold -> silent', () => {
  assert.strictEqual(checkDeadStock({ deadStockValue: 20000, threshold: 20000 }), null);
  assert.strictEqual(checkDeadStock({ deadStockValue: 5000, threshold: 20000 }), null);
});
check('unknown dead stock value -> silent', () => {
  assert.strictEqual(checkDeadStock({ deadStockValue: null, threshold: 20000 }), null);
});

console.log('checkOutstandingAr');
check('above threshold fires', () => {
  const r = checkOutstandingAr({ outstandingAr: 80000, threshold: 50000 });
  assert.ok(r);
  assert.strictEqual(r.requiresFinancialScope, true);
});
check('at or below threshold -> silent', () => {
  assert.strictEqual(checkOutstandingAr({ outstandingAr: 50000, threshold: 50000 }), null);
});
check('critical when >= 2x threshold', () => {
  const r = checkOutstandingAr({ outstandingAr: 100001, threshold: 50000 });
  assert.strictEqual(r.insight.severity, 'critical');
});

console.log('generateInsights (orchestration + scoping + ranking)');
const fullFixture = {
  revenue: {
    currentRevenue: 150000, previousRevenue: 100000,
    topProduct: { sku: 'SKU1', name: 'Gift Box', currentValue: 60000, previousValue: 20000 }
  },
  demandForecast: [
    { sku: 'SKU2', name: 'Ribbon', daysToStockout: 2, leadTimeDays: 7, recommendedReorderQuantity: 40, trend: { status: 'ok', changePct: 5, direction: 'flat' } },
    { sku: 'SKU3', name: 'Mug', daysToStockout: 90, leadTimeDays: 7, recommendedReorderQuantity: 0, trend: { status: 'ok', changePct: 60, direction: 'up' } }
  ],
  unverifiedProofs: [{ invoiceNumber: 'INV-1', orderId: 'O-1', ageHours: 96 }],
  lateDeliveries: [{ orderId: 'O-2', customerName: 'B', daysLate: 9 }],
  cancellation: { currentRate: 20, trailingAverage: 5 },
  deadStock: { deadStockValue: 90000 },
  outstandingAr: { outstandingAr: 200000 }
};

check('financial scope receives every triggered insight, critical-first', () => {
  const insights = generateInsights(fullFixture, 'financial');
  // All 8 rules fire against this fixture: revenue swing, SKU2 stockout risk,
  // SKU3 velocity swing, stale proof, late delivery, cancellation spike, dead
  // stock, and outstanding AR.
  assert.strictEqual(insights.length, 8);
  for (let i = 1; i < insights.length; i++) {
    const wPrev = { critical: 3, warning: 2, info: 1 }[insights[i - 1].severity];
    const wCur = { critical: 3, warning: 2, info: 1 }[insights[i].severity];
    assert.ok(wPrev >= wCur, `severity order broken at index ${i}`);
  }
  const ids = insights.map(i => i.id);
  assert.ok(ids.includes('revenue-trend'));
  assert.ok(ids.includes('dead-stock-value'));
  assert.ok(ids.includes('outstanding-ar'));
});
check('operational scope receives zero financial insights', () => {
  const insights = generateInsights(fullFixture, 'operational');
  const financialIds = ['revenue-trend', 'dead-stock-value', 'outstanding-ar'];
  insights.forEach(i => assert.ok(!financialIds.includes(i.id), `leaked financial insight: ${i.id}`));
  // but still receives the operational-safe ones
  const ids = insights.map(i => i.id);
  assert.ok(ids.includes('stockout-risk:SKU2'));
  assert.ok(ids.includes('velocity-change:SKU3'));
  assert.ok(ids.includes('unverified-payment-proofs'));
  assert.ok(ids.includes('late-deliveries'));
  assert.ok(ids.includes('cancellation-rate-spike'));
});
check('every emitted body string contains a real number from the fixture, not a hardcoded example', () => {
  const insights = generateInsights(fullFixture, 'financial');
  const revenueInsight = insights.find(i => i.id === 'revenue-trend');
  assert.ok(revenueInsight.body.includes('150,000.00'));
  assert.ok(revenueInsight.body.includes('100,000.00'));
  const stockoutInsight = insights.find(i => i.id === 'stockout-risk:SKU2');
  assert.ok(stockoutInsight.body.includes('2 days'));
  const deadStockInsight = insights.find(i => i.id === 'dead-stock-value');
  assert.ok(deadStockInsight.body.includes('90,000.00'));
});
check('empty/unknown input across the board produces zero insights -- total silence is valid output', () => {
  const insights = generateInsights({}, 'financial');
  assert.deepStrictEqual(insights, []);
});
check('no per-SKU insight for an insufficient_data SKU never even entering demandForecast', () => {
  const fixture = { demandForecast: [{ sku: 'SKU9', name: 'New Item', daysToStockout: null, leadTimeDays: 7, recommendedReorderQuantity: 0, trend: { status: 'insufficient_volume', changePct: null, direction: 'flat' } }] };
  const insights = generateInsights(fixture, 'financial');
  assert.deepStrictEqual(insights, []);
});

console.log(`\n${passed} checks passed${process.exitCode ? ', SOME FAILED' : ''}`);
