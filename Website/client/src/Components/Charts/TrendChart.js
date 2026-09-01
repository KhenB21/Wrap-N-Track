import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { getChartColors, formatPeso, formatNum } from './chartUtils';
import './Charts.css';

const GRANULARITIES = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

// `date` is expected to be anything `new Date()` can parse (an ISO 'YYYY-MM-DD'
// string works). Callers that pass a pre-formatted display string (no year, e.g.
// "Aug 1") only support the 'day' view correctly — weekly/monthly bucketing needs
// a real calendar date to group by.
function mondayOf(d) {
  const day = d.getUTCDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  return monday;
}

function bucketKey(dateStr, granularity) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr; // not parseable — leave ungrouped
  if (granularity === 'month') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }
  if (granularity === 'week') {
    return mondayOf(d).toISOString().slice(0, 10);
  }
  return dateStr;
}

function formatLabel(dateStr, granularity) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (granularity === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (granularity === 'week') {
    const end = new Date(d);
    end.setUTCDate(d.getUTCDate() + 6);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Sums leftKey/rightKey into weekly/monthly buckets. Forecast fields aren't
// meaningful once aggregated (a forecast band spanning a bucket isn't a sum),
// so they're dropped outside the 'day' view — the toggle only affects actuals.
function aggregate(data, granularity, leftKey, rightKey) {
  if (granularity === 'day') return data;
  const buckets = new Map();
  for (const row of data) {
    const key = bucketKey(row.date, granularity);
    const existing = buckets.get(key) || { date: key, [leftKey]: 0, ...(rightKey ? { [rightKey]: 0 } : {}) };
    existing[leftKey] = (existing[leftKey] || 0) + (Number(row[leftKey]) || 0);
    if (rightKey) existing[rightKey] = (existing[rightKey] || 0) + (Number(row[rightKey]) || 0);
    buckets.set(key, existing);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date < b.date ? -1 : 1);
}

const CustomTooltip = ({ active, payload, label, leftKey, rightKey, leftLabel, rightLabel, leftCurrency, rightCurrency, granularity }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-elevated,#fff)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text)',
      boxShadow: 'var(--shadow-md)',
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-soft)' }}>{formatLabel(label, granularity)}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-muted)', flex: 1 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>
            {p.dataKey === leftKey && leftCurrency ? formatPeso(p.value) :
             p.dataKey === rightKey && rightCurrency ? formatPeso(p.value) :
             formatNum(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function TrendChart({
  data = [],
  leftKey = 'value',
  rightKey,
  forecastKey,
  forecastLower,
  forecastUpper,
  leftLabel = '',
  rightLabel = '',
  leftCurrency = false,
  rightCurrency = false,
  splitAt,
  height = 280,
  ariaLabel,
  // When the right series is the same unit/scale as the left (e.g. a
  // year-over-year comparison of the same metric), plot it on the left axis
  // instead of a second independently-scaled axis — a dual-axis chart would
  // let the two lines cross at points that don't reflect the real values.
  sameAxis = false,
  // Show the Daily/Weekly/Monthly toggle. Off by default for charts that plot
  // a forecast band or splitAt marker, since those only make sense per-day.
  allowGranularity = !forecastKey && !splitAt,
}) {
  const c = useMemo(() => getChartColors(), []);
  const [granularity, setGranularity] = useState('day');

  const displayData = useMemo(
    () => allowGranularity ? aggregate(data, granularity, leftKey, rightKey) : data,
    [data, granularity, leftKey, rightKey, allowGranularity]
  );
  const activeGranularity = allowGranularity ? granularity : 'day';

  const leftFmt = v => leftCurrency ? formatPeso(v) : formatNum(v);
  const rightFmt = v => rightCurrency ? formatPeso(v) : formatNum(v);
  const rightAxisId = sameAxis ? 'left' : 'right';

  return (
    <div>
      {allowGranularity && (
        <div className="chart-granularity-toggle" role="group" aria-label="Chart time grouping">
          {GRANULARITIES.map(g => (
            <button
              key={g.value}
              type="button"
              className={`chart-granularity-btn${granularity === g.value ? ' active' : ''}`}
              onClick={() => setGranularity(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}
      <div role="figure" aria-label={ariaLabel} style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ minWidth: 320 }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={displayData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: c.textMuted }}
              tickLine={false}
              axisLine={{ stroke: c.border }}
              interval="preserveStartEnd"
              tickFormatter={label => formatLabel(label, activeGranularity)}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={leftFmt}
              tick={{ fontSize: 11, fill: c.textMuted }}
              tickLine={false}
              axisLine={false}
              width={leftCurrency ? 78 : 48}
            />
            {rightKey && !sameAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={rightFmt}
                tick={{ fontSize: 11, fill: c.textMuted }}
                tickLine={false}
                axisLine={false}
                width={rightCurrency ? 78 : 48}
              />
            )}
            <Tooltip
              content={
                <CustomTooltip
                  leftKey={leftKey}
                  rightKey={rightKey}
                  leftLabel={leftLabel}
                  rightLabel={rightLabel}
                  leftCurrency={leftCurrency}
                  rightCurrency={rightCurrency}
                  granularity={activeGranularity}
                />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8, color: 'var(--text-muted)' }}
            />

            {/* Forecast confidence band (shaded area, behind lines) */}
            {activeGranularity === 'day' && forecastLower && forecastUpper && (
              <Area
                yAxisId="left"
                dataKey={forecastUpper}
                stroke="none"
                fill={c.brand}
                fillOpacity={0.12}
                legendType="none"
                name=""
                dot={false}
                activeDot={false}
                tooltipType="none"
              />
            )}
            {activeGranularity === 'day' && forecastLower && forecastUpper && (
              <Area
                yAxisId="left"
                dataKey={forecastLower}
                stroke="none"
                fill={c.surface}
                fillOpacity={1}
                legendType="none"
                name=""
                dot={false}
                activeDot={false}
                tooltipType="none"
              />
            )}

            {/* Actuals */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={leftKey}
              stroke={c.brand}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: c.brand }}
              name={leftLabel || leftKey}
            />

            {/* Forecast line — dashed */}
            {activeGranularity === 'day' && forecastKey && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={forecastKey}
                stroke={c.brand}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, fill: c.brand }}
                name={`${leftLabel || leftKey} (forecast)`}
              />
            )}

            {/* Secondary series — own axis unless sameAxis */}
            {rightKey && (
              <Line
                yAxisId={rightAxisId}
                type="monotone"
                dataKey={rightKey}
                stroke={c.success}
                strokeWidth={2}
                strokeDasharray={sameAxis ? '5 3' : undefined}
                dot={false}
                activeDot={{ r: 4, fill: c.success }}
                name={rightLabel || rightKey}
              />
            )}

            {activeGranularity === 'day' && splitAt && (
              <ReferenceLine
                yAxisId="left"
                x={splitAt}
                stroke={c.textMuted}
                strokeDasharray="4 4"
                label={{ value: 'Today', position: 'insideTopRight', fontSize: 10, fill: c.textMuted }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      </div>
      {displayData.length > 0 && (
        <details className="chart-a11y-table" open>
          <summary>Data table</summary>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {leftKey && <th className="chart-a11y-num">{leftLabel || leftKey}</th>}
                {rightKey && <th className="chart-a11y-num">{rightLabel || rightKey}</th>}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr key={i}>
                  <td>{formatLabel(row.date, activeGranularity)}</td>
                  {leftKey && <td className="chart-a11y-num">{leftCurrency ? formatPeso(row[leftKey]) : formatNum(row[leftKey])}</td>}
                  {rightKey && <td className="chart-a11y-num">{rightCurrency ? formatPeso(row[rightKey]) : formatNum(row[rightKey])}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
