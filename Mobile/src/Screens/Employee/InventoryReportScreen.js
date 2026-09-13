import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../Context/ThemeContext';
import { analyticsAPI, inventoryAPI, inventoryReportsAPI } from '../../services/api';
import {
  ChartCard,
  Chips,
  ErrorBanner,
  KpiCard,
  MetricGrid,
  Pill,
  ReportHeader,
  ShowMoreButton,
  formatNumber,
  formatPeso,
  reportStyles,
  useMeasuredWidth,
} from '../../Components/Reports/ReportUI';
import { HBarChart, NetFlowChart } from '../../Components/Reports/ReportCharts';

/* Mobile version of the Website Inventory Report (Website/client/src/Pages/InventoryReport/InventoryReport.js):
   same endpoints and the same five tabs — Overview, Movement Analysis, Replenishment,
   Demand Forecast and Advanced Analytics — with the tables shown as cards and charts. */

const DAY_OPTIONS = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
];

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'view-dashboard-outline' },
  { key: 'movement', label: 'Movement', icon: 'rocket-launch-outline' },
  { key: 'replenishment', label: 'Replenishment', icon: 'autorenew' },
  { key: 'forecast', label: 'Forecast', icon: 'crystal-ball' },
  { key: 'analytics', label: 'Advanced', icon: 'chart-box-outline' },
];

const MOVEMENT_CATEGORIES = ['FAST_MOVING', 'MODERATE_MOVING', 'SLOW_MOVING', 'DEAD_STOCK'];
const MOVEMENT_COLORS = { FAST_MOVING: '#10B981', MODERATE_MOVING: '#F59E0B', SLOW_MOVING: '#EF4444', DEAD_STOCK: '#6B7280' };

// The reorder_status values /replenishment-suggestions actually returns.
const PRIORITY_STATUSES = ['Out of Stock', 'Reorder Recommended', 'Approaching Reorder Point', 'Healthy'];
const PRIORITY_COLORS = {
  'Out of Stock': '#EF4444',
  'Reorder Recommended': '#F59E0B',
  'Approaching Reorder Point': '#3B82F6',
  Healthy: '#10B981',
};

const PAGE = 10;
const labelOf = (value) => String(value || '').replace(/_/g, ' ');
const toNumber = (value) => parseFloat(value) || 0;

