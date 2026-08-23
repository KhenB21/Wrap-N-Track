// services/insightEngine.js
//
// Rule-based insight engine. Deliberately NOT an LLM: there is no LLM anywhere in
// this codebase and no API key. Deterministic templates over already-computed
// metrics are reproducible, free, instant, and every sentence traces to a rule you
// can point at on a whiteboard. This module narrates numbers computed elsewhere --
// it never invents one. If a metric is unknown (no cost data, no sales history,
// zero denominator), the rule returns null. Silence is correct; a fabricated
// insight is not.
//
// Every rule is a small pure function: (data) -> null | { insight, impactScore,
// requiresFinancialScope }. No DB calls in here -- routes/analytics.js queries and
// hands in plain objects/arrays, which is what makes every rule unit-testable with
// fixture data alone (see scripts/test_insightEngine.js). generateInsights() at the
// bottom wires the rules together, ranks the results, applies role scoping, and
// strips the internal ranking fields before returning the public shape:
//   { id, severity, category, title, body, metric, delta, actionLink }
//
// The endpoint this feeds (GET /api/analytics/insights) is shaped exactly like an
// LLM-backed version would be, so swapping the engine later is a service-layer
// change, not an API contract change.

const SEVERITY_WEIGHT = { critical: 3, warning: 2, info: 1 };

