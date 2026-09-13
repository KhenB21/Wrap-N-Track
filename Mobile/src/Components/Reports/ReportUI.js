import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/* Shared building blocks for the employee report screens (Sales / Inventory),
   styled after the Website report pages. */

const { width: SCREEN_W } = Dimensions.get('window');
export const REPORT_PAD = 16;
export const HALF_WIDTH = (SCREEN_W - REPORT_PAD * 2 - 12) / 2;

// Same series palette as Website/client/src/Components/Charts/chartUtils.js.
export const CHART_PALETTE = ['#3b82f6', '#059669', '#b45309', '#ef4444', '#7c3aed', '#0e7490', '#c2410c', '#4d7c0f'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const formatPeso = (value) => {
  const n = Number(value) || 0;
  const [whole, cents] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}₱${group(whole)}.${cents}`;
};

// Up to two decimals, trailing zeros dropped (0.37, 12.5, 100).
export const formatNumber = (value) => {
  const n = Number(value) || 0;
  const [whole, frac] = (Math.round(Math.abs(n) * 100) / 100).toFixed(2).replace(/\.?0+$/, '').split('.');
  return `${n < 0 ? '-' : ''}${group(whole)}${frac ? `.${frac}` : ''}`;
};

// Axis labels: ₱1.2k, 3.4M.
export const formatCompact = (value, prefix = '') => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${prefix}${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
  return `${sign}${prefix}${Math.round(abs)}`;
};

// Report dates arrive either as YYYY-MM-DD or as a UTC instant for a DATE column.
export const parseReportDate = (raw) => {
  if (!raw) return null;
  const text = String(raw);
  const plain = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const shortDate = (raw) => {
  const d = parseReportDate(raw);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : '';
};

export const formatDate = (raw) => {
  const d = parseReportDate(raw);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : 'N/A';
};

export const TREND_META = {
  up: { icon: 'trending-up', color: '#16A34A' },
  down: { icon: 'trending-down', color: '#DC2626' },
  stable: { icon: 'trending-neutral', color: '#6B7280' },
};

// Charts draw to an exact pixel width, so measure the card body they sit in.
export function useMeasuredWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e) => {
    const next = Math.floor(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === next ? prev : next));
  }, []);
  return [width, onLayout];
}

export function ReportHeader({ title, subtitle, colors }) {
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <Text style={[styles.headerTitle, { color: colors.onPrimary }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.headerSubtitle, { color: colors.onPrimary }]}>{subtitle}</Text>}
    </View>
  );
}

export function Chips({ options, value, onChange, colors, scroll = false }) {
  const content = options.map((option) => {
    const active = option.key === value;
    return (
      <TouchableOpacity
        key={String(option.key)}
        onPress={() => onChange(option.key)}
        style={[
          styles.chip,
          { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card },
        ]}
      >
        {!!option.icon && <MaterialCommunityIcons name={option.icon} size={15} color={active ? '#fff' : colors.subText} />}
        <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{option.label}</Text>
        {option.count != null && (
          <View style={[styles.chipCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.inputBackground }]}>
            <Text style={[styles.chipCountText, { color: active ? '#fff' : colors.subText }]}>{option.count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {content}
    </ScrollView>
  ) : (
    <View style={[styles.chipRow, styles.chipWrap]}>{content}</View>
  );
}

export function KpiCard({ label, value, tone = '#696a8f', trend, sub, colors, width = HALF_WIDTH }) {
  const trendMeta = trend ? TREND_META[trend] || TREND_META.stable : null;
  return (
    <View style={[styles.kpi, { width, backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: tone }]}>
      <Text style={[styles.kpiLabel, { color: colors.subText }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {!!trendMeta && (
        <View style={styles.trendRow}>
          <MaterialCommunityIcons name={trendMeta.icon} size={14} color={trendMeta.color} />
          <Text style={[styles.trendText, { color: trendMeta.color }]}>{trend}</Text>
        </View>
      )}
      {!!sub && <Text style={[styles.kpiSub, { color: colors.subText }]} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

export function ChartCard({ title, subtitle, colors, loading, error, onRetry, isEmpty, emptyMessage, right, onLayout, children, style }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {(!!title || !!right) && (
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            {!!title && <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>}
            {!!subtitle && <Text style={[styles.cardSubtitle, { color: colors.subText }]}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      <View onLayout={onLayout}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>This section failed to load.</Text>
            {!!onRetry && (
              <TouchableOpacity onPress={onRetry} style={[styles.retryBtn, { borderColor: colors.primary }]}>
                <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isEmpty ? (
          <Text style={[styles.emptyText, { color: colors.subText }]}>{emptyMessage}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function Pill({ text, color }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1F` }]}>
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// items: [[label, value, valueColor?], …] laid out two per row.
export function MetricGrid({ items, colors }) {
  return (
    <View style={styles.metricGrid}>
      {items.map(([label, value, color]) => (
        <View key={label} style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: colors.subText }]} numberOfLines={1}>{label}</Text>
          <Text style={[styles.metricValue, { color: color || colors.text }]} numberOfLines={1}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function ShowMoreButton({ shown, total, onPress, colors }) {
  if (shown >= total) return null;
  return (
    <TouchableOpacity onPress={onPress} style={[styles.moreBtn, { borderColor: colors.border }]}>
      <Text style={[styles.moreText, { color: colors.primary }]}>Show more ({total - shown} left)</Text>
    </TouchableOpacity>
  );
}

export function ErrorBanner({ message }) {
  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#991B1B" />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

export const reportStyles = StyleSheet.create({
  section: { paddingHorizontal: REPORT_PAD, paddingTop: REPORT_PAD },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  divider: { borderTopWidth: 1 },
});

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 15, marginTop: 4, opacity: 0.9 },
  chipRow: { paddingHorizontal: REPORT_PAD, paddingVertical: 10, gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontSize: 11, fontWeight: '700' },
  kpi: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  kpiLabel: { fontSize: 12, fontWeight: '600' },
  kpiValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  kpiSub: { fontSize: 11, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  trendText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  card: {
    marginHorizontal: REPORT_PAD,
    marginTop: REPORT_PAD,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  loader: { marginVertical: 24 },
  errorBox: { alignItems: 'center', paddingVertical: 8 },
  retryBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6, marginTop: 4 },
  retryText: { fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  metricCell: { width: '50%', paddingVertical: 4, paddingRight: 8 },
  metricLabel: { fontSize: 11 },
  metricValue: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  moreBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center', marginTop: 10 },
  moreText: { fontSize: 13, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: REPORT_PAD,
    marginTop: REPORT_PAD,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  bannerText: { flex: 1, color: '#991B1B', fontSize: 13 },
});
