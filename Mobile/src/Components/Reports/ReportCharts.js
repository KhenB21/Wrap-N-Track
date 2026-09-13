import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { CHART_PALETTE, formatCompact, shortDate } from './ReportUI';

/* SVG charts for the employee report screens, modelled on the Website's
   Recharts wrappers (Website/client/src/Components/Charts). */

// Round an axis maximum up to 1/2/5 × 10^n so gridline labels read cleanly.
const niceMax = (value) => {
  if (!(value > 0)) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const scaled = value / power;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * power;
};

function Legend({ items, colors }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: item.color }, item.dashed && styles.legendDashed]} />
          <Text style={[styles.legendText, { color: colors.subText }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* Revenue area on the left axis, orders line on the right axis — the same pairing
   as the Website's Revenue & Orders Trend chart. data: [{ date, [leftKey], [rightKey] }] */
export function TrendChart({
  data,
  width,
  height = 210,
  leftKey,
  rightKey,
  leftLabel,
  rightLabel,
  leftPrefix = '',
  colors,
  leftColor = '#696a8f',
  rightColor = '#059669',
  gradientId = 'trendFill',
}) {
  if (!width || !data.length) return null;

  const PAD = { top: 14, right: 34, bottom: 26, left: 46 };
  const plotW = Math.max(10, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const n = data.length;
  const leftVals = data.map((d) => Number(d[leftKey]) || 0);
  const rightVals = data.map((d) => Number(d[rightKey]) || 0);
  const maxL = niceMax(Math.max(...leftVals));
  const maxR = niceMax(Math.max(...rightVals));

  const x = (i) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yL = (v) => PAD.top + plotH - (v / maxL) * plotH;
  const yR = (v) => PAD.top + plotH - (v / maxR) * plotH;
  const linePath = (vals, y) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  const leftLine = linePath(leftVals, yL);
  const baseY = PAD.top + plotH;
  const area = `${leftLine} L${x(n - 1).toFixed(1)} ${baseY} L${x(0).toFixed(1)} ${baseY} Z`;
  const labelIndexes = n === 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={leftColor} stopOpacity="0.35" />
            <Stop offset="1" stopColor={leftColor} stopOpacity="0.03" />
          </LinearGradient>
        </Defs>

        {[0, 0.5, 1].map((t) => {
          const y = PAD.top + plotH - t * plotH;
          return (
            <React.Fragment key={t}>
              <Line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} stroke={colors.border} strokeDasharray="3 3" strokeWidth={1} />
              <SvgText x={PAD.left - 6} y={y + 4} fontSize="10" fill={colors.subText} textAnchor="end">
                {formatCompact(maxL * t, leftPrefix)}
              </SvgText>
              <SvgText x={PAD.left + plotW + 6} y={y + 4} fontSize="10" fill={colors.subText} textAnchor="start">
                {formatCompact(maxR * t)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {n > 1 && <Path d={area} fill={`url(#${gradientId})`} />}
        <Path d={leftLine} stroke={leftColor} strokeWidth={2.25} fill="none" />
        <Path d={linePath(rightVals, yR)} stroke={rightColor} strokeWidth={2} fill="none" strokeDasharray="5 3" />
        {n <= 31 &&
          leftVals.map((v, i) => <Circle key={`l${i}`} cx={x(i)} cy={yL(v)} r={2.5} fill={leftColor} />)}
        {n <= 31 &&
          rightVals.map((v, i) => <Circle key={`r${i}`} cx={x(i)} cy={yR(v)} r={2} fill={rightColor} />)}

        {labelIndexes.map((i) => (
          <SvgText
            key={`x${i}`}
            x={x(i)}
            y={height - 8}
            fontSize="10"
            fill={colors.subText}
            textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          >
            {shortDate(data[i].date)}
          </SvgText>
        ))}
      </Svg>
      <Legend
        colors={colors}
        items={[
          { label: leftLabel, color: leftColor },
          { label: rightLabel, color: rightColor, dashed: true },
        ]}
      />
    </View>
  );
}

const polar = (cx, cy, r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

const arcPath = (cx, cy, outer, inner, a0, a1) => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, outer, a0);
  const [x1, y1] = polar(cx, cy, outer, a1);
  const [x2, y2] = polar(cx, cy, inner, a1);
  const [x3, y3] = polar(cx, cy, inner, a0);
  return `M${x0} ${y0} A${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`;
};

/* data: [{ name, value, color? }]. Tapping a slice or legend row calls onSelect(name). */
export function DonutChart({ data, colors, size = 170, thickness = 28, palette = CHART_PALETTE, selected, onSelect, centerLabel = 'Total' }) {
  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  if (!total) return null;

  const outer = size / 2;
  const inner = outer - thickness;
  let angle = -Math.PI / 2;
  const segments = data.map((d, i) => {
    const fraction = (Number(d.value) || 0) / total;
    const a0 = angle;
    const a1 = angle + fraction * 2 * Math.PI;
    angle = a1;
    return {
      ...d,
      color: d.color || palette[i % palette.length],
      pct: Math.round(fraction * 100),
      path: arcPath(outer, outer, outer, inner, a0, Math.min(a1, a0 + 2 * Math.PI - 0.0001)),
    };
  });

  return (
    <View style={styles.donutWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {segments.map((s) => (
            <Path
              key={s.name}
              d={s.path}
              fill={s.color}
              opacity={selected && selected !== s.name ? 0.3 : 1}
              onPress={onSelect ? () => onSelect(s.name) : undefined}
            />
          ))}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.donutCenter]} pointerEvents="none">
          <Text style={[styles.donutTotal, { color: colors.text }]}>{total}</Text>
          <Text style={[styles.donutLabel, { color: colors.subText }]}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {segments.map((s) => (
          <TouchableOpacity
            key={s.name}
            style={[styles.donutLegendRow, selected === s.name && { backgroundColor: `${s.color}1A` }]}
            disabled={!onSelect}
            onPress={() => onSelect && onSelect(s.name)}
          >
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={[styles.donutLegendName, { color: colors.text }]} numberOfLines={1}>{s.name}</Text>
            <Text style={[styles.donutLegendValue, { color: colors.subText }]}>
              {s.value} ({s.pct}%)
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* Horizontal bars (the Website BarChart's layout="horizontal"). data: [{ name, value, color? }] */
export function HBarChart({ data, colors, palette = CHART_PALETTE, colorByIndex = true, color, formatValue, onPress }) {
  const max = Math.max(...data.map((d) => Math.abs(Number(d.value) || 0)), 1);
  return (
    <View>
      {data.map((d, i) => {
        const value = Number(d.value) || 0;
        const fill = d.color || (colorByIndex ? palette[i % palette.length] : color || palette[0]);
        return (
          <TouchableOpacity key={`${d.name}-${i}`} style={styles.hbarRow} disabled={!onPress} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.hbarHead}>
              <Text style={[styles.hbarName, { color: colors.text }]} numberOfLines={1}>{d.name}</Text>
              <Text style={[styles.hbarValue, { color: colors.subText }]}>{formatValue ? formatValue(value) : value}</Text>
            </View>
            <View style={[styles.hbarTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.hbarFill, { width: `${Math.max(3, (Math.abs(value) / max) * 100)}%`, backgroundColor: fill }]} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* Daily net stock change as columns above/below zero (the Website's Stock Flow chart).
   data: [{ date, value }] */
export function NetFlowChart({ data, width, colors, height = 170, positiveColor = '#10B981', negativeColor = '#EF4444' }) {
  if (!width || !data.length) return null;

  const PAD = { top: 10, right: 8, bottom: 22, left: 40 };
  const plotW = Math.max(10, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const maxAbs = niceMax(Math.max(...data.map((d) => Math.abs(d.value))));
  const hasPositive = data.some((d) => d.value > 0);
  const hasNegative = data.some((d) => d.value < 0);
  const top = hasPositive || !hasNegative ? maxAbs : 0;
  const bottom = hasNegative ? -maxAbs : 0;
  const range = top - bottom || 1;
  const y = (v) => PAD.top + ((top - v) / range) * plotH;
  const zeroY = y(0);
  const slot = plotW / data.length;
  const barW = Math.max(1.5, slot * 0.7);

  return (
    <Svg width={width} height={height}>
      <Line x1={PAD.left} x2={PAD.left + plotW} y1={zeroY} y2={zeroY} stroke={colors.subText} strokeWidth={1} />
      <SvgText x={PAD.left - 6} y={PAD.top + 8} fontSize="10" fill={colors.subText} textAnchor="end">
        {top > 0 ? `+${formatCompact(top)}` : '0'}
      </SvgText>
      {bottom < 0 && (
        <SvgText x={PAD.left - 6} y={PAD.top + plotH} fontSize="10" fill={colors.subText} textAnchor="end">
          {formatCompact(bottom)}
        </SvgText>
      )}
      {data.map((d, i) => (
        <Rect
          key={d.date || i}
          x={PAD.left + i * slot + (slot - barW) / 2}
          y={Math.min(y(d.value), zeroY)}
          width={barW}
          height={Math.max(1, Math.abs(y(d.value) - zeroY))}
          fill={d.value >= 0 ? positiveColor : negativeColor}
          rx={1}
        />
      ))}
      <SvgText x={PAD.left} y={height - 6} fontSize="10" fill={colors.subText} textAnchor="start">
        {shortDate(data[0].date)}
      </SvgText>
      <SvgText x={PAD.left + plotW} y={height - 6} fontSize="10" fill={colors.subText} textAnchor="end">
        {shortDate(data[data.length - 1].date)}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 3, borderRadius: 2 },
  legendDashed: { opacity: 0.8 },
  legendText: { fontSize: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  donutWrap: { alignItems: 'center' },
  donutCenter: { alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontSize: 22, fontWeight: 'bold' },
  donutLabel: { fontSize: 11 },
  donutLegend: { alignSelf: 'stretch', marginTop: 12 },
  donutLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 6 },
  donutLegendName: { flex: 1, fontSize: 13 },
  donutLegendValue: { fontSize: 12, fontWeight: '600' },
  hbarRow: { marginBottom: 11 },
  hbarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  hbarName: { flex: 1, fontSize: 13, fontWeight: '600', marginRight: 10 },
  hbarValue: { fontSize: 12 },
  hbarTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 5 },
});
