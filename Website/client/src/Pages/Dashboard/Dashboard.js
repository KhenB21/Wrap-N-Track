import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/AppShell';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import EmptyState from '../../Components/EmptyState';
import { TrendChart, BarChart, Sparkline } from '../../Components/Charts';
import { useDashboardData } from '../../hooks/useDashboardData';
import usePermissions from '../../hooks/usePermissions';
import './Dashboard.css';

// ── Formatting ─────────────────────────────────────────────────────────────
const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const NUM  = new Intl.NumberFormat('en-PH');
const formatPeso = v => PESO.format(v ?? 0);
const formatNum  = v => NUM.format(v ?? 0);

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Build a human sentence from an activity feed row
function buildSentence(item) {
  const actor = item.actorKind === 'customer' ? 'A customer'
    : item.actorKind === 'system' ? 'System'
    : (item.actorName || 'Unknown user');
  const eid = item.entityId ? `#${item.entityId}` : '';
  switch (item.eventType) {
    case 'order_status_change':
      return `${actor} updated order ${eid} to "${item.detail?.new_status || ''}"`;
    case 'order_created':
      return `${actor} placed order ${eid}`;
    case 'order_archived':
      return `${actor} completed/archived order ${eid}`;
    case 'delivery_status_change':
      return `${actor} updated delivery status for ${eid}`;
    case 'invoice_created':
      return `${actor} created invoice ${eid}`;
    case 'invoice_paid':
      return `${actor} marked invoice ${eid} as paid`;
    case 'stock_movement':
      return `${actor} recorded stock movement for ${item.detail?.sku || eid}`;
    case 'login':
      return `${actor} logged in`;
    default:
      return `${actor} performed action on ${item.entityType || 'record'} ${eid}`;
  }
}

