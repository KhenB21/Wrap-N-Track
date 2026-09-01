import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { getChartColors, formatPeso, formatNum } from './chartUtils';
import './Charts.css';

const CustomTooltip = ({ active, payload, isCurrency }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      background: 'var(--surface-elevated,#fff)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--text)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
      <div>{isCurrency ? formatPeso(p.value) : formatNum(p.value)}
        {p.payload.pct != null && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({p.payload.pct}%)</span>}
      </div>
    </div>
  );
};

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
  if (!pct || pct < 5) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {pct}%
    </text>
  );
};

export default function DonutChart({ data = [], isCurrency = false, colors, height = 220, innerRadius = 55, outerRadius = 85, ariaLabel, onSegmentClick }) {
  const c = useMemo(() => getChartColors(), []);
  const palette = colors || c.palette;

  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const enriched = data.map(d => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }));

  const fmt = v => isCurrency ? formatPeso(v) : formatNum(v);

  return (
    <div>
      <div role="figure" aria-label={ariaLabel} style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enriched}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
              onClick={onSegmentClick ? (entry) => onSegmentClick(entry) : undefined}
              style={onSegmentClick ? { cursor: 'pointer' } : undefined}
            >
              {enriched.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {enriched.length > 0 && (
        <details className="chart-a11y-table" open>
          <summary>Data table</summary>
          <table>
            <thead><tr><th>Name</th><th className="chart-a11y-num">Value</th><th className="chart-a11y-num">%</th></tr></thead>
            <tbody>
              {enriched.map((row, i) => (
                <tr key={i}>
                  <td>{row.name}</td>
                  <td className="chart-a11y-num">{fmt(row.value)}</td>
                  <td className="chart-a11y-num">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
