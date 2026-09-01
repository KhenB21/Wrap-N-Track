import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import AppShell from '../../Components/AppShell';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import EmptyState from '../../Components/EmptyState';
import { BarChart } from '../../Components/Charts';
import { getChartColors, formatPeso as fmtPeso, formatNum as fmtNum } from '../../Components/Charts/chartUtils';
import api from '../../api';
import './Overview.css';
import './Operations.css';

const formatPeso = v => fmtPeso(v ?? 0);
const formatNum  = v => fmtNum(v ?? 0);

const MONTH_LABEL = m => new Date(m).toLocaleDateString('en-US', { month: 'short' });

const STATUS_CLASS = {
  'Out of Stock': 'ops-status-critical',
  'Reorder Recommended': 'ops-status-critical',
  'Approaching Reorder Point': 'ops-status-warning',
  'Healthy': 'ops-status-ok',
};

function GroupedStockChart({ data, height = 180 }) {
  const c = useMemo(() => getChartColors(), []);
  if (!data.length) return <EmptyState message="No at-risk SKUs" />;
  return (
    // A percentage height here (the original code) leaves ResponsiveContainer's
    // size ambiguous inside a flex column with overflow-y:auto (the panel-body
    // wrapper that gives long data tables their own scrollbar) — Recharts then
    // gets stuck mid-mount with empty, invisible <g class="recharts-inactive-bar">
    // groups. A fixed pixel height, like the other charts on this page use, avoids it.
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: c.textMuted }} tickLine={false} axisLine={{ stroke: c.border }} interval={0} angle={-20} textAnchor="end" height={38} />
        <YAxis tick={{ fontSize: 11, fill: c.textMuted }} tickLine={false} axisLine={false} tickFormatter={formatNum} width={36} />
        <Tooltip formatter={(v) => formatNum(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="currentStock" name="Current Stock" fill={c.brand} radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false} />
        <Bar dataKey="reorderPoint" name="Reorder Point" fill={c.textMuted} radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Operations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/api/analytics/inventory-operations')
      .then(res => { if (!cancelled) setData(res.data?.data || null); })
      .catch(() => { if (!cancelled) setError('Failed to load operations data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const kpis = data?.kpis || {};

  const trend = useMemo(() => (data?.monthlyUnitsReceived || []).map(r => ({
    name: MONTH_LABEL(r.month),
    value: r.unitsReceived,
  })), [data]);

  const health = useMemo(() => {
    const h = data?.healthDistribution || {};
    return [
      { name: 'Stockout', value: h.stockout || 0 },
      { name: 'Critical Low', value: h.criticalLow || 0 },
      { name: 'Approaching', value: h.approaching || 0 },
      { name: 'Healthy', value: h.healthy || 0 },
    ];
  }, [data]);

  const replenishment = data?.replenishment || [];
  const stockVsReorder = data?.stockVsReorder || [];

  return (
    <AppShell contentClassName="ov-page-content" showSearch={false}>
      <div className="ov-page">
        <header className="ov-header">
          <h1 className="ov-title">Inventory Operations</h1>
          <span className="ov-header-note">Last 90 days</span>
        </header>

        {error && <div className="db-error-banner">{error}</div>}

        <div className="ov-kpi-row">
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Low Stock SKUs</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : formatNum(kpis.lowStockSkus)}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Stockout Count</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : formatNum(kpis.stockoutCount)}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Avg. Days of Supply</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : (kpis.avgDaysOfSupply != null ? Number(kpis.avgDaysOfSupply).toFixed(1) : '—')}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Units Received (30d)</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : formatNum(kpis.unitsReceived30d)}</div>
          </div>
          <div className="ui-card ov-kpi-tile">
            <div className="ov-kpi-label">Restock Cost</div>
            <div className="ov-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : formatPeso(kpis.restockCost)}</div>
          </div>
        </div>

        <div className="ov-mid-row">
          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Trend Analysis — Units Received by Month</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : trend.length === 0 ? (
                <EmptyState message="No stock-in history" />
              ) : (
                <BarChart data={trend} dataKey="value" nameKey="name" layout="vertical" height={180} ariaLabel="Units received by month" />
              )}
            </div>
          </div>

          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Inventory Health Distribution</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : (
                <BarChart data={health} dataKey="value" nameKey="name" layout="vertical" height={180} ariaLabel="Inventory health distribution" />
              )}
            </div>
          </div>
        </div>

        <div className="ov-bottom-row">
          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Products Requiring Replenishment</h3>
            <div className="ov-panel-body ov-table-wrap">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : replenishment.length === 0 ? (
                <EmptyState message="No SKUs need replenishment" />
              ) : (
                <table className="ov-table">
                  <thead>
                    <tr><th>SKU</th><th>Category</th><th>Product</th><th>Stock</th><th>Reorder Pt</th><th>Qty</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {replenishment.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        <td>{r.sku}</td>
                        <td>{r.category || '—'}</td>
                        <td>{r.name}</td>
                        <td>{formatNum(r.currentStock)}</td>
                        <td>{formatNum(r.reorderPoint)}</td>
                        <td>{formatNum(r.reorderQuantity)}</td>
                        <td><span className={`ops-status-pill ${STATUS_CLASS[r.status] || ''}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="ui-card ov-panel">
            <h3 className="ov-panel-title">Current Stock vs Reorder Point</h3>
            <div className="ov-panel-body">
              {loading ? (
                <div className="db-chart-skeleton" style={{ height: '100%' }} />
              ) : (
                <GroupedStockChart data={stockVsReorder} />
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default withEmployeeAuth(Operations);
