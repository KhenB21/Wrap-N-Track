import React, { useMemo } from 'react';
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

const CustomTooltip = ({ active, payload, label, leftKey, rightKey, leftLabel, rightLabel, leftCurrency, rightCurrency }) => {
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
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-soft)' }}>{label}</div>
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

// TrendChart — dual-axis line/area chart. Actuals solid, forecast dashed with shaded band.
// Props:
//   data            — array of objects with date, [leftKey], [rightKey], [forecastKey], [forecastLower], [forecastUpper]
//   leftKey         — primary Y axis field (e.g. 'revenue')
//   rightKey        — secondary Y axis field (e.g. 'orders') — optional
//   forecastKey     — forecast field name — optional
//   forecastLower/Upper — confidence band fields — optional
//   leftLabel / rightLabel — axis labels
//   leftCurrency / rightCurrency — format as peso?
//   splitAt         — date string where actuals end and forecast begins (renders reference line)
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
}) {
  const c = useMemo(() => getChartColors(), []);

  const leftFmt = v => leftCurrency ? formatPeso(v) : formatNum(v);
  const rightFmt = v => rightCurrency ? formatPeso(v) : formatNum(v);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ minWidth: 320 }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: c.textMuted }}
              tickLine={false}
              axisLine={{ stroke: c.border }}
              interval="preserveStartEnd"
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
            {rightKey && (
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
                />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8, color: 'var(--text-muted)' }}
            />

            {/* Forecast confidence band (shaded area, behind lines) */}
            {forecastLower && forecastUpper && (
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
            {forecastLower && forecastUpper && (
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
            {forecastKey && (
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

            {/* Secondary axis line */}
            {rightKey && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={rightKey}
                stroke={c.success}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: c.success }}
                name={rightLabel || rightKey}
              />
            )}

            {splitAt && (
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
  );
}
