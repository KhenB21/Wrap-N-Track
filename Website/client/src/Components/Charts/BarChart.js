import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { getChartColors, formatPeso, formatNum } from './chartUtils';
import './Charts.css';

const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (!active || !payload?.length) return null;
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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i}>{p.name}: <b>{isCurrency ? formatPeso(p.value) : formatNum(p.value)}</b></div>
      ))}
    </div>
  );
};

export default function BarChart({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  layout = 'vertical',
  isCurrency = false,
  colorByIndex = true,
  colors,
  showValueLabels = false,
  height = 240,
  ariaLabel,
  onBarClick,
}) {
  const c = useMemo(() => getChartColors(), []);
  const palette = colors || c.palette;

  const isHorizontal = layout === 'horizontal';
  const fmt = v => isCurrency ? formatPeso(v) : formatNum(v);

  return (
    <div>
      <div role="figure" aria-label={ariaLabel} style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ minWidth: 280 }}>
          <ResponsiveContainer width="100%" height={height}>
            <ReBarChart
              data={data}
              layout={layout}
              margin={{ top: 8, right: 16, bottom: 0, left: isHorizontal ? 80 : 8 }}
              onClick={onBarClick ? (e) => { if (e?.activePayload?.[0]) onBarClick(e.activePayload[0].payload); } : undefined}
              style={onBarClick ? { cursor: 'pointer' } : undefined}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={!isHorizontal} vertical={isHorizontal} />
              {isHorizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11, fill: c.textMuted }} tickLine={false} axisLine={false}
                    tickFormatter={fmt} />
                  <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 11, fill: c.textMuted }} tickLine={false} axisLine={false} width={80} />
                </>
              ) : (
                <>
                  <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: c.textMuted }} tickLine={false} axisLine={{ stroke: c.border }} />
                  <YAxis tick={{ fontSize: 11, fill: c.textMuted }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                </>
              )}
              <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={48}>
                {colorByIndex && data.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
                {showValueLabels && (
                  <LabelList
                    dataKey={dataKey}
                    position={isHorizontal ? 'right' : 'top'}
                    style={{ fontSize: 10, fill: c.textMuted }}
                    formatter={fmt}
                  />
                )}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {data.length > 0 && (
        <details className="chart-a11y-table">
          <summary>View as table</summary>
          <table>
            <thead><tr><th>{nameKey}</th><th className="chart-a11y-num">{dataKey}</th></tr></thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td>{row[nameKey]}</td>
                  <td className="chart-a11y-num">{fmt(row[dataKey])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