function entityLink(item) {
  switch (item.entityType) {
    case 'order': return `/orders/${item.entityId}`;
    case 'invoice': return `/invoices/${item.entityId}`;
    case 'delivery': return `/deliveries`;
    default: return null;
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────
function DeltaBadge({ pct, direction }) {
  if (pct == null) return null;
  const color = direction === 'up' ? 'var(--success)' : direction === 'down' ? 'var(--danger)' : 'var(--text-muted)';
  return (
    <span className="db-delta" style={{ color }}>
      {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'} {Math.abs(Number(pct)).toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, pct, direction, sparkData, isCurrency, onClick, loading, color }) {
  return (
    <div
      className={`db-kpi-card ui-card ui-card-hover${color ? ` db-kpi-${color}` : ''}`}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      <div className="db-kpi-label">{label}</div>
      <div className="db-kpi-value">
        {loading ? <span className="skeleton-value skeleton-wide" /> : value}
      </div>
      {!loading && <DeltaBadge pct={pct} direction={direction} />}
      {sparkData && sparkData.length > 0 && !loading && (
        <div className="db-kpi-spark">
          <Sparkline data={sparkData} dataKey="value" isCurrency={isCurrency} height={44} />
        </div>
      )}
    </div>
  );
}

const SEV_COLOR = { critical: 'var(--danger)', warning: 'var(--warning)', info: 'var(--brand)' };
const SEV_BG    = { critical: 'rgba(239,68,68,0.07)', warning: 'rgba(245,158,11,0.07)', info: 'rgba(99,102,241,0.07)' };

function InsightRow({ insight }) {
  return (
    <div className="db-insight-row" style={{ borderLeftColor: SEV_COLOR[insight.severity] || SEV_COLOR.info, background: SEV_BG[insight.severity] || SEV_BG.info }}>
      <div className="db-insight-sev" style={{ color: SEV_COLOR[insight.severity] || SEV_COLOR.info }}>{insight.severity}</div>
      <div>
        <div className="db-insight-title">{insight.title}</div>
        <div className="db-insight-body">{insight.body}</div>
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  const navigate = useNavigate();
  const sentence = buildSentence(item);
  const link = entityLink(item);
  return (
    <div className="db-activity-row" onClick={() => link && navigate(link)} style={{ cursor: link ? 'pointer' : undefined }}>
      <div className="db-activity-actor">
        {item.actorKind === 'customer' ? '🧑' : item.actorKind === 'system' ? '⚙️' : '👤'}
      </div>
      <div className="db-activity-body">
        <span className="db-activity-sentence">{sentence}</span>
        <span className="db-activity-time">{relativeTime(item.ts)}</span>
      </div>
    </div>
  );
}

function PipelineFunnel({ operations }) {
  // stageAges from /operations: [{status, orderCount, medianAgeDays}]
  const stages = (operations?.stageAges || []).slice(0, 8);
  if (!stages.length) return <EmptyState message="No active orders" />;
  const max = Math.max(...stages.map(s => s.orderCount), 1);
  return (
    <div className="db-funnel">
      {stages.map((s, i) => (
        <div key={i} className="db-funnel-stage">
          <div className="db-funnel-bar-wrap">
            <div className="db-funnel-bar" style={{ width: `${Math.max(6, (s.orderCount / max) * 100)}%` }} />
          </div>
          <div className="db-funnel-label">
            <span>{s.status}</span>
            <span className="db-funnel-count">{formatNum(s.orderCount)}</span>
            {s.medianAgeDays != null && <span className="db-funnel-age">med {Number(s.medianAgeDays).toFixed(1)}d</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AttentionRow({ icon, label, value, linkTo, severity = 'warning' }) {
  const navigate = useNavigate();
  const color = SEV_COLOR[severity] || SEV_COLOR.warning;
  const go = () => linkTo && navigate(linkTo);
  return (
    <div
      className="db-attn-row"
      onClick={go}
      tabIndex={linkTo ? 0 : undefined}
      role={linkTo ? 'button' : undefined}
      onKeyDown={linkTo ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } } : undefined}
      style={{ cursor: linkTo ? 'pointer' : undefined }}
    >
      <span className="db-attn-icon" style={{ color }}>{icon}</span>
      <span className="db-attn-label">{label}</span>
      {value && <span className="db-attn-value" style={{ color }}>{value}</span>}
    </div>
  );
}

// ── Period selector ────────────────────────────────────────────────────────
const PERIODS = [
  { label: '7d',  value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'MTD', value: 'mtd' },
  { label: 'YTD', value: 'ytd' },
];

const FINANCIAL_ROLES = new Set(['admin', 'super_admin', 'director', 'sales_manager', 'assistant_sales', 'business_developer']);
const MANAGER_ROLES   = new Set(['admin', 'super_admin', 'director', 'sales_manager', 'operations_manager']);

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30d');
  const { role } = usePermissions();

  const isFinancial = FINANCIAL_ROLES.has(role);
  const isManager   = MANAGER_ROLES.has(role);

  const {
    kpis, tsRevenue, tsOrders, forecast, operations, inventoryHealth,
    workQueue, insights, breakdown, loading, error,
    activity, activityLoading, loadMoreActivity, activityCursor,
    teamPerformance, myActivity,
  } = useDashboardData(period);

  // Sparklines from KPI data (already include sparkline arrays)
  const sparkRevenue = useMemo(() => (kpis?.revenue?.sparkline || []).map(v => ({ value: Number(v) })), [kpis]);
  const sparkOrders  = useMemo(() => (kpis?.orders?.sparkline  || []).map(v => ({ value: Number(v) })), [kpis]);
  const sparkAov     = useMemo(() => (kpis?.aov?.sparkline     || []).map(v => ({ value: Number(v) })), [kpis]);

  // Combined trend data: merge revenue timeseries + orders timeseries + forecast points
  const trendData = useMemo(() => {
    const map = new Map();
    (tsRevenue?.series || []).forEach(d => {
      const key = d.bucket ? new Date(d.bucket).toISOString().slice(0, 10) : null;
      if (key) map.set(key, { date: key, revenue: Number(d.value || 0) });
    });
    (tsOrders?.series || []).forEach(d => {
      const key = d.bucket ? new Date(d.bucket).toISOString().slice(0, 10) : null;
      if (!key) return;
      const existing = map.get(key) || { date: key };
      map.set(key, { ...existing, orders: Number(d.value || 0) });
    });
    // Forecast points
    (forecast?.points || []).forEach(p => {
      const existing = map.get(p.date) || { date: p.date };
      map.set(p.date, { ...existing, forecastRevenue: p.predicted, forecastLower: p.lower, forecastUpper: p.upper });
    });
    return Array.from(map.values()).sort((a, b) => a.date < b.date ? -1 : 1);
  }, [tsRevenue, tsOrders, forecast]);

  // Last actual date = last date that has a real revenue value (before forecast-only points)
  const lastActualDate = useMemo(() => {
    const pts = trendData.filter(d => d.revenue != null);
    return pts.length ? pts[pts.length - 1].date : null;
  }, [trendData]);

  // Top products: breakdown returns [{key, label, value, sharePct}]
  const topProducts = useMemo(() => {
    return (breakdown || []).slice(0, 8).map(r => ({
      name: r.label || r.key,
      value: Number(r.value || 0),
      pct: r.sharePct,
    }));
  }, [breakdown]);

  // Attention items from workQueue (array) + inventoryHealth
  const attentionItems = useMemo(() => {
    const items = [];
    const wq = workQueue || [];

    const proofsCount = wq.filter(i => i.type === 'verify_proof').length;
    const lateCount   = wq.filter(i => i.type === 'dispatch_delivery' && i.severity === 'high').length;
    const reorderCount = wq.filter(i => i.type === 'reorder_sku' && i.severity === 'high').length;
    const packHigh    = wq.filter(i => i.type === 'pack_order' && i.severity === 'high').length;

    if (proofsCount > 0)  items.push({ icon: '⚠️', label: `${proofsCount} payment proof${proofsCount > 1 ? 's' : ''} awaiting verification`, linkTo: '/invoices', severity: proofsCount >= 5 ? 'critical' : 'warning' });
    if (lateCount > 0)    items.push({ icon: '🚚', label: `${lateCount} overdue deliver${lateCount > 1 ? 'ies' : 'y'}`, linkTo: '/deliveries?filter=late', severity: lateCount >= 10 ? 'critical' : 'warning' });
    if (reorderCount > 0) items.push({ icon: '📦', label: `${reorderCount} SKU${reorderCount > 1 ? 's' : ''} need urgent reorder`, linkTo: '/inventory', severity: 'critical' });
    if (packHigh > 0)     items.push({ icon: '🔄', label: `${packHigh} overdue pack order${packHigh > 1 ? 's' : ''}`, linkTo: '/orders', severity: 'warning' });

    if (isFinancial && inventoryHealth?.deadStockValue > 20000) {
      items.push({ icon: '📉', label: 'Dead stock above ₱20,000 threshold', value: formatPeso(inventoryHealth.deadStockValue), linkTo: '/analytics/inventory-health', severity: 'warning' });
    }
    return items;
  }, [workQueue, inventoryHealth, isFinancial]);

  // Count for KPI cards (operational)
  const packCount     = (workQueue || []).filter(i => i.type === 'pack_order').length;
  const dispatchCount = (workQueue || []).filter(i => i.type === 'dispatch_delivery').length;
  const reorderTotal  = (workQueue || []).filter(i => i.type === 'reorder_sku').length;
  const stockoutCount = (workQueue || []).filter(i => i.type === 'reorder_sku' && i.severity === 'high').length;

  // Inventory health fields
  const invH = inventoryHealth || {};

  // Team performance: { data: [...] } — array of members
  const teamMembers = Array.isArray(teamPerformance) ? teamPerformance : [];

  return (
    <AppShell>
      <header className="ui-page-header">
        <div className="ui-page-header-text">
          <h1 className="ui-page-title">Dashboard</h1>
        </div>
        <div className="db-period-selector">
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={`db-period-btn${period === p.value ? ' active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="db-error-banner">{error}</div>}

      {/* ── Hero KPI row ─────────────────────────────────────────────────── */}
      <section className="db-section">
        <div className="db-kpi-row">
          {isFinancial ? (
            <>
              <KpiCard label="Revenue" value={formatPeso(kpis?.revenue?.value)} pct={kpis?.revenue?.deltaPct} direction={kpis?.revenue?.direction} sparkData={sparkRevenue} isCurrency loading={loading} color="brand" />
              <KpiCard label="Orders" value={formatNum(kpis?.orders?.value)} pct={kpis?.orders?.deltaPct} direction={kpis?.orders?.direction} sparkData={sparkOrders} loading={loading} color="green" />
              <KpiCard label="Avg Order Value" value={formatPeso(kpis?.aov?.value)} pct={kpis?.aov?.deltaPct} direction={kpis?.aov?.direction} sparkData={sparkAov} isCurrency loading={loading} color="blue" />
              <KpiCard label="Outstanding AR" value={formatPeso(kpis?.outstandingAr?.value)} loading={loading} color="orange" onClick={() => navigate('/invoices')} />
            </>
          ) : (
            <>
              <KpiCard label="Orders to Pack" value={formatNum(packCount)} loading={loading} color="orange" onClick={() => navigate('/orders')} />
              <KpiCard label="Ready to Dispatch" value={formatNum(dispatchCount)} loading={loading} color="blue" onClick={() => navigate('/orders')} />
              <KpiCard label="Low Stock SKUs" value={formatNum(invH.lowStockCount || 0)} loading={loading} color="orange" onClick={() => navigate('/inventory', { state: { filter: 'low-stock' } })} />
              <KpiCard label="Stockout Risks" value={formatNum(stockoutCount)} loading={loading} color="red" onClick={() => navigate('/inventory')} />
            </>
          )}
        </div>
      </section>

      {/* ── Attention Required ───────────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <section className="db-section">
          <h2 className="db-section-title">Attention Required</h2>
          <div className="ui-card db-attn-panel">
            {attentionItems.map((item, i) => <AttentionRow key={i} {...item} />)}
          </div>
        </section>
      )}

      {/* ── Revenue & Orders trend ───────────────────────────────────────── */}
      {isFinancial && (
        <section className="db-section">
          <h2 className="db-section-title">Revenue &amp; Orders Trend</h2>
          <div className="ui-card db-chart-card">
            {loading ? (
              <div className="db-chart-skeleton" style={{ height: 300 }} />
            ) : trendData.length === 0 ? (
              <EmptyState message="No trend data available for this period" />
            ) : (
              <TrendChart
                data={trendData}
                leftKey="revenue"
                rightKey="orders"
                forecastKey="forecastRevenue"
                forecastLower="forecastLower"
                forecastUpper="forecastUpper"
                leftLabel="Revenue"
                rightLabel="Orders"
                leftCurrency
                splitAt={lastActualDate}
                height={300}
                ariaLabel="Revenue and orders trend chart"
              />
            )}
            {forecast && (
              <div className="db-forecast-note">
                30-day forecast — confidence: <strong>{forecast.confidence}</strong>
                {forecast.dataCompleteness != null && ` · data completeness: ${Math.round(forecast.dataCompleteness * 100)}%`}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Middle row: Pipeline + Top Products ─────────────────────────── */}
      <section className="db-section db-row-2col">
        <div className="ui-card db-chart-card">
          <h3 className="db-card-title">Order Pipeline</h3>
          {loading ? (
            <div className="db-chart-skeleton" style={{ height: 180 }} />
          ) : (
            <PipelineFunnel operations={operations} />
          )}
        </div>

        <div className="ui-card db-chart-card">
          <h3 className="db-card-title">Top Products {isFinancial ? 'by Revenue' : '(by activity)'}</h3>
          {loading ? (
            <div className="db-chart-skeleton" style={{ height: 180 }} />
          ) : topProducts.length === 0 ? (
            <EmptyState message="No product data for this period" />
          ) : (
            <BarChart
              data={topProducts}
              dataKey="value"
              nameKey="name"
              layout="horizontal"
              isCurrency={isFinancial}
              showValueLabels={false}
              height={Math.max(180, topProducts.length * 34)}
              ariaLabel="Top products by revenue"
              onBarClick={() => navigate('/inventory')}
            />
          )}
        </div>
      </section>

      {/* ── Inventory health + Insights ─────────────────────────────────── */}
      <div className="db-row-2col db-health-insights-row">
        <section className="db-section">
          <h2 className="db-section-title">Inventory Health</h2>
          <div className="db-inv-strip db-inv-strip-col">
            {[
              { label: 'Turnover Ratio', value: invH.turnover != null ? Number(invH.turnover).toFixed(2) : '—', color: 'brand' },
              { label: 'Low Stock',      value: formatNum(invH.lowStockCount),   color: 'orange', linkTo: '/inventory' },
              { label: 'Out of Stock',   value: formatNum(invH.outOfStockCount), color: 'red',    linkTo: '/inventory' },
              ...(isFinancial ? [
                { label: 'Stock Value',  value: formatPeso(invH.stockValue),     color: 'blue' },
                { label: 'Dead Stock',   value: formatPeso(invH.deadStockValue), color: 'orange' },
              ] : []),
              { label: '< 7-day Supply',   value: formatNum(invH.daysOfSupplyDistribution?.under7), color: 'red' },
              { label: '7–30-day Supply',  value: formatNum(invH.daysOfSupplyDistribution?.d7to30), color: 'brand' },
              { label: '30-90-day Supply', value: formatNum(invH.daysOfSupplyDistribution?.d30to90), color: 'green' },
            ].map((tile, i) => (
              <div
                key={i}
                className={`db-inv-tile ui-card ui-card-hover db-inv-${tile.color}`}
                onClick={() => tile.linkTo && navigate(tile.linkTo)}
                tabIndex={tile.linkTo ? 0 : undefined}
                role={tile.linkTo ? 'button' : undefined}
                onKeyDown={tile.linkTo ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(tile.linkTo); } } : undefined}
                style={{ cursor: tile.linkTo ? 'pointer' : undefined }}
              >
                <div className="db-inv-label">{tile.label}</div>
                <div className="db-inv-value">{loading ? <span className="skeleton-value" /> : tile.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="db-section">
          <h2 className="db-section-title">Insights</h2>
          <div className="ui-card db-insights-panel">
            {loading ? (
              <div className="db-chart-skeleton" style={{ height: 140 }} />
            ) : !Array.isArray(insights) || insights.length === 0 ? (
              <EmptyState message="No insights at this time — everything looks normal." />
            ) : (
              insights.map((ins, i) => <InsightRow key={ins.id || i} insight={ins} />)
            )}
          </div>
        </section>
      </div>

      {/* ── Activity feed + Team (lazy) ───────────────────────────────────── */}
      <section className="db-section db-row-2col">
        {/* Team activity feed */}
        <div className="ui-card db-activity-panel">
          <h3 className="db-card-title">Team Activity</h3>
          {activityLoading && !activity ? (
            <div className="db-chart-skeleton" style={{ height: 220 }} />
          ) : !activity?.items?.length ? (
            <EmptyState message="No recent activity" />
          ) : (
            <>
              {activity.items.map((item, i) => <ActivityRow key={item.entityId ? `${item.entityId}-${i}` : i} item={item} />)}
              {activityCursor && (
                <button className="db-load-more" onClick={loadMoreActivity} disabled={activityLoading}>
                  {activityLoading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Manager workload / My Activity */}
        <div className="ui-card db-activity-panel">
          {isManager ? (
            <>
              <h3 className="db-card-title">Workload Distribution (7d)</h3>
              {!teamPerformance ? (
                <div className="db-chart-skeleton" style={{ height: 160 }} />
              ) : teamMembers.length === 0 ? (
                <EmptyState message="No team activity in the last 7 days" />
              ) : (
                <BarChart
                  data={teamMembers.map(m => ({ name: m.name, value: m.actionsPerformed }))}
                  dataKey="value"
                  nameKey="name"
                  layout="horizontal"
                  showValueLabels
                  height={Math.max(160, teamMembers.length * 34)}
                  ariaLabel="Team workload distribution over the last 7 days"
                />
              )}
            </>
          ) : (
            <>
              <h3 className="db-card-title">My Activity (7d)</h3>
              {!myActivity ? (
                <div className="db-chart-skeleton" style={{ height: 160 }} />
              ) : (
                <div className="db-my-activity">
                  {[
                    { label: 'Actions performed',  value: myActivity.actionsPerformed },
                    { label: 'Orders advanced',    value: myActivity.ordersAdvanced },
                    { label: 'Deliveries handled', value: myActivity.deliveriesDispatched },
                    { label: 'Proofs verified',    value: myActivity.proofsVerified },
                    { label: 'Stock movements',    value: myActivity.stockMovementsRecorded },
                  ].map((row, i) => (
                    <div key={i} className="db-my-row">
                      <span className="db-my-label">{row.label}</span>
                      <span className="db-my-value">{formatNum(row.value || 0)}</span>
                    </div>
                  ))}
                  {myActivity.lastActive && (
                    <div className="db-my-last">Last active {relativeTime(myActivity.lastActive)}</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}

export default withEmployeeAuth(Dashboard);
