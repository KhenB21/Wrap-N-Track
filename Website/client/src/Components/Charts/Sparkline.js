import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from 'recharts';
import { getChartColors, formatPeso } from './chartUtils';

const SparkTooltip = ({ active, payload, isCurrency }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div style={{
      background: 'var(--surface-elevated, #fff)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '4px 8px',
      fontSize: 12,
      color: 'var(--text)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {isCurrency ? formatPeso(v) : v?.toLocaleString()}
    </div>
  );
};

export default function Sparkline({ data = [], dataKey = 'value', color, isCurrency = false, height = 48, ariaLabel }) {
  const c = useMemo(() => getChartColors(), []);
  const lineColor = color || c.brand;

  return (
    <div role="img" aria-label={ariaLabel || 'trend sparkline'} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: lineColor }}
          />
          <Tooltip content={<SparkTooltip isCurrency={isCurrency} />} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