export default function InventoryReportScreen() {
  const { colors } = useTheme();

  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});

  const [inventory, setInventory] = useState([]);
  const [replenishment, setReplenishment] = useState([]);
  const [movement, setMovement] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [stockFlow, setStockFlow] = useState([]);

  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [limits, setLimits] = useState({});
  const [flowWidth, onFlowLayout] = useMeasuredWidth();

  const limitFor = (key) => limits[key] || PAGE;
  const showMore = (key) => setLimits((prev) => ({ ...prev, [key]: (prev[key] || PAGE) + PAGE }));

  // Core data first so Overview is usable immediately; the slower analytics follow
  // (same split as the Website page).
  const fetchData = useCallback(async () => {
    const nextErrors = {};
    const [inventoryRes, replenishmentRes] = await Promise.allSettled([
      inventoryAPI.getInventory(),
      inventoryReportsAPI.getReplenishmentSuggestions(days),
    ]);

    if (inventoryRes.status === 'fulfilled') {
      const value = inventoryRes.value;
      setInventory(Array.isArray(value) ? value : value?.inventory || []);
    } else {
      nextErrors.inventory = true;
    }
    if (replenishmentRes.status === 'fulfilled') setReplenishment(replenishmentRes.value?.data || []);
    else nextErrors.replenishment = true;

    setErrors({ ...nextErrors });
    setLoading(false);

    setExtrasLoading(true);
    const [movementRes, analyticsRes, forecastRes, flowRes] = await Promise.allSettled([
      inventoryReportsAPI.getMovementAnalysis(days),
      inventoryReportsAPI.getAdvancedAnalytics(days),
      analyticsAPI.getDemandForecast(),
      inventoryReportsAPI.getStockFlow(days),
    ]);

    if (movementRes.status === 'fulfilled') setMovement(movementRes.value?.data || []);
    else nextErrors.movement = true;
    if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value?.data || []);
    else nextErrors.analytics = true;
    if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value?.data || []);
    else nextErrors.forecast = true;
    // Stock flow is optional on the Website too — a failure just hides the chart.
    setStockFlow(flowRes.status === 'fulfilled' ? flowRes.value?.data || [] : []);

    setErrors({ ...nextErrors });
    setExtrasLoading(false);
  }, [days]);

  useEffect(() => {
    setLoading(true);
    setLimits({});
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  /* ── Overview figures (same rules as the Website's calculateReportData) ── */
  const report = useMemo(() => {
    const totalValue = inventory.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price), 0);
    const outOfStock = inventory.filter((item) => toNumber(item.quantity) <= 0);
    const lowStock = inventory.filter((item) => {
      const qty = toNumber(item.quantity);
      if (qty <= 0) return false;
      return qty <= (item.reorder_level || Math.ceil(qty * 0.2));
    });
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    // The inventory API calls the column `expiration`.
    const expiring = inventory.filter((item) => {
      const raw = item.expiration || item.expiration_date;
      return raw ? new Date(raw) <= limit : false;
    });

    const byCategory = {};
    inventory.forEach((item) => {
      const name = item.category || 'Uncategorized';
      byCategory[name] = byCategory[name] || { name, count: 0, value: 0 };
      byCategory[name].count += 1;
      byCategory[name].value += toNumber(item.quantity) * toNumber(item.unit_price);
    });
    const categories = Object.values(byCategory).sort((a, b) => b.value - a.value);

    return { totalValue, totalSKUs: inventory.length, outOfStock, lowStock, expiring, categories };
  }, [inventory]);

  const movementByCategory = useMemo(() => {
    const grouped = Object.fromEntries(MOVEMENT_CATEGORIES.map((c) => [c, []]));
    movement.forEach((item) => {
      if (grouped[item.movement_category]) grouped[item.movement_category].push(item);
    });
    return grouped;
  }, [movement]);

  const replenishmentByStatus = useMemo(() => {
    const grouped = Object.fromEntries(PRIORITY_STATUSES.map((s) => [s, []]));
    replenishment.forEach((item) => {
      if (grouped[item.reorder_status]) grouped[item.reorder_status].push(item);
    });
    return grouped;
  }, [replenishment]);

  const urgentCount = replenishmentByStatus['Out of Stock'].length + replenishmentByStatus['Reorder Recommended'].length;
  const movementPending = extrasLoading && movement.length === 0;

  const stockWatch = useMemo(() => {
    const base =
      stockStatus === 'low' ? report.lowStock : stockStatus === 'out' ? report.outOfStock : [...report.outOfStock, ...report.lowStock];
    const q = search.trim().toLowerCase();
    return q
      ? base.filter((item) => String(item.name || '').toLowerCase().includes(q) || String(item.sku || '').toLowerCase().includes(q))
      : base;
  }, [report, stockStatus, search]);

  const hasErrors = Object.keys(errors).length > 0;

  /* ── Tabs ──────────────────────────────────────────────────────────── */
  const renderOverview = () => (
    <>
      <View style={[reportStyles.section, reportStyles.grid]}>
        {[
          ['Total Inventory Value', formatPeso(report.totalValue), '#3b82f6'],
          ['Total SKUs', formatNumber(report.totalSKUs), '#696a8f'],
          ['Low Stock Items', formatNumber(report.lowStock.length), '#F59E0B'],
          ['Out of Stock', formatNumber(report.outOfStock.length), '#EF4444'],
          ['Expiring Items', formatNumber(report.expiring.length), '#EF4444', 'Within 30 days'],
          ['Fast Moving Items', movementPending ? '…' : formatNumber(movementByCategory.FAST_MOVING.length), '#10B981'],
          ['Slow Moving Items', movementPending ? '…' : formatNumber(movementByCategory.SLOW_MOVING.length), '#F59E0B'],
          ['Dead Stock Items', movementPending ? '…' : formatNumber(movementByCategory.DEAD_STOCK.length), '#6B7280'],
          ['Urgent Replenishment', formatNumber(urgentCount), '#6366f1', 'Out of stock + reorder'],
        ].map(([label, value, tone, sub]) => (
          <KpiCard key={label} colors={colors} label={label} value={loading ? '…' : value} tone={tone} sub={sub} />
        ))}
      </View>

      <ChartCard
        title="Inventory Value by Category"
        colors={colors}
        loading={loading}
        error={errors.inventory}
        onRetry={onRefresh}
        isEmpty={report.categories.length === 0}
        emptyMessage="No inventory data."
      >
        <HBarChart
          colors={colors}
          data={report.categories.slice(0, 8).map((c) => ({ name: `${c.name} (${c.count})`, value: c.value }))}
          formatValue={formatPeso}
        />
      </ChartCard>

      <ChartCard
        title="Low Stock & Out of Stock"
        subtitle="Products that need attention"
        colors={colors}
        loading={loading}
        error={errors.inventory}
        onRetry={onRefresh}
      >
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.subText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by product name or SKU…"
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inlineChips}>
          <Chips
            scroll
            colors={colors}
            value={stockStatus}
            onChange={setStockStatus}
            options={[
              { key: 'all', label: 'Low + Out', count: report.lowStock.length + report.outOfStock.length },
              { key: 'low', label: 'Low Stock', count: report.lowStock.length },
              { key: 'out', label: 'Out of Stock', count: report.outOfStock.length },
            ]}
          />
        </View>
        {stockWatch.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subText }]}>No products match the current filters.</Text>
        ) : (
          <>
            {stockWatch.slice(0, limitFor('watch')).map((item, i) => {
              const qty = toNumber(item.quantity);
              const threshold = item.reorder_level || Math.ceil(qty * 0.2);
              const isOut = qty <= 0;
              return (
                <View key={item.sku} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={styles.rowMain}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.subText }]}>SKU: {item.sku}</Text>
                    <Text style={[styles.rowSub, { color: isOut ? '#EF4444' : '#F59E0B' }]}>
                      {formatNumber(qty)} in stock · reorder at {formatNumber(threshold)}
                    </Text>
                  </View>
                  <Pill text={isOut ? 'Out of Stock' : 'Low Stock'} color={isOut ? '#EF4444' : '#F59E0B'} />
                </View>
              );
            })}
            <ShowMoreButton colors={colors} shown={limitFor('watch')} total={stockWatch.length} onPress={() => showMore('watch')} />
          </>
        )}
      </ChartCard>
    </>
  );

  const renderMovement = () => {
    const totalIn = stockFlow.reduce((sum, d) => sum + (Number(d.stockIn) || 0), 0);
    const totalOut = stockFlow.reduce((sum, d) => sum + (Number(d.stockOut) || 0), 0);
    const net = totalIn - totalOut;

    return (
      <>
        <ChartCard
          title={`Stock Flow — ${days}-day window`}
          colors={colors}
          loading={extrasLoading && stockFlow.length === 0}
          isEmpty={stockFlow.length === 0}
          emptyMessage="No stock movements recorded in this window."
          onLayout={onFlowLayout}
        >
          <View style={styles.flowTiles}>
            {[
              ['Total Stock In', `${formatNumber(totalIn)} units`, '#10B981'],
              ['Total Stock Out', `${formatNumber(totalOut)} units`, '#EF4444'],
              ['Net Change', `${net >= 0 ? '+' : ''}${formatNumber(net)} units`, net >= 0 ? '#10B981' : '#EF4444'],
            ].map(([label, value, color]) => (
              <View key={label} style={[styles.flowTile, { borderColor: colors.border }]}>
                <Text style={[styles.flowLabel, { color: colors.subText }]}>{label}</Text>
                <Text style={[styles.flowValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
              </View>
            ))}
          </View>
          <NetFlowChart
            data={stockFlow.map((d) => ({ date: d.date, value: (Number(d.stockIn) || 0) - (Number(d.stockOut) || 0) }))}
            width={flowWidth}
            colors={colors}
          />
          <Text style={[styles.note, { color: colors.subText }]}>Positive = more received than consumed; negative = drawdown.</Text>
        </ChartCard>

        <ChartCard
          title="Movement Mix"
          subtitle={`Items by how fast they sold over ${days} days`}
          colors={colors}
          loading={movementPending}
          error={errors.movement}
          onRetry={onRefresh}
          isEmpty={movement.length === 0}
          emptyMessage="No movement data for this period."
        >
          <HBarChart
            colors={colors}
            data={MOVEMENT_CATEGORIES.map((c) => ({ name: labelOf(c), value: movementByCategory[c].length, color: MOVEMENT_COLORS[c] }))}
            formatValue={(v) => `${formatNumber(v)} items`}
          />
        </ChartCard>

        {!movementPending &&
          !errors.movement &&
          MOVEMENT_CATEGORIES.map((category) => {
            const items = movementByCategory[category];
            const key = `movement-${category}`;
            return (
              <ChartCard
                key={category}
                title={labelOf(category)}
                colors={colors}
                right={<Pill text={`${items.length} items`} color={MOVEMENT_COLORS[category]} />}
                isEmpty={items.length === 0}
                emptyMessage="No items in this group."
                style={{ borderTopWidth: 4, borderTopColor: MOVEMENT_COLORS[category] }}
              >
                {items.slice(0, limitFor(key)).map((item, i) => (
                  <View key={item.sku} style={[styles.itemBlock, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.subText }]}>{item.sku}</Text>
                    <MetricGrid
                      colors={colors}
                      items={[
                        ['Sold', formatNumber(item.sold_quantity)],
                        ['Sales Value', formatPeso(item.sales_value)],
                        ['Velocity', item.velocity_ratio != null ? `${formatNumber(item.velocity_ratio)}x` : '—'],
                        ['Current Stock', formatNumber(item.current_stock)],
                      ]}
                    />
                  </View>
                ))}
                <ShowMoreButton colors={colors} shown={limitFor(key)} total={items.length} onPress={() => showMore(key)} />
              </ChartCard>
            );
          })}
      </>
    );
  };

  const renderReplenishment = () => (
    <>
      <ChartCard
        title="Replenishment Status"
        subtitle="Recommendations based on demand, lead time and safety stock"
        colors={colors}
        loading={loading}
        error={errors.replenishment}
        onRetry={onRefresh}
        isEmpty={replenishment.length === 0}
        emptyMessage="No replenishment suggestions."
      >
        <HBarChart
          colors={colors}
          data={PRIORITY_STATUSES.map((s) => ({ name: s, value: replenishmentByStatus[s].length, color: PRIORITY_COLORS[s] }))}
          formatValue={(v) => `${formatNumber(v)} items`}
        />
      </ChartCard>

      {!loading &&
        !errors.replenishment &&
        PRIORITY_STATUSES.map((status) => {
          const items = replenishmentByStatus[status];
          const key = `rep-${status}`;
          return (
            <ChartCard
              key={status}
              title={status}
              colors={colors}
              right={<Pill text={`${items.length} items`} color={PRIORITY_COLORS[status]} />}
              isEmpty={items.length === 0}
              emptyMessage="No items with this status."
              style={{ borderTopWidth: 4, borderTopColor: PRIORITY_COLORS[status] }}
            >
              {items.slice(0, limitFor(key)).map((item, i) => (
                <View key={item.sku} style={[styles.itemBlock, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.subText }]}>
                    {item.sku}
                    {item.supplier_name ? ` · ${item.supplier_name}` : ''}
                  </Text>
                  <MetricGrid
                    colors={colors}
                    items={[
                      ['Available Stock', formatNumber(item.available_stock)],
                      ['Avg Daily Usage', formatNumber(item.average_daily_usage)],
                      ['Days of Supply', item.days_of_supply ?? 'N/A'],
                      ['Reorder Point', formatNumber(item.reorder_point)],
                      ['Suggested Order', formatNumber(item.suggested_reorder_quantity), PRIORITY_COLORS[status]],
                      ['Order Value', formatPeso(toNumber(item.suggested_reorder_quantity) * toNumber(item.unit_price))],
                    ]}
                  />
                </View>
              ))}
              <ShowMoreButton colors={colors} shown={limitFor(key)} total={items.length} onPress={() => showMore(key)} />
            </ChartCard>
          );
        })}
    </>
  );

  const renderForecast = () => {
    const okItems = forecast.filter((d) => d.status === 'ok');
    const thinItems = forecast.filter((d) => d.status !== 'ok');
    const soonest = okItems
      .filter((d) => d.daysToStockout !== null && d.daysToStockout !== undefined)
      .sort((a, b) => a.daysToStockout - b.daysToStockout)
      .slice(0, 8);
    const pending = extrasLoading && forecast.length === 0;

    return (
      <>
        <ChartCard
          title="Soonest Stockouts"
          subtitle="Days until each item runs out at its current usage"
          colors={colors}
          loading={pending}
          error={errors.forecast}
          onRetry={onRefresh}
          isEmpty={soonest.length === 0}
          emptyMessage={forecast.length === 0 ? 'No forecast data available.' : 'No item is projected to run out.'}
        >
          <HBarChart
            colors={colors}
            data={soonest.map((d) => ({
              name: d.name,
              value: Math.ceil(d.daysToStockout),
              color: d.daysToStockout <= 14 ? '#EF4444' : d.daysToStockout <= 30 ? '#F59E0B' : '#10B981',
            }))}
            formatValue={(v) => `${formatNumber(v)}d`}
          />
        </ChartCard>

        {!pending && !errors.forecast && okItems.length > 0 && (
          <ChartCard title="Demand Forecast" subtitle={`${okItems.length} SKUs with enough sales history`} colors={colors}>
            {okItems.slice(0, limitFor('forecast')).map((d, i) => {
              const urgent = d.daysToStockout !== null && d.daysToStockout !== undefined && d.daysToStockout <= (d.leadTimeDays || 7);
              const trend = d.trend?.direction;
              return (
                <View
                  key={d.sku}
                  style={[
                    styles.itemBlock,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                    urgent && styles.urgentBlock,
                  ]}
                >
                  <View style={styles.rowHead}>
                    <Text style={[styles.rowTitle, styles.flex1, { color: colors.text }]} numberOfLines={1}>{d.name}</Text>
                    {!!d.reorderStatus && <Pill text={d.reorderStatus} color={PRIORITY_COLORS[d.reorderStatus] || '#6B7280'} />}
                  </View>
                  <Text style={[styles.rowSub, { color: colors.subText }]}>
                    {d.sku}
                    {trend
                      ? `  ·  ${trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} ${d.trend.changePct != null ? `${Math.abs(d.trend.changePct).toFixed(0)}%` : ''}`
                      : ''}
                  </Text>
                  <MetricGrid
                    colors={colors}
                    items={[
                      ['Stock on Hand', formatNumber(d.availableStock)],
                      ['Avg Daily Use (30d)', d.averageDailyUsage?.d30 ?? '—'],
                      [
                        'Days to Stockout',
                        d.daysToStockout !== null && d.daysToStockout !== undefined ? `${Math.ceil(d.daysToStockout)}d` : '—',
                        d.daysToStockout !== null && d.daysToStockout <= 14 ? '#EF4444' : null,
                      ],
                      ['Projected Stockout', d.projectedStockoutDate ?? '—'],
                      ['Reorder Qty', d.recommendedReorderQuantity > 0 ? formatNumber(d.recommendedReorderQuantity) : '—'],
                      ['Lead Time', d.leadTimeDays ? `${d.leadTimeDays}d` : '—'],
                    ]}
                  />
                </View>
              );
            })}
            <ShowMoreButton colors={colors} shown={limitFor('forecast')} total={okItems.length} onPress={() => showMore('forecast')} />
          </ChartCard>
        )}

        {!pending && !errors.forecast && thinItems.length > 0 && (
          <ChartCard
            title={`Insufficient History (${thinItems.length} SKUs)`}
            subtitle="Fewer than 30 days of sales in the last 90 days — no forecast is shown."
            colors={colors}
          >
            {thinItems.slice(0, limitFor('thin')).map((d, i) => (
              <View key={d.sku} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{d.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.subText }]}>{d.sku}</Text>
                </View>
                <Text style={[styles.rowSub, { color: colors.subText }]}>{d.salesDays90 ?? '—'} sales days</Text>
              </View>
            ))}
            <ShowMoreButton colors={colors} shown={limitFor('thin')} total={thinItems.length} onPress={() => showMore('thin')} />
          </ChartCard>
        )}
      </>
    );
  };

  const renderAnalytics = () => {
    const pending = extrasLoading && analytics.length === 0;
    const topBySales = analytics
      .slice()
      .sort((a, b) => toNumber(b.sales_value) - toNumber(a.sales_value))
      .filter((item) => toNumber(item.sales_value) > 0)
      .slice(0, 8);

    return (
      <>
        <ChartCard
          title="Top Sales Value"
          subtitle={`Best-selling items over ${days} days`}
          colors={colors}
          loading={pending}
          error={errors.analytics}
          onRetry={onRefresh}
          isEmpty={topBySales.length === 0}
          emptyMessage="No sales recorded in this period."
        >
          <HBarChart colors={colors} data={topBySales.map((item) => ({ name: item.name, value: toNumber(item.sales_value) }))} formatValue={formatPeso} />
        </ChartCard>

        {!pending && !errors.analytics && (
          <ChartCard
            title="Advanced Inventory Analytics"
            subtitle="Performance and profitability per SKU"
            colors={colors}
            isEmpty={analytics.length === 0}
            emptyMessage="No analytics data."
          >
            {analytics.slice(0, limitFor('analytics')).map((item, i) => (
              <View key={item.sku} style={[styles.itemBlock, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.rowSub, { color: colors.subText }]}>
                  {item.sku}
                  {item.category ? ` · ${item.category}` : ''}
                </Text>
                <View style={styles.pillRow}>
                  {!!item.movement_category && (
                    <Pill text={labelOf(item.movement_category)} color={MOVEMENT_COLORS[item.movement_category] || '#6B7280'} />
                  )}
                  {!!item.stock_level && <Pill text={labelOf(item.stock_level)} color={colors.primary} />}
                </View>
                <MetricGrid
                  colors={colors}
                  items={[
                    ['Current Stock', formatNumber(item.current_stock)],
                    ['Sold Qty', formatNumber(item.sold_quantity)],
                    ['Sales Value', formatPeso(item.sales_value)],
                    ['Daily Velocity', item.daily_velocity ?? '—'],
                    ['Days of Supply', item.days_of_supply ?? '—'],
                    ['Turnover Ratio', item.turnover_ratio ?? '—'],
                    ['Profit Margin', item.profit_margin_percentage != null ? formatPeso(item.profit_margin) : '—'],
                    ['Margin %', item.profit_margin_percentage != null ? `${item.profit_margin_percentage}%` : '—'],
                  ]}
                />
              </View>
            ))}
            <ShowMoreButton colors={colors} shown={limitFor('analytics')} total={analytics.length} onPress={() => showMore('analytics')} />
          </ChartCard>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <ReportHeader title="Inventory Report" subtitle="Stock health, movement and replenishment" colors={colors} />
        <Chips options={DAY_OPTIONS} value={days} onChange={setDays} colors={colors} />
        <Chips options={TABS} value={activeTab} onChange={setActiveTab} colors={colors} scroll />

        {!loading && !extrasLoading && hasErrors && <ErrorBanner message="Some sections failed to load. Pull down to retry." />}

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'movement' && renderMovement()}
        {activeTab === 'replenishment' && renderReplenishment()}
        {activeTab === 'forecast' && renderForecast()}
        {activeTab === 'analytics' && renderAnalytics()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  inlineChips: { marginHorizontal: -16 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowMain: { flex: 1, gap: 2 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12 },
  flex1: { flex: 1 },
  itemBlock: { paddingVertical: 10 },
  urgentBlock: { borderLeftWidth: 3, borderLeftColor: '#EF4444', paddingLeft: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  flowTiles: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  flowTile: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8 },
  flowLabel: { fontSize: 11 },
  flowValue: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  note: { fontSize: 11, marginTop: 6 },
});
