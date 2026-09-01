import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import AppShell from '../../Components/AppShell';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import EmptyState from '../../Components/EmptyState';
import { BarChart } from '../../Components/Charts';
import { getChartColors, formatPeso as fmtPeso, formatNum as fmtNum } from '../../Components/Charts/chartUtils';
import api from '../../api';
import './Overview.css';
import './Supplier.css';

const formatPeso = v => fmtPeso(v ?? 0);
const formatNum  = v => fmtNum(v ?? 0);
const MONTH_LABEL = m => new Date(m).toLocaleDateString('en-US', { month: 'short' });

function rateClass(pct) {
  if (pct >= 40) return 'sup-status-critical';
  if (pct >= 15) return 'sup-status-warning';
  return 'sup-status-ok';
}

function RiskMatrix({ data, height = 180 }) {
  const c = useMemo(() => getChartColors(), []);
  if (!data.length) return <EmptyState message="No supplier data" />;
  return (
    // Fixed pixel height, not "100%" — see the identical fix + explanation on
    // Operations.js's GroupedStockChart (a percentage height here left Recharts
    // stuck mid-mount inside the panel's scrollable flex column, rendering nothing).
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
        <XAxis type="number" dataKey="avgLeadTime" name="Avg Lead Time" unit="d" tick={{ fontSize: 10, fill: c.textMuted }} tickLine={false} axisLine={{ stroke: c.border }} />
        <YAxis type="number" dataKey="stockoutRate" name="Stockout Rate" unit="%" tick={{ fontSize: 10, fill: c.textMuted }} tickLine={false} axisLine={false} width={34} />
        <ZAxis type="number" dataKey="inventoryValue" range={[60, 260]} name="Inventory Value" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, name) => name === 'Inventory Value' ? formatPeso(value) : name === 'Avg Lead Time' ? `${value}d` : `${Number(value).toFixed(1)}%`}
          labelFormatter={() => ''}
        />
        <Scatter data={data} fill={c.brand} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={c.palette[i % c.palette.length]} fillOpacity={0.75} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function Supplier() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/api/analytics/supplier-operations')
      .then(res => { if (!cancelled) setData(res.data?.data || null); })
      .catch(() => { if (!cancelled) setError('Failed to load supplier data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const kpis = data?.kpis || {};

  const trend = useMemo(() => (data?.monthlyStockoutEvents || []).map(r => ({
    name: MONTH_LABEL(r.month),
    value: r.count,
  })), [data]);

  const categoryValue = useMemo(() => (data?.categoryValue || []).map(r => ({
    name: r.category,
    value: r.value,
  })), [data]);

  const scorecard = data?.scorecard || [];

  return (
    <AppShell contentClassName="ov-page-content" showSearch={false}>
      <div className="ov-page">
        <header className="ov-header">
          <h1 className="ov-title">Supplier &amp; Warehouse Performance</h1>
          <span className="ov-header-note">Last 90 days</span>
        </header>

        {error && <div className="db-error-banner">{error}</div>}

        <div className="ov-kpi-row">
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Avg Lead Time (Days)</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : (kpis.avgLeadTimeDays != null ? Number(kpis.avgLeadTimeDays).toFixed(1) : '—')}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">DIO</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : (kpis.dio != null ? Number(kpis.dio).toFixed(1) : '—')}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Active Suppliers</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : formatNum(kpis.activeSuppliers)}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Stockout Risk %</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : `${Number(kpis.stockoutRiskPct || 0).toFixed(1)}%`}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Stock Value Spread</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : formatPeso(kpis.stockValueSpread)}</div>
          </div>
        </div>

        <div className="ov-mid-row">
          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Trend Analysis — Stockout Events by Month</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : trend.length === 0 ? (
                <EmptyState message="No stockout history" />
              ) : (
                <BarChart data={trend} dataKey="value" nameKey="name" layout="vertical" height={180} ariaLabel="Stockout events by month" />
              )}
            </div>
          </div>

          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Inventory Value by Category</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : categoryValue.length === 0 ? (
                <EmptyState message="No category data" />
              ) : (
                <BarChart data={categoryValue} dataKey="value" nameKey="name" layout="horizontal" isCurrency height={180} ariaLabel="Inventory value by category" />
              )}
            </div>
          </div>
        </div>

        <div className="ov-bottom-row">
          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Supplier Scorecard</h3>
            <div className="ov-panel-body ov-table-wrap">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : scorecard.length === 0 ? (
                <EmptyState message="No supplier data" />
              ) : (
                <table className="ov-table">
                  <thead>
                    <tr><th>ID</th><th>Supplier</th><th>Avg Lead Time</th><th>SKUs</th><th>Stockout Rate</th><th>Inventory Value</th></tr>
                  </thead>
                  <tbody>
                    {scorecard.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        <td>{r.supplierId}</td>
                        <td>{r.supplierName}</td>
                        <td>{r.avgLeadTime}d</td>
                        <td>{formatNum(r.skusSupplied)}</td>
                        <td><span className={`sup-status-pill ${rateClass(r.stockoutRate)}`}>{r.stockoutRate.toFixed(1)}%</span></td>
                        <td>{formatPeso(r.inventoryValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Supplier Risk Matrix</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : (
                <RiskMatrix data={scorecard} />
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default withEmployeeAuth(Supplier);
