import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/AppShell';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import EmptyState from '../../Components/EmptyState';
import { DonutChart, TrendChart } from '../../Components/Charts';
import { useDashboardData } from '../../hooks/useDashboardData';
import usePermissions from '../../hooks/usePermissions';
import './Overview.css';

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const NUM  = new Intl.NumberFormat('en-PH');
const formatPeso = v => PESO.format(v ?? 0);
const formatNum  = v => NUM.format(v ?? 0);

const FINANCIAL_ROLES = new Set(['admin', 'super_admin', 'director', 'sales_manager', 'assistant_sales', 'business_developer']);

function DeltaTag({ pct, direction }) {
  if (pct == null) return null;
  const color = direction === 'up' ? 'var(--success)' : direction === 'down' ? 'var(--danger)' : 'var(--text-muted)';
  return (
    <span className="ov-kpi-delta" style={{ color }}>
      {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '→'} {Math.abs(Number(pct)).toFixed(1)}%
    </span>
  );
}

function KpiTile({ label, value, pct, direction, loading }) {
  return (
    <div className="ui-card ov-kpi-tile">
      <div className="ov-kpi-label">{label}</div>
      <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : value}</div>
      {!loading && <DeltaTag pct={pct} direction={direction} />}
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

  const revenueTrend = useMemo(() => {
    return (tsRevenue?.series || []).map(d => ({
      date: d.bucket ? new Date(d.bucket).toISOString().slice(0, 10) : '',
      revenue: Number(d.value || 0),
    }));
  }, [tsRevenue]);

  const contribution = useMemo(() => {
    return (breakdown || []).slice(0, 5).map(r => ({
      name: r.label || r.key,
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
          <KpiTile label="Revenue" value={formatPeso(kpis?.revenue?.value)} pct={kpis?.revenue?.deltaPct} direction={kpis?.revenue?.direction} loading={loading} />
          <KpiTile label="Orders" value={formatNum(kpis?.orders?.value)} pct={kpis?.orders?.deltaPct} direction={kpis?.orders?.direction} loading={loading} />
          {isFinancial && (
            <KpiTile label="Avg Order Value" value={formatPeso(kpis?.aov?.value)} pct={kpis?.aov?.deltaPct} direction={kpis?.aov?.direction} loading={loading} />
          )}
          <KpiTile label="Stock Value" value={formatPeso(invH.stockValue)} loading={loading} />
          <KpiTile label="Inventory Turnover" value={invH.turnover != null ? Number(invH.turnover).toFixed(2) : '—'} loading={loading} />
        </div>

        <div className="ov-mid-row">
          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Revenue Trend</h3>
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

          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Revenue Contribution</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : contribution.length === 0 ? (
                <EmptyState message="No breakdown data" />
              ) : (
                <DonutChart data={contribution} isCurrency height={180} innerRadius={42} outerRadius={68} ariaLabel="Revenue contribution" />
              )}
            </div>
          </div>
        </div>

        <div className="ov-bottom-row">
          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Top Products</h3>
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
                      <tr key={i} onClick={() => navigate('/inventory')}>
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

          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Order Pipeline</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : stages.length === 0 ? (
                <EmptyState message="No active orders" />
              ) : (
                <div className="ov-funnel">
                  {stages.map((s, i) => (
                    <div key={i} className="ov-funnel-row">
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
