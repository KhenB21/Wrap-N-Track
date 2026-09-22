import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/AppShell';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import EmptyState from '../../Components/EmptyState';
import { DonutChart, TrendChart } from '../../Components/Charts';
import { useDashboardData } from '../../hooks/useDashboardData';
import usePermissions from '../../hooks/usePermissions';
import { linkProps } from './clickable';
import './Overview.css';

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const NUM  = new Intl.NumberFormat('en-PH');
const formatPeso = v => PESO.format(v ?? 0);
const formatNum  = v => NUM.format(v ?? 0);

const FINANCIAL_ROLES = new Set(['admin', 'super_admin', 'sales_manager', 'assistant_sales', 'business_developer']);

function DeltaTag({ pct, direction }) {
  if (pct == null) return null;
  const color = direction === 'up' ? 'var(--success)' : direction === 'down' ? 'var(--danger)' : 'var(--text-muted)';
  return (
    <span className="ov-kpi-delta" style={{ color }}>
      {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '→'} {Math.abs(Number(pct)).toFixed(1)}%
    </span>
  );
}

// Every tile opens the page behind its number (`to` + optional router state).
function KpiTile({ label, value, pct, direction, loading, note, to, state }) {
  const navigate = useNavigate();
  return (
    <div className="ui-card ov-kpi-tile" {...linkProps(navigate, to, state, label)}>
      <div className="ov-kpi-label">{label}</div>
      <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : value}</div>
      {!loading && <DeltaTag pct={pct} direction={direction} />}
      {!loading && note && <div className="ov-kpi-note" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function Overview() {
  const navigate = useNavigate();
  const { role } = usePermissions();
  const isFinancial = FINANCIAL_ROLES.has(role);

  const {
    kpis, tsRevenue, operations, inventoryHealth, breakdown, loading, error,
  } = useDashboardData('30d');

  const lineCount = Number(kpis?.marginCoverage?.lineCount || 0);
  const missingCost = Number(kpis?.marginCoverage?.linesMissingCost || 0);

  const revenueTrend = useMemo(() => {
    return (tsRevenue?.series || []).map(d => ({
      date: d.bucket ? new Date(d.bucket).toISOString().slice(0, 10) : '',
      revenue: Number(d.value || 0),
    }));
  }, [tsRevenue]);

  const contribution = useMemo(() => {
    return (breakdown || []).slice(0, 5).map(r => ({
      name: r.label || r.key,
      sku: r.key,
      value: Number(r.value || 0),
    }));
  }, [breakdown]);

  const topProducts = useMemo(() => (breakdown || []).slice(0, 5), [breakdown]);

  const invH = inventoryHealth || {};
  const stages = (operations?.stageAges || []).slice(0, 5);
  const stageMax = Math.max(...stages.map(s => s.orderCount || 0), 1);

  return (
    <AppShell contentClassName="ov-page-content" showSearch={false}>
      <div className="ov-page">
        <header className="ov-header">
          <h1 className="ov-title">Executive Overview</h1>
          <span className="ov-header-note">Last 30 days</span>
        </header>

        {error && <div className="db-error-banner">{error}</div>}

        <div className="ov-kpi-row">
          <KpiTile label="Revenue" value={formatPeso(kpis?.revenue?.value)} pct={kpis?.revenue?.deltaPct} direction={kpis?.revenue?.direction} loading={loading}
            to={isFinancial ? '/reports/sales' : '/orders'}
            note={Number(kpis?.cancelledOrderRevenue?.value) > 0 ? `incl. ${formatPeso(kpis.cancelledOrderRevenue.value)} from cancelled orders` : null} />
          {isFinancial && (
            <KpiTile label="Gross Profit" value={formatPeso(kpis?.grossProfit?.value)} pct={kpis?.grossProfit?.deltaPct} direction={kpis?.grossProfit?.direction} loading={loading} to="/reports/sales" />
          )}
          {isFinancial && (
            <KpiTile label="Profit" value={formatPeso(kpis?.netProfit?.value)} pct={kpis?.netProfit?.deltaPct} direction={kpis?.netProfit?.direction} loading={loading} to="/reports/business" />
          )}
          <KpiTile label="Orders" value={formatNum(kpis?.orders?.value)} pct={kpis?.orders?.deltaPct} direction={kpis?.orders?.direction} loading={loading} to="/orders" />
          {isFinancial && (
            <KpiTile label="Avg Order Value" value={formatPeso(kpis?.aov?.value)} pct={kpis?.aov?.deltaPct} direction={kpis?.aov?.direction} loading={loading} to="/reports/sales" />
          )}
          {isFinancial && (
            <KpiTile label="Outstanding AR" value={formatPeso(kpis?.outstandingAr?.value)} loading={loading}
              to="/invoices" state={{ filters: { status: 'UNPAID' } }} note="Unpaid invoices on open orders" />
          )}
          {isFinancial && (
            // Non-refundable down payments kept from cancelled orders — already
            // inside Revenue and Profit; shown on its own so the source is clear.
            <KpiTile label="From Cancelled Orders" value={formatPeso(kpis?.cancelledOrderRevenue?.value)} pct={kpis?.cancelledOrderRevenue?.deltaPct} direction={kpis?.cancelledOrderRevenue?.direction} loading={loading}
              to="/reports/sales" note="Kept down payments · counted as revenue & profit" />
          )}
          <KpiTile label="Stock Value" value={formatPeso(invH.stockValue)} loading={loading} to="/employee-dashboard/details" />
          <KpiTile label="Inventory Turnover" value={invH.turnover != null ? Number(invH.turnover).toFixed(2) : '—'} loading={loading} to="/reports/inventory" />
        </div>

        {isFinancial && missingCost > 0 && (
          <p className="ov-header-note">
            {missingCost} of {lineCount} order {lineCount === 1 ? 'line' : 'lines'} in this period have no original price recorded,
            {' '}so Gross Profit and Profit are understated. Set the original price on those products in Inventory.
          </p>
        )}

        <div className="ov-mid-row">
          <div className="ui-card ov-panel" {...linkProps(navigate, isFinancial ? '/reports/sales' : '/orders', null, 'Revenue Trend')}>
            <h3 className="ov-panel-title">Revenue Trend <span className="dash-view-link">View report →</span></h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : revenueTrend.length === 0 ? (
                <EmptyState message="No trend data" />
              ) : (
                <TrendChart data={revenueTrend} leftKey="revenue" leftLabel="Revenue" leftCurrency height={180} ariaLabel="Revenue trend" />
              )}
            </div>
          </div>

          <div className="ui-card ov-panel" {...linkProps(navigate, isFinancial ? '/reports/sales' : '/inventory', null, 'Revenue Contribution')}>
            <h3 className="ov-panel-title">Revenue Contribution <span className="dash-view-link">View report →</span></h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : contribution.length === 0 ? (
                <EmptyState message="No breakdown data" />
              ) : (
                <DonutChart data={contribution} isCurrency height={180} innerRadius={42} outerRadius={68} ariaLabel="Revenue contribution"
                  onSegmentClick={(seg) => seg?.sku && navigate(`/product-details/${encodeURIComponent(seg.sku)}`)} />
              )}
            </div>
          </div>
        </div>

        <div className="ov-bottom-row">
          <div className="ui-card ov-panel" {...linkProps(navigate, '/inventory', null, 'Top Products')}>
            <h3 className="ov-panel-title">Top Products <span className="dash-view-link">View inventory →</span></h3>
            <div className="ov-panel-body ov-table-wrap">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : topProducts.length === 0 ? (
                <EmptyState message="No product data" />
              ) : (
                <table className="ov-table">
                  <thead>
                    <tr><th>Product</th><th>Revenue</th><th>Share</th></tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} {...linkProps(navigate, `/product-details/${encodeURIComponent(p.key)}`, null, p.label || p.key)}>
                        <td>{p.label || p.key}</td>
                        <td>{formatPeso(p.value)}</td>
                        <td>{p.sharePct != null ? `${p.sharePct}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="ui-card ov-panel" {...linkProps(navigate, '/orders', null, 'Order Pipeline')}>
            <h3 className="ov-panel-title">Order Pipeline <span className="dash-view-link">View orders →</span></h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : stages.length === 0 ? (
                <EmptyState message="No active orders" />
              ) : (
                <div className="ov-funnel">
                  {stages.map((s, i) => (
                    <div key={i} className="ov-funnel-row" {...linkProps(navigate, '/orders', { status: s.status }, `${s.status} orders`)}>
                      <span className="ov-funnel-label">{s.status}</span>
                      <div className="ov-funnel-bar-wrap">
                        <div className="ov-funnel-bar" style={{ width: `${Math.max(6, (s.orderCount / stageMax) * 100)}%` }} />
                      </div>
                      <span className="ov-funnel-count">{formatNum(s.orderCount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default withEmployeeAuth(Overview);