function round2(n) { return Math.round(n * 100) / 100; }
function formatPct(n) { return `${n > 0 ? '+' : ''}${round2(n)}%`; }
function formatPeso(n) { return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

// ── Rule 1: revenue trend ───────────────────────────────────────────────────
// Fires when revenue moved >10% vs the prior period. Requires a topProduct
// (the SKU with the largest absolute revenue delta between the two periods) --
// without one there is nothing honest to name, so the rule stays silent rather
// than fabricate an attribution.
const REVENUE_TREND_THRESHOLD_PCT = 10;

function checkRevenueTrend({ currentRevenue, previousRevenue, topProduct }) {
  if (previousRevenue === null || previousRevenue === undefined || previousRevenue === 0) return null;
  if (!topProduct || !topProduct.name) return null;

  const deltaPct = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  if (Math.abs(deltaPct) <= REVENUE_TREND_THRESHOLD_PCT) return null;

  const direction = deltaPct > 0 ? 'up' : 'down';
  const productDelta = topProduct.currentValue - topProduct.previousValue;
  const severity = Math.abs(deltaPct) >= 25 ? 'critical' : 'warning';

  return {
    requiresFinancialScope: true,
    impactScore: Math.min(100, Math.abs(deltaPct)),
    insight: {
      id: 'revenue-trend',
      severity,
      category: 'revenue',
      title: `Revenue ${direction} ${formatPct(deltaPct)} vs prior period`,
      body: `Revenue is ${direction} ${formatPct(deltaPct)} vs the prior period (${formatPeso(currentRevenue)} vs ${formatPeso(previousRevenue)}). ` +
        `${topProduct.name} contributed the most to this change, moving ${productDelta >= 0 ? '+' : ''}${formatPeso(productDelta)}.`,
      metric: { currentRevenue, previousRevenue, deltaPct: round2(deltaPct), topProductSku: topProduct.sku, topProductDelta: round2(productDelta) },
      delta: round2(deltaPct),
      actionLink: '/analytics/breakdown?dimension=product'
    }
  };
}

// ── Rule 2: stockout inside lead time ───────────────────────────────────────
// Fires per-SKU when the projected stockout date falls before a reorder placed
// today could arrive (daysToStockout <= leadTimeDays). Silent when either input
// is unknown (insufficient sales history -> daysToStockout is null, per
// forecastService.daysToStockout; no lead time on file).
function checkStockoutRisk({ sku, name, daysToStockout, leadTimeDays, recommendedReorderQuantity }) {
  if (daysToStockout === null || daysToStockout === undefined) return null;
  if (leadTimeDays === null || leadTimeDays === undefined || leadTimeDays <= 0) return null;
  if (daysToStockout > leadTimeDays) return null;

  const daysShort = leadTimeDays - daysToStockout;
  const severity = daysToStockout <= 0 || daysShort >= leadTimeDays * 0.5 ? 'critical' : 'warning';

  return {
    requiresFinancialScope: false,
    impactScore: Math.min(100, (daysShort / leadTimeDays) * 100),
    insight: {
      id: `stockout-risk:${sku}`,
      severity,
      category: 'inventory',
      title: `${name} projected to stock out before resupply`,
      body: daysToStockout <= 0
        ? `${name} (${sku}) is already out of available stock. Its lead time is ${leadTimeDays} days. Recommended reorder: ${recommendedReorderQuantity} units.`
        : `${name} (${sku}) is projected to stock out in ${daysToStockout} days, before its ${leadTimeDays}-day lead time. Recommended reorder: ${recommendedReorderQuantity} units.`,
      metric: { sku, daysToStockout, leadTimeDays, recommendedReorderQuantity },
      delta: round2(daysShort),
      actionLink: `/inventory/${sku}`
    }
  };
}

// ── Rule 3: velocity swing ──────────────────────────────────────────────────
// Fires per-SKU when 30-day sales velocity moved >25% vs the prior 30 days.
// `trend` is the object services/forecastService.computeVelocityTrend already
// produces -- this rule does not recompute it, only reads status/changePct.
// Silent when trend.status !== 'ok' (insufficient_volume, or the SKU itself has
// insufficient_data upstream and was never passed in at all).
const VELOCITY_CHANGE_THRESHOLD_PCT = 25;

function checkVelocityChange({ sku, name, trend }) {
  if (!trend || trend.status !== 'ok' || trend.changePct === null || trend.changePct === undefined) return null;
  if (Math.abs(trend.changePct) <= VELOCITY_CHANGE_THRESHOLD_PCT) return null;

  const severity = Math.abs(trend.changePct) >= 50 ? 'warning' : 'info';

  return {
    requiresFinancialScope: false,
    impactScore: Math.min(100, Math.abs(trend.changePct)),
    insight: {
      id: `velocity-change:${sku}`,
      severity,
      category: 'inventory',
      title: `${name} velocity ${trend.direction} ${formatPct(trend.changePct)}`,
      body: `${name} (${sku}) 30-day sales velocity is ${trend.direction} ${formatPct(trend.changePct)} vs the prior 30 days.`,
      metric: { sku, changePct: trend.changePct, direction: trend.direction },
      delta: trend.changePct,
      actionLink: `/inventory/${sku}`
    }
  };
}

// ── Rule 4: unverified payment proofs ───────────────────────────────────────
// Takes the full unverified-proof queue (not pre-filtered) so the >48h cutoff is
// exercised by the rule itself, which is what scripts/test_insightEngine.js
// asserts against fixtures on both sides of the cutoff.
const UNVERIFIED_PROOF_AGE_THRESHOLD_HOURS = 48;

function checkUnverifiedProofs(proofs) {
  const stale = (proofs || []).filter(p => p.ageHours > UNVERIFIED_PROOF_AGE_THRESHOLD_HOURS);
  if (stale.length === 0) return null;

  const oldestAgeHours = Math.max(...stale.map(p => p.ageHours));
  const severity = oldestAgeHours >= 168 || stale.length >= 5 ? 'critical' : 'warning';

  return {
    requiresFinancialScope: false,
    impactScore: Math.min(100, oldestAgeHours),
    insight: {
      id: 'unverified-payment-proofs',
      severity,
      category: 'payments',
      title: `${stale.length} payment proof${stale.length === 1 ? '' : 's'} awaiting verification`,
      body: `${stale.length} payment proof${stale.length === 1 ? '' : 's'} ${stale.length === 1 ? 'has' : 'have'} been awaiting verification for more than ${UNVERIFIED_PROOF_AGE_THRESHOLD_HOURS} hours (oldest: ${round2(oldestAgeHours)}h).`,
      metric: { count: stale.length, oldestAgeHours: round2(oldestAgeHours) },
      delta: stale.length,
      actionLink: '/analytics/payments'
    }
  };
}

// ── Rule 5: deliveries past expected_delivery ───────────────────────────────
function checkLateDeliveries(deliveries) {
  const late = (deliveries || []).filter(d => d.daysLate > 0);
  if (late.length === 0) return null;

  const maxDaysLate = Math.max(...late.map(d => d.daysLate));
  const severity = maxDaysLate >= 7 || late.length >= 10 ? 'critical' : 'warning';

  return {
    requiresFinancialScope: false,
    impactScore: Math.min(100, maxDaysLate * 10),
    insight: {
      id: 'late-deliveries',
      severity,
      category: 'delivery',
      title: `${late.length} ${late.length === 1 ? 'delivery' : 'deliveries'} past expected date`,
      body: `${late.length} order${late.length === 1 ? '' : 's'} ${late.length === 1 ? 'is' : 'are'} past ${late.length === 1 ? 'its' : 'their'} expected delivery date, up to ${maxDaysLate} day${maxDaysLate === 1 ? '' : 's'} late.`,
      metric: { count: late.length, maxDaysLate },
      delta: late.length,
      actionLink: '/deliveries?filter=late'
    }
  };
}

// ── Rule 6: cancellation rate spike ─────────────────────────────────────────
// Fires when the current-period cancellation rate is both meaningfully above the
// trailing average in relative terms (>50% relative increase) AND clears an
// absolute floor (+3 percentage points) -- the floor exists for the same reason
// forecastService.computeVelocityTrend has one: without it a move from 0.1% to
// 0.3% cancellations reads as "+200%", which is noise, not a trend worth an alert.
const CANCELLATION_RELATIVE_THRESHOLD = 1.5; // current must be >= 1.5x trailing average
const CANCELLATION_ABSOLUTE_FLOOR_PP = 3;    // and at least 3 percentage points higher

function checkCancellationRateSpike({ currentRate, trailingAverage }) {
  if (currentRate === null || currentRate === undefined) return null;
  if (trailingAverage === null || trailingAverage === undefined) return null;
  if (trailingAverage <= 0) return null;

  const deltaPP = currentRate - trailingAverage;
  if (currentRate < trailingAverage * CANCELLATION_RELATIVE_THRESHOLD) return null;
  if (deltaPP < CANCELLATION_ABSOLUTE_FLOOR_PP) return null;

  const severity = currentRate >= trailingAverage * 2 ? 'critical' : 'warning';
  const relativeIncreasePct = (deltaPP / trailingAverage) * 100;

  return {
    requiresFinancialScope: false,
    impactScore: Math.min(100, relativeIncreasePct),
    insight: {
      id: 'cancellation-rate-spike',
      severity,
      category: 'sales',
      title: `Cancellation rate ${formatPct(relativeIncreasePct)} above trailing average`,
      body: `Cancellation rate is ${round2(currentRate)}% this period vs a trailing average of ${round2(trailingAverage)}%.`,
      metric: { currentRate: round2(currentRate), trailingAverage: round2(trailingAverage) },
      delta: round2(deltaPP),
      actionLink: '/analytics/operations'
    }
  };
}

// ── Rule 7: dead stock value ─────────────────────────────────────────────────
// Threshold is a judgment call (not specified by the brief) documented here
// rather than buried in a magic number at the call site.
const DEAD_STOCK_VALUE_THRESHOLD = 20000; // PHP

function checkDeadStock({ deadStockValue, threshold = DEAD_STOCK_VALUE_THRESHOLD }) {
  if (deadStockValue === null || deadStockValue === undefined) return null;
  if (deadStockValue <= threshold) return null;

  const severity = deadStockValue >= threshold * 3 ? 'critical' : 'warning';

  return {
    requiresFinancialScope: true,
    impactScore: Math.min(100, (deadStockValue / threshold) * 50),
    insight: {
      id: 'dead-stock-value',
      severity,
      category: 'inventory',
      title: `${formatPeso(deadStockValue)} in dead stock`,
      body: `${formatPeso(deadStockValue)} of inventory has had no sales in the last 90 days, above the ${formatPeso(threshold)} threshold.`,
      metric: { deadStockValue, threshold },
      delta: round2(deadStockValue - threshold),
      actionLink: '/analytics/inventory-health'
    }
  };
}

// ── Rule 8: outstanding AR ──────────────────────────────────────────────────
const OUTSTANDING_AR_THRESHOLD = 50000; // PHP, judgment call -- see rule 7 note

function checkOutstandingAr({ outstandingAr, threshold = OUTSTANDING_AR_THRESHOLD }) {
  if (outstandingAr === null || outstandingAr === undefined) return null;
  if (outstandingAr <= threshold) return null;

  const severity = outstandingAr >= threshold * 2 ? 'critical' : 'warning';

  return {
    requiresFinancialScope: true,
    impactScore: Math.min(100, (outstandingAr / threshold) * 50),
    insight: {
      id: 'outstanding-ar',
      severity,
      category: 'payments',
      title: `${formatPeso(outstandingAr)} outstanding AR`,
      body: `${formatPeso(outstandingAr)} in accounts receivable is outstanding, above the ${formatPeso(threshold)} threshold.`,
      metric: { outstandingAr, threshold },
      delta: round2(outstandingAr - threshold),
      actionLink: '/analytics/payments'
    }
  };
}

// ── orchestration ────────────────────────────────────────────────────────────
// Ranked by severity first, then by impactScore (a 0-100 "how far past normal"
// heuristic each rule computes for itself -- see the per-rule comments). This is
// a documented approximation, not a rigorous cross-category $ model: comparing a
// revenue swing to a stockout risk to a late delivery on one scale is inherently
// a judgment call, so severity is the primary, load-bearing sort key and
// impactScore only breaks ties within the same severity tier.
function rankAndFinalize(candidates) {
  return candidates
    .filter(Boolean)
    .sort((a, b) => {
      const sevDiff = SEVERITY_WEIGHT[b.insight.severity] - SEVERITY_WEIGHT[a.insight.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.impactScore - a.impactScore;
    })
    .map(c => c.insight);
}

// data shape:
// {
//   revenue: { currentRevenue, previousRevenue, topProduct },
//   demandForecast: [{ sku, name, daysToStockout, leadTimeDays, recommendedReorderQuantity, trend }],
//   unverifiedProofs: [{ invoiceNumber, orderId, ageHours }],
//   lateDeliveries: [{ orderId, customerName, daysLate }],
//   cancellation: { currentRate, trailingAverage },
//   deadStock: { deadStockValue, threshold? },
//   outstandingAr: { outstandingAr, threshold? }
// }
function generateInsights(data, scope) {
  const candidates = [];

  candidates.push(checkRevenueTrend(data.revenue || {}));

  (data.demandForecast || []).forEach(item => {
    candidates.push(checkStockoutRisk(item));
    candidates.push(checkVelocityChange(item));
  });

  candidates.push(checkUnverifiedProofs(data.unverifiedProofs));
  candidates.push(checkLateDeliveries(data.lateDeliveries));
  candidates.push(checkCancellationRateSpike(data.cancellation || {}));
  candidates.push(checkDeadStock(data.deadStock || {}));
  candidates.push(checkOutstandingAr(data.outstandingAr || {}));

  const scoped = candidates
    .filter(Boolean)
    .filter(c => scope === 'financial' || !c.requiresFinancialScope);

  return rankAndFinalize(scoped);
}

module.exports = {
  checkRevenueTrend,
  checkStockoutRisk,
  checkVelocityChange,
  checkUnverifiedProofs,
  checkLateDeliveries,
  checkCancellationRateSpike,
  checkDeadStock,
  checkOutstandingAr,
  generateInsights,
  DEAD_STOCK_VALUE_THRESHOLD,
  OUTSTANDING_AR_THRESHOLD
};
