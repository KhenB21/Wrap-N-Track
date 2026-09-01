import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../../Components/AppShell';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import EmptyState from '../../Components/EmptyState';
import { formatPeso as fmtPeso, formatNum as fmtNum } from '../../Components/Charts/chartUtils';
import api from '../../api';
import './Details.css';

const formatPeso = v => fmtPeso(v ?? 0);
const formatNum  = v => fmtNum(v ?? 0);

// The replenishment-suggestions formula (services/replenishment.js) already
// scores every active SKU, not just the ones needing reorder — reused here
// as the single source of truth for stock health/status so the numbers match
// what Operations and Supplier show for the same SKUs.
const HEALTH_LABEL = {
  'Healthy': 'Healthy',
  'Approaching Reorder Point': 'Low',
  'Reorder Recommended': 'Critical Low',
  'Out of Stock': 'Critical Low',
};
const HEALTH_CLASS = {
  'Healthy': 'det-pill-ok',
  'Low': 'det-pill-warning',
  'Critical Low': 'det-pill-critical',
};

function KpiTile({ label, value, note, loading }) {
  return (
    <div className="ui-card det-kpi-tile">
      <div className="det-kpi-label">{label}</div>
      <div className="det-kpi-value">{loading ? <span className="skeleton-value skeleton-wide" /> : value}</div>
      {note && !loading && <div className="det-kpi-note">{note}</div>}
    </div>
  );
}

function Details() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/api/inventory-reports/replenishment-suggestions')
      .then(res => { if (!cancelled) setRows(res.data?.data || []); })
      .catch(() => { if (!cancelled) setError('Failed to load inventory detail.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter(r => r.sku.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q))
      : rows;
    return [...list].sort((a, b) => sortAsc ? a.sku.localeCompare(b.sku) : b.sku.localeCompare(a.sku));
  }, [rows, search, sortAsc]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const stockValue = rows.reduce((s, r) => s + Number(r.current_inventory_value || 0), 0);
    const restockCost = rows.filter(r => r.needs_reorder)
      .reduce((s, r) => s + Number(r.suggested_reorder_quantity || 0) * Number(r.unit_price || 0), 0);
    const avgUnitCost = total ? rows.reduce((s, r) => s + Number(r.unit_price || 0), 0) / total : 0;
    const avgLeadTime = total ? rows.reduce((s, r) => s + Number(r.lead_time_days || 0), 0) / total : 0;
    const lowStockCount = rows.filter(r => r.needs_reorder).length;
    return { total, stockValue, restockCost, avgUnitCost, avgLeadTime, lowStockCount };
  }, [rows]);

  return (
    <AppShell showSearch={false}>
      <header className="ui-page-header">
        <div className="ui-page-header-text">
          <h1 className="ui-page-title">Inventory Detail Report</h1>
        </div>
      </header>

      {error && <div className="db-error-banner">{error}</div>}

      <div className="det-kpi-row">
        <KpiTile label="Total SKUs" value={formatNum(kpis.total)} note={`${filtered.length} of ${kpis.total} SKUs shown`} loading={loading} />
        <KpiTile label="Stock Value" value={formatPeso(kpis.stockValue)} note="Current inventory on-hand value" loading={loading} />
        <KpiTile label="Restock Cost" value={formatPeso(kpis.restockCost)} note={`To restock ${kpis.lowStockCount} low-stock SKUs`} loading={loading} />
        <KpiTile label="Avg Unit Cost" value={formatPeso(kpis.avgUnitCost)} note="Blended cost across all SKUs" loading={loading} />
        <KpiTile label="SKU Lead Time" value={kpis.avgLeadTime.toFixed(1)} note="Avg days to replenish" loading={loading} />
      </div>

      <div className="ui-card det-table-card">
        <div className="det-table-header">
          <div>
            <h2 className="det-table-title">Inventory Detail</h2>
            <div className="det-table-sub">Detailed stock status and replenishment information</div>
          </div>
          <input
            className="det-search"
            type="text"
            placeholder="Search Product or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="db-chart-skeleton" style={{ height: 300 }} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No matching SKUs" />
        ) : (
          <div className="det-table-scroll">
            <table className="det-table">
              <thead>
                <tr>
                  <th className="det-sortable" onClick={() => setSortAsc(s => !s)}>SKU {sortAsc ? '▲' : '▼'}</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Stock Value</th>
                  <th>Restock Cost</th>
                  <th>Unit Cost</th>
                  <th>Stock Health</th>
                  <th>DOS</th>
                  <th>Lead Time</th>
                  <th>Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const health = HEALTH_LABEL[r.reorder_status] || 'Healthy';
                  const restockCost = r.needs_reorder ? Number(r.suggested_reorder_quantity || 0) * Number(r.unit_price || 0) : 0;
                  return (
                    <tr key={i}>
                      <td>{r.sku}</td>
                      <td>{r.name}</td>
                      <td>{r.category || '—'}</td>
                      <td>{r.supplier_name || '—'}</td>
                      <td>{formatPeso(r.current_inventory_value)}</td>
                      <td>{restockCost > 0 ? formatPeso(restockCost) : '—'}</td>
                      <td>{formatPeso(r.unit_price)}</td>
                      <td><span className={`det-pill ${HEALTH_CLASS[health]}`}>{health}</span></td>
                      <td>{r.days_of_supply != null ? Number(r.days_of_supply).toFixed(0) : '—'}</td>
                      <td>{r.lead_time_days}d</td>
                      <td><span className={`det-pill ${r.needs_reorder ? 'det-pill-critical' : 'det-pill-ok'}`}>{r.needs_reorder ? 'Reorder Now' : 'Healthy'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default withEmployeeAuth(Details);
