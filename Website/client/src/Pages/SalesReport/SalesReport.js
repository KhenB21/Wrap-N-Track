import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../Components/AppShell';
import EmptyState from '../../Components/EmptyState';
import { TrendChart, DonutChart, BarChart } from '../../Components/Charts';
import api from '../../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SalesReport.css';
import usePermissions from '../../hooks/usePermissions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const EMPTY_SALES_DATA = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  totalProfit: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  pendingOrders: 0,
  paidAmount: 0,
  outstandingAmount: 0,
  ordersByStatus: {},
  revenueTrend: 'stable',
  ordersTrend: 'stable',
  profitTrend: 'stable',
};

const PERIOD_LABELS = { today: 'Today', week: 'This Week', month: 'This Month' };

function SectionError({ onRetry }) {
  return (
    <div className="sr-empty" role="alert">
      <p style={{ margin: '0 0 10px' }}>This section failed to load.</p>
      <button className="sr-btn sr-btn-ghost" onClick={onRetry}>Retry</button>
    </div>
  );
}

export default function SalesReport() {
  const { checkPermission, canUseTestData } = usePermissions();
  const showTestDataControls = canUseTestData();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const [salesData, setSalesData] = useState(EMPTY_SALES_DATA);
  const [trends, setTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { navigate('/login-employee-pensee'); return; }
    if (!checkPermission('reports')) return;
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const toLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDateRange = (period) => {
    const today = new Date();
    const start = new Date();
    switch (period) {
      case 'today': break;
      case 'week':  start.setDate(today.getDate() - 7);  break;
      case 'month': start.setDate(today.getDate() - 30); break;
      default: break;
    }
    return { startDate: toLocalDateString(start), endDate: toLocalDateString(today) };
  };

  const fetchAllData = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange(selectedPeriod);
    const errors = {};

    const [overviewRes, trendsRes, topProductsRes, customerRes, recentRes] = await Promise.allSettled([
      api.get(`/api/sales-reports/overview?startDate=${startDate}&endDate=${endDate}`),
      api.get(`/api/sales-reports/trends?startDate=${startDate}&endDate=${endDate}&groupBy=day`),
      api.get(`/api/sales-reports/top-products?startDate=${startDate}&endDate=${endDate}&limit=8`),
      api.get(`/api/sales-reports/customer-analysis?startDate=${startDate}&endDate=${endDate}`),
      api.get('/api/sales-reports/recent?limit=10'),
    ]);

    if (overviewRes.status === 'fulfilled' && overviewRes.value.data.success) {
      setSalesData(overviewRes.value.data.data);
    } else {
      errors.overview = true;
      setSalesData(EMPTY_SALES_DATA);
    }
    if (trendsRes.status === 'fulfilled' && trendsRes.value.data.success) {
      setTrends(trendsRes.value.data.data);
    } else {
      errors.trends = true;
      setTrends([]);
    }
    if (topProductsRes.status === 'fulfilled' && topProductsRes.value.data.success) {
      setTopProducts(topProductsRes.value.data.data);
    } else {
      errors.topProducts = true;
      setTopProducts([]);
    }
    if (customerRes.status === 'fulfilled' && customerRes.value.data.success) {
      setTopCustomers((customerRes.value.data.data.customers || []).slice(0, 5));
    } else {
      errors.customers = true;
      setTopCustomers([]);
    }
    if (recentRes.status === 'fulfilled' && recentRes.value.data.success) {
      setRecentSales(recentRes.value.data.data);
    } else {
      errors.recent = true;
      setRecentSales([]);
    }

    setSectionErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Some sections failed to load.');
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const insertTestData = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/sales-reports/test-data/insert');
      if (res.data.success) { toast.success('Test data inserted!'); await fetchAllData(); }
      else toast.error('Failed to insert test data');
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const clearTestData = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/sales-reports/test-data/clear');
      if (res.data.success) { toast.success('Test data cleared!'); await fetchAllData(); }
      else toast.error('Failed to clear test data');
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
  const formatNumber = (n) => new Intl.NumberFormat('en-PH').format(n || 0);
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  const trendArrow = (t) => (t === 'up' ? '↗' : t === 'down' ? '↘' : '→');
  const trendClass = (t) => (t === 'up' ? 'sr-trend-up' : t === 'down' ? 'sr-trend-down' : 'sr-trend-flat');

  // ── Chart data ──────────────────────────────────────────────────────────────
  const trendData = useMemo(() =>
    trends.map(t => ({
      date: t.period,
      revenue: Number(t.revenue) || 0,
      orders: Number(t.orders) || 0,
    })), [trends]);

  const statusDonutData = useMemo(() =>
    Object.entries(salesData.ordersByStatus || {})
      .map(([name, value]) => ({ name, value: Number(value) }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value),
    [salesData.ordersByStatus]);

  const topProductsChartData = useMemo(() =>
    topProducts.map(p => ({ name: p.name, value: Number(p.sales_value) || 0 })),
    [topProducts]);

  // ── Exports ─────────────────────────────────────────────────────────────────
  // jsPDF's built-in fonts (Helvetica, via autoTable) only support the WinAnsi
  // character set, which does not include ₱ (U+20B1) — it silently substitutes
  // a fallback glyph that renders as "±". PDFKit invoices already work around
  // this the same way (see routes/invoices.js formatMoney): use "PHP " instead
  // of the peso glyph in PDF output only. On-screen formatCurrency keeps ₱.
  const formatCurrencyPdf = (n) =>
    `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportPDF = () => {
    const doc = new jsPDF();
    const label = PERIOD_LABELS[selectedPeriod] || selectedPeriod;
    doc.setFontSize(16);
    doc.text(`Sales Report — ${label}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatCurrencyPdf(salesData.totalRevenue)],
        ['Total Orders', formatNumber(salesData.totalOrders)],
        ['Avg Order Value', formatCurrencyPdf(salesData.avgOrderValue)],
        ['Total Profit', formatCurrencyPdf(salesData.totalProfit)],
        ['Completed Orders', formatNumber(salesData.completedOrders)],
        ['Pending Orders', formatNumber(salesData.pendingOrders)],
        ['Cancelled Orders', formatNumber(salesData.cancelledOrders)],
        ['Paid Amount', formatCurrencyPdf(salesData.paidAmount)],
        ['Outstanding', formatCurrencyPdf(salesData.outstandingAmount)],
      ],
    });

    if (topProducts.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Product', 'Units Sold', 'Revenue']],
        body: topProducts.map(p => [p.name, formatNumber(p.units_sold), formatCurrencyPdf(p.sales_value)]),
      });
    }

    if (recentSales.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Order #', 'Customer', 'Date', 'Amount', 'Status']],
        body: recentSales.map(o => [
          `#${o.order_id}`, o.customer_name, formatDate(o.order_date),
          formatCurrencyPdf(o.total_cost), o.status,
        ]),
      });
    }

    doc.save(`sales-report-${selectedPeriod}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const label = PERIOD_LABELS[selectedPeriod] || selectedPeriod;

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Sales Report', label],
      ['Generated', new Date().toLocaleString('en-PH')],
      [],
      ['Metric', 'Value'],
      ['Total Revenue', salesData.totalRevenue],
      ['Total Orders', salesData.totalOrders],
      ['Avg Order Value', salesData.avgOrderValue],
      ['Total Profit', salesData.totalProfit],
      ['Completed Orders', salesData.completedOrders],
      ['Pending Orders', salesData.pendingOrders],
      ['Cancelled Orders', salesData.cancelledOrders],
      ['Paid Amount', salesData.paidAmount],
      ['Outstanding', salesData.outstandingAmount],
    ]), 'Summary');

    if (topProducts.length > 0) {
      XLSX.utils.book_append_sheet(wb,
        XLSX.utils.json_to_sheet(topProducts.map(p => ({
          Product: p.name, SKU: p.sku, 'Units Sold': p.units_sold, Revenue: p.sales_value,
        }))),
        'Top Products');
    }

    if (recentSales.length > 0) {
      XLSX.utils.book_append_sheet(wb,
        XLSX.utils.json_to_sheet(recentSales.map(o => ({
          'Order #': o.order_id, Customer: o.customer_name, Date: formatDate(o.order_date),
          Amount: o.total_cost, 'Payment Status': o.payment_status, Status: o.status,
        }))),
        'Recent Orders');
    }

    XLSX.writeFile(wb, `sales-report-${selectedPeriod}.xlsx`);
  };

  // ── Status pill color (CSS-var-based) ───────────────────────────────────────
  const STATUS_CLASS = {
    'Order Placed':       'sr-status-placed',
    'Order Paid':         'sr-status-paid',
    'To Be Packed':       'sr-status-packing',
    'Order Shipped Out':  'sr-status-shipped',
    'Ready for Delivery': 'sr-status-delivery',
    'Order Received':     'sr-status-received',
    'Completed':          'sr-status-completed',
    'Cancelled':          'sr-status-cancelled',
  };

  return (
    <AppShell searchPlaceholder="Search orders..." contentClassName="sr-page-content" showSearch={false}>
      <div className="sr-content">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="sr-header">
          <div>
            <h1 className="sr-title">Sales Report</h1>
            <p className="sr-subtitle">{PERIOD_LABELS[selectedPeriod]} performance</p>
          </div>
          <div className="sr-controls">
            <div className="sr-period-selector">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`sr-period-btn${selectedPeriod === key ? ' active' : ''}`}
                  onClick={() => setSelectedPeriod(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="sr-action-btns">
              <button className="sr-btn sr-btn-ghost" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? '⟳' : '↻'} Refresh
              </button>
              <button className="sr-btn sr-btn-ghost" onClick={exportExcel}>↓ Excel</button>
              <button className="sr-btn sr-btn-ghost" onClick={exportPDF}>↓ PDF</button>
              {showTestDataControls && (
                <>
                  <button className="sr-btn sr-btn-test-insert" onClick={insertTestData} disabled={loading}>
                    Insert Test Data
                  </button>
                  <button className="sr-btn sr-btn-test-clear" onClick={clearTestData} disabled={loading}>
                    Clear Test Data
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Hero KPI row ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="sr-hero-grid">
            {[...Array(4)].map((_, i) => <div key={i} className="sr-hero-card sr-skeleton" />)}
          </div>
        ) : (
          <div className="sr-hero-grid">
            <div className="sr-hero-card sr-hero-brand">
              <span className="sr-hero-label">Total Revenue</span>
              <span className="sr-hero-value">{formatCurrency(salesData.totalRevenue)}</span>
              <span className={`sr-hero-trend ${trendClass(salesData.revenueTrend)}`}>
                {trendArrow(salesData.revenueTrend)} {salesData.revenueTrend}
              </span>
            </div>
            <div className="sr-hero-card sr-hero-blue">
              <span className="sr-hero-label">Total Orders</span>
              <span className="sr-hero-value">{formatNumber(salesData.totalOrders)}</span>
              <span className={`sr-hero-trend ${trendClass(salesData.ordersTrend)}`}>
                {trendArrow(salesData.ordersTrend)} {salesData.ordersTrend}
              </span>
            </div>
            <div className="sr-hero-card sr-hero-orange">
              <span className="sr-hero-label">Avg Order Value</span>
              <span className="sr-hero-value">{formatCurrency(salesData.avgOrderValue)}</span>
            </div>
            <div className="sr-hero-card sr-hero-green">
              <span className="sr-hero-label">Total Profit</span>
              <span className="sr-hero-value">{formatCurrency(salesData.totalProfit)}</span>
              <span className={`sr-hero-trend ${trendClass(salesData.profitTrend)}`}>
                {trendArrow(salesData.profitTrend)} {salesData.profitTrend}
              </span>
            </div>
          </div>
        )}

        {/* ── Secondary strip ──────────────────────────────────────────────── */}
        {!loading && (
          <div className="sr-strip">
            <div className="sr-strip-tile">
              <span className="sr-strip-label">Completed</span>
              <span className="sr-strip-value sr-strip-green">{formatNumber(salesData.completedOrders)}</span>
            </div>
            <div className="sr-strip-tile">
              <span className="sr-strip-label">Pending</span>
              <span className="sr-strip-value sr-strip-orange">{formatNumber(salesData.pendingOrders)}</span>
            </div>
            <div className="sr-strip-tile">
              <span className="sr-strip-label">Cancelled</span>
              <span className="sr-strip-value sr-strip-red">{formatNumber(salesData.cancelledOrders)}</span>
            </div>
            <div className="sr-strip-tile">
              <span className="sr-strip-label">Paid Amount</span>
              <span className="sr-strip-value">{formatCurrency(salesData.paidAmount)}</span>
            </div>
            <div className="sr-strip-tile">
              <span className="sr-strip-label">Outstanding</span>
              <span className="sr-strip-value sr-strip-red">{formatCurrency(salesData.outstandingAmount)}</span>
            </div>
          </div>
        )}

        {/* ── Charts row ───────────────────────────────────────────────────── */}
        <div className="sr-charts-row">
          <div className="sr-chart-card sr-chart-wide">
            <h3 className="sr-card-title">Revenue &amp; Orders Trend</h3>
            {loading ? (
              <div className="sr-chart-skeleton" />
            ) : sectionErrors.trends ? (
              <SectionError onRetry={fetchAllData} />
            ) : trendData.length === 0 ? (
              <EmptyState message="No trend data for this period." />
            ) : (
              <TrendChart
                data={trendData}
                leftKey="revenue"
                rightKey="orders"
                leftLabel="Revenue (₱)"
                rightLabel="Orders"
                leftCurrency={true}
                ariaLabel="Revenue and orders trend chart"
                height={180}
              />
            )}
          </div>
          <div className="sr-chart-card sr-chart-narrow">
            <h3 className="sr-card-title">Orders by Status</h3>
            {loading ? (
              <div className="sr-chart-skeleton" />
            ) : sectionErrors.overview ? (
              <SectionError onRetry={fetchAllData} />
            ) : statusDonutData.length === 0 ? (
              <EmptyState message="No orders in this period." />
            ) : (
              <DonutChart
                data={statusDonutData}
                height={230}
                innerRadius={45}
                outerRadius={68}
                ariaLabel="Orders by status"
                onSegmentClick={(entry) => setStatusFilter(entry.name)}
              />
            )}
          </div>
        </div>

        {/* ── Top products bar chart ────────────────────────────────────────── */}
        {!loading && sectionErrors.topProducts && (
          <div className="sr-chart-card">
            <h3 className="sr-card-title">Top Products by Revenue</h3>
            <SectionError onRetry={fetchAllData} />
          </div>
        )}
        {!loading && !sectionErrors.topProducts && topProductsChartData.length > 0 && (
          <div className="sr-chart-card">
            <h3 className="sr-card-title">Top Products by Revenue</h3>
            <BarChart
              data={topProductsChartData}
              dataKey="value"
              nameKey="name"
              layout="horizontal"
              isCurrency={true}
              colorByIndex={true}
              height={Math.max(140, Math.min(220, topProductsChartData.length * 28))}
              ariaLabel="Top products by revenue"
              onBarClick={() => navigate('/inventory')}
            />
          </div>
        )}

        {/* ── Tables row ───────────────────────────────────────────────────── */}
        <div className="sr-tables-row">
          <div className="sr-table-card">
            <h3 className="sr-card-title">Top Customers</h3>
            {loading ? (
              <div className="sr-table-skeleton" />
            ) : sectionErrors.customers ? (
              <SectionError onRetry={fetchAllData} />
            ) : topCustomers.length === 0 ? (
              <EmptyState message="No customer sales in this period." />
            ) : (
              <div className="sr-table-wrap">
                <table className="sr-table">
                  <thead>
                    <tr><th>Customer</th><th className="sr-num">Orders</th><th className="sr-num">Spent</th></tr>
                  </thead>
                  <tbody>
                    {topCustomers.map(c => (
                      <tr key={`${c.name}-${c.email_address}`}>
                        <td>
                          {c.name}
                          {c.customer_type && (
                            <span className="sr-type-tag">{c.customer_type}</span>
                          )}
                        </td>
                        <td className="sr-num">{formatNumber(c.order_count)}</td>
                        <td className="sr-num">{formatCurrency(c.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="sr-table-card">
            <h3 className="sr-card-title">Top Products</h3>
            {loading ? (
              <div className="sr-table-skeleton" />
            ) : sectionErrors.topProducts ? (
              <SectionError onRetry={fetchAllData} />
            ) : topProducts.length === 0 ? (
              <EmptyState message="No product sales in this period." />
            ) : (
              <div className="sr-table-wrap">
                <table className="sr-table">
                  <thead>
                    <tr><th>Product</th><th className="sr-num">Units</th><th className="sr-num">Revenue</th></tr>
                  </thead>
                  <tbody>
                    {topProducts.map(p => (
                      <tr key={p.sku}>
                        <td>{p.name}</td>
                        <td className="sr-num">{formatNumber(p.units_sold)}</td>
                        <td className="sr-num">{formatCurrency(p.sales_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent orders ────────────────────────────────────────────────── */}
        <div className="sr-table-card sr-table-full">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 className="sr-card-title" style={{ margin: 0 }}>
              Recent Orders{statusFilter ? ` — ${statusFilter}` : ''}
            </h3>
            {statusFilter && (
              <button className="sr-btn sr-btn-ghost" onClick={() => setStatusFilter(null)}>Clear filter</button>
            )}
          </div>
          {loading ? (
            <div className="sr-table-skeleton" />
          ) : sectionErrors.recent ? (
            <SectionError onRetry={fetchAllData} />
          ) : recentSales.length === 0 ? (
            <EmptyState message="No recent orders found." />
          ) : (statusFilter ? recentSales.filter(o => o.status === statusFilter) : recentSales).length === 0 ? (
            <EmptyState message={`No orders with status "${statusFilter}".`} />
          ) : (
            <div className="sr-table-wrap">
              <table className="sr-table">
                <thead>
                  <tr>
                    <th>Order #</th><th>Customer</th><th>Date</th>
                    <th className="sr-num">Amount</th><th>Payment</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {(statusFilter ? recentSales.filter(o => o.status === statusFilter) : recentSales).map(o => (
                    <tr key={o.order_id}>
                      <td className="sr-order-id">#{o.order_id}</td>
                      <td>{o.customer_name}</td>
                      <td>{formatDate(o.order_date)}</td>
                      <td className="sr-num">{formatCurrency(o.total_cost)}</td>
                      <td>
                        <span className={`sr-pay-pill sr-pay-${o.payment_status?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`sr-status-pill ${STATUS_CLASS[o.status] || 'sr-status-default'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <button className="sr-view-btn" onClick={() => navigate(`/orders/${o.order_id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ToastContainer position="bottom-right" />
    </AppShell>
  );
}
