import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import * as html2canvasModule from 'html2canvas';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppShell from '../../Components/AppShell';
import EmptyState from '../../Components/EmptyState';
import { TrendChart, BarChart, DonutChart } from '../../Components/Charts';
import api from '../../api';
import usePermissions from '../../hooks/usePermissions';
import './BusinessReport.css';

// html2canvas 1.4.1's UMD build has no __esModule flag, so CRA's webpack
// interop wraps it inconsistently depending on whether it resolves the
// "main" (CJS) or "module" (ESM) build — a `default` import sometimes
// yields the function directly and sometimes yields { default: fn }.
// Resolving both shapes here avoids the runtime
// "html2canvas__WEBPACK_IMPORTED_MODULE___default(...) is not a function" error.
const html2canvas = html2canvasModule.default || html2canvasModule;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat('en-PH');
const formatPeso = (v) => PESO.format(Number(v) || 0);
const formatNum = (v) => NUM.format(Number(v) || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// jsPDF's built-in fonts only support WinAnsi, which lacks ₱ (U+20B1) and
// silently renders it as "±" — see routes/invoices.js formatMoney and the
// same fix already applied to SalesReport.js / InventoryReport.js.
const formatPesoPdf = (v) => `PHP ${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// The insights array comes from the server already formatted with the real ₱
// glyph for on-screen use (services/reportService.js formatPeso) — anything
// free-text like that must be sanitized before it reaches jsPDF too, or the
// same "±" bug reappears despite formatPesoPdf being used everywhere else.
const sanitizePdfText = (s) => String(s ?? '').replace(/₱/g, 'PHP ');

// Snapshot a rendered chart <div> to a JPEG data URL for embedding in the PDF
// and Excel exports. Forces a white background regardless of theme (dark/light)
// since exported business documents are read/printed outside the app's theme.
// JPEG at 0.85 quality instead of PNG: charts are flat-color/line graphics
// with no transparency need, and PNG at scale:2 for 6 charts produced a
// ~16MB PDF — impractical to email. JPEG cuts that by roughly 20x with no
// visible quality loss at typical report viewing/print size.
async function captureChart(ref) {
  if (!ref?.current) return null;
  const canvas = await html2canvas(ref.current, { scale: 1.5, backgroundColor: '#ffffff', logging: false });
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height };
}

const TrendArrow = ({ direction }) => (
  <span className={`br-trend-${direction}`}>
    {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'}
  </span>
);

function KpiCard({ label, value, sub, color }) {
  return (
    <div className={`br-kpi-card${color ? ` br-kpi-${color}` : ''}`}>
      <div className="br-kpi-label">{label}</div>
      <div className="br-kpi-value">{value}</div>
      {sub && <div className="br-kpi-sub">{sub}</div>}
    </div>
  );
}

function SectionCard({ title, children, className = '' }) {
  return (
    <section className={`br-card ${className}`.trim()}>
      {title && <h2 className="br-card-title">{title}</h2>}
      {children}
    </section>
  );
}

export default function BusinessReport() {
  const navigate = useNavigate();
  const { checkPermission } = usePermissions();

  const today = new Date();
  const [reportType, setReportType] = useState('monthly'); // 'monthly' | 'yearly'
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Refs to the on-screen chart containers — captured to PNG at export time
  // (captureChart) so the PDF and Excel exports can embed real graphs instead
  // of duplicating chart-rendering logic in the export code.
  const salesTrendRef = useRef(null);
  const ordersTrendRef = useRef(null);
  const productsChartRef = useRef(null);
  const stockLevelRef = useRef(null);
  const velocityRef = useRef(null);
  const arAgingRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { navigate('/login-employee-pensee'); return; }
    if (!checkPermission('reports')) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = reportType === 'monthly'
        ? `/api/reports/monthly?year=${year}&month=${month}`
        : `/api/reports/yearly?year=${year}`;
      const res = await api.get(url);
      if (res.data.success) {
        setReport(res.data.data);
      } else {
        setError(res.data.message || 'Failed to load report');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [reportType, year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const periodLabel = useMemo(() => {
    if (!report) return '';
    return reportType === 'monthly'
      ? `${MONTH_NAMES[month - 1]} ${year}`
      : `${year} Annual`;
  }, [report, reportType, year, month]);

  // ── chart data shaping ─────────────────────────────────────────────────
  const salesTrendData = useMemo(() => {
    if (!report) return [];
    if (reportType === 'monthly') {
      return (report.salesTrendSeries || []).map(d => ({ date: d.date, revenue: d.revenue }));
    }
    // Yearly: merge current-year and previous-year monthly series for a 2-line chart.
    const cur = report.monthlySalesSeries || [];
    const prev = report.previousYearMonthlySalesSeries || [];
    return cur.map((d, i) => ({
      date: MONTH_NAMES[i]?.slice(0, 3) || d.month,
      revenue: d.revenue,
      prevRevenue: prev[i]?.revenue ?? null,
    }));
  }, [report, reportType]);

  const ordersTrendData = useMemo(() => {
    if (!report || reportType !== 'yearly') return [];
    return (report.monthlySalesSeries || []).map((d, i) => ({
      date: MONTH_NAMES[i]?.slice(0, 3) || d.month,
      orders: d.orders,
    }));
  }, [report, reportType]);

  const topProductsChartData = useMemo(() => {
    if (!report) return [];
    return (report.productPerformance || []).slice(0, 10).map(p => ({ name: p.name, value: p.revenue }));
  }, [report]);

  const stockLevelDonutData = useMemo(() => {
    if (!report) return [];
    const c = report.inventoryHealth?.stockLevel || {};
    return Object.entries(c).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [report]);

  const velocityDonutData = useMemo(() => {
    if (!report) return [];
    const c = report.inventoryHealth?.velocity || {};
    const LABELS = { FAST_MOVING: 'Fast Moving', MODERATE_MOVING: 'Moderate', SLOW_MOVING: 'Slow Moving', DEAD_STOCK: 'Dead Stock' };
    return Object.entries(c).filter(([, v]) => v > 0).map(([name, value]) => ({ name: LABELS[name] || name, value }));
  }, [report]);

  // Outstanding invoices can run into the hundreds — an aging-bucket chart
  // is a more useful management view than a long customer-by-customer list,
  // which is kept as a short "largest balances" table alongside it instead.
  const arAgingData = useMemo(() => {
    if (!report) return [];
    const buckets = { '0-30 days': 0, '31-60 days': 0, '61-90 days': 0, '90+ days': 0 };
    (report.accountsReceivable?.outstandingInvoices || []).forEach(inv => {
      const age = Number(inv.ageDays) || 0;
      const key = age <= 30 ? '0-30 days' : age <= 60 ? '31-60 days' : age <= 90 ? '61-90 days' : '90+ days';
      buckets[key] += Number(inv.amount) || 0;
    });
    return Object.entries(buckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [report]);

  const topOutstandingInvoices = useMemo(() => {
    if (!report) return [];
    return [...(report.accountsReceivable?.outstandingInvoices || [])]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [report]);

  // ── PDF export — tables + embedded chart images (captureChart rasterizes
  // the same on-screen recharts charts so there is only one chart-rendering
  // implementation, not a duplicate one for PDF) ──────────────────────────
  const exportPDF = async () => {
    if (!report || exporting) return;
    setExporting(true);
    try {
      const [salesTrendImg, ordersTrendImg, productsImg, stockLevelImg, velocityImg, arAgingImg] = await Promise.all([
        captureChart(salesTrendRef),
        captureChart(ordersTrendRef),
        captureChart(productsChartRef),
        captureChart(stockLevelRef),
        captureChart(velocityRef),
        captureChart(arAgingRef),
      ]);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const marginX = 14;
      const maxImgWidth = pageWidth - marginX * 2;

      let y = 16;
      const addImage = (img, label) => {
        if (!img) return;
        const w = maxImgWidth;
        const h = w * (img.height / img.width);
        if (y + h > pageHeight - 20) { doc.addPage(); y = 20; }
        if (label) {
          doc.setFontSize(11);
          doc.setTextColor(30);
          doc.text(label, marginX, y);
          y += 6;
        }
        doc.addImage(img.dataUrl, 'JPEG', marginX, y, w, h);
        y += h + 10;
      };
      const ensureRoom = (needed = 20) => {
        if (y + needed > pageHeight - 20) { doc.addPage(); y = 20; }
      };
      const afterTable = () => { y = doc.lastAutoTable.finalY + 8; };

      doc.setFontSize(16);
      doc.text('WrapNTrack', marginX, y); y += 8;
      doc.setFontSize(13);
      doc.text(`${reportType === 'monthly' ? 'Monthly' : 'Annual'} Sales & Inventory Report`, marginX, y); y += 7;
      doc.setFontSize(10);
      doc.text(`Reporting Period: ${periodLabel}`, marginX, y); y += 6;
      doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, marginX, y); y += 8;

      const kpis = report.kpis;
      ensureRoom(60);
      autoTable(doc, {
        startY: y,
        head: [['KPI Overview', 'Value']],
        body: [
          ['Total Sales', formatPesoPdf(kpis.sales.totalRevenue)],
          ['Total Orders', formatNum(kpis.sales.totalOrders)],
          ['Total Items Sold', formatNum(kpis.sales.totalUnitsSold)],
          ['Average Order Value', formatPesoPdf(kpis.sales.avgOrderValue)],
          ['Total SKUs', formatNum(kpis.inventory.totalSKUs)],
          ['Low Stock Items', formatNum(kpis.inventory.lowStockCount)],
          ['Out-of-Stock Items', formatNum(kpis.inventory.outOfStockCount)],
          ['Total Invoiced', formatPesoPdf(kpis.ar.totalInvoiced)],
          ['Total Collected', formatPesoPdf(kpis.ar.totalCollected)],
          ['Outstanding AR', formatPesoPdf(kpis.ar.outstandingAr)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      afterTable();

      const perf = reportType === 'monthly' ? report.salesPerformance : report.annualSummary;
      if (perf) {
        const rows = Object.entries(perf).map(([key, t]) => [
          key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
          typeof t.current === 'number' && Math.abs(t.current) > 1000 ? formatPesoPdf(t.current) : formatNum(t.current),
          typeof t.previous === 'number' && Math.abs(t.previous) > 1000 ? formatPesoPdf(t.previous) : formatNum(t.previous),
          t.deltaPct !== null ? `${t.deltaPct > 0 ? '+' : ''}${t.deltaPct}%` : 'N/A',
        ]);
        ensureRoom(40);
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Current', 'Previous', 'Change']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        afterTable();
      }

      addImage(salesTrendImg, reportType === 'monthly' ? 'Sales Trend (Daily)' : 'Monthly Sales Trend — Year over Year');
      addImage(ordersTrendImg, 'Monthly Order Volume');
      addImage(productsImg, reportType === 'monthly' ? 'Sales by Product' : 'Annual Top Products');

      const products = report.productPerformance || [];
      if (products.length > 0) {
        ensureRoom(30);
        autoTable(doc, {
          startY: y,
          head: [['Rank', 'Product', 'SKU', 'Units Sold', 'Revenue', '% of Sales']],
          body: products.slice(0, 20).map(p => [p.rank, p.name, p.sku, formatNum(p.unitsSold), formatPesoPdf(p.revenue), `${p.pctOfSales}%`]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        afterTable();
      }

      const movement = report.inventoryMovement;
      if (movement) {
        ensureRoom(30);
        autoTable(doc, {
          startY: y,
          head: [['Inventory Movement', 'Value']],
          body: [
            ['Beginning Inventory', movement.beginningInventoryNote || 'N/A'],
            ['Stock Received', formatNum(movement.stockReceived)],
            ['Stock Sold', formatNum(movement.stockSold)],
            ['Manual Adjustments', formatNum(movement.adjustments)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        afterTable();
      }

      addImage(stockLevelImg, 'Inventory Status — by Stock Level');
      addImage(velocityImg, 'Inventory Status — by Movement Velocity');

      const lowStock = report.lowStockReport || [];
      if (lowStock.length > 0) {
        ensureRoom(30);
        autoTable(doc, {
          startY: y,
          head: [['SKU', 'Product', 'Current Stock', 'Reorder Level', 'Suggested Action', 'Status']],
          body: lowStock.map(r => [r.sku, r.name, formatNum(r.currentStock), formatNum(r.reorderLevel), r.suggestedAction, r.status]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        afterTable();
      }

      const ar = report.accountsReceivable;
      if (ar) {
        ensureRoom(30);
        autoTable(doc, {
          startY: y,
          head: [['AR Summary', 'Amount']],
          body: [
            ['Total Invoiced', formatPesoPdf(ar.summary.totalInvoiced)],
            ['Total Collected', formatPesoPdf(ar.summary.totalCollected)],
            ['Outstanding AR', formatPesoPdf(ar.summary.outstandingAr)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        afterTable();

        addImage(arAgingImg, 'Outstanding AR — by Age');

        if (topOutstandingInvoices.length > 0) {
          ensureRoom(30);
          autoTable(doc, {
            startY: y,
            head: [['Customer', 'Invoice', 'Amount', 'Issued', 'Age (days)']],
            body: topOutstandingInvoices.map(inv => [
              inv.customerName, inv.invoiceNumber, formatPesoPdf(inv.amount), formatDate(inv.issuedAt), inv.ageDays,
            ]),
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
          });
          afterTable();
        }
      }

      if (report.insights?.length > 0) {
        ensureRoom(30);
        autoTable(doc, {
          startY: y,
          head: [['Management Insights']],
          body: report.insights.map(i => [sanitizePdfText(i)]),
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
        });
        afterTable();
      }

      // Page numbers + footer on every page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`WrapNTrack — ${periodLabel}`, marginX, pageHeight - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 8);
      }

      doc.save(`wrapntrack-${reportType}-report-${reportType === 'monthly' ? `${year}-${String(month).padStart(2, '0')}` : year}.pdf`);
      toast.success('PDF report exported');
    } catch (e) {
      toast.error('PDF export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Excel export — exceljs, not the community `xlsx` package: xlsx's free
  // build has no cell-styling API at all (no colors/fonts/fills possible),
  // which is exactly what was broken/plain before. exceljs supports styling,
  // number formats, freeze panes, autofilter, and image embedding natively. ─
  const BRAND_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  const GREEN_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
  const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
  const STATUS_FILL = {
    Critical: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } },
    Low: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
    Approaching: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } },
  };

  function styleHeader(row, fill = BRAND_FILL) {
    row.eachCell(cell => {
      cell.font = HEADER_FONT;
      cell.fill = fill;
      cell.alignment = { vertical: 'middle' };
    });
    row.height = 20;
  }

  function addTableSheet(wb, name, headers, rows, { currencyCols = [], percentCols = [], widths, headerFill } = {}) {
    const ws = wb.addWorksheet(name);
    ws.addRow(headers);
    styleHeader(ws.getRow(1), headerFill);
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    rows.forEach(r => ws.addRow(r));
    ws.columns.forEach((col, i) => { col.width = widths?.[i] || 16; });
    currencyCols.forEach(i => { ws.getColumn(i + 1).numFmt = '"₱"#,##0.00'; });
    percentCols.forEach(i => { ws.getColumn(i + 1).numFmt = '0.00"%"'; });
    if (headers.length > 1 && rows.length > 0) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    }
    return ws;
  }

  function addImageToSheet(wb, ws, img, { row = 0, width = 560, height } = {}) {
    if (!img) return row;
    const h = height || width * (img.height / img.width);
    const imageId = wb.addImage({ base64: img.dataUrl, extension: 'jpeg' });
    ws.addImage(imageId, { tl: { col: 0, row }, ext: { width, height: h } });
    return row + Math.ceil(h / 20) + 2; // approx row height, + spacing
  }

  const exportExcel = async () => {
    if (!report || exporting) return;
    setExporting(true);
    try {
      const [salesTrendImg, ordersTrendImg, productsImg, stockLevelImg, velocityImg, arAgingImg] = await Promise.all([
        captureChart(salesTrendRef),
        captureChart(ordersTrendRef),
        captureChart(productsChartRef),
        captureChart(stockLevelRef),
        captureChart(velocityRef),
        captureChart(arAgingRef),
      ]);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'WrapNTrack';
      wb.created = new Date();
      const kpis = report.kpis;

      // ── Summary ──────────────────────────────────────────────────────
      const summaryWs = wb.addWorksheet('Summary');
      summaryWs.columns = [{ width: 26 }, { width: 22 }];
      summaryWs.addRow(['WrapNTrack', reportType === 'monthly' ? 'Monthly Sales & Inventory Report' : 'Annual Sales & Inventory Report']);
      summaryWs.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF3B82F6' } };
      summaryWs.addRow(['Reporting Period', periodLabel]);
      summaryWs.addRow(['Generated', new Date().toLocaleString('en-PH')]);
      summaryWs.addRow([]);

      const addKpiBlock = (title, entries) => {
        const r = summaryWs.addRow([title, '']);
        r.font = { bold: true };
        r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
        entries.forEach(([label, value, isCurrency]) => {
          const row = summaryWs.addRow([label, value]);
          if (isCurrency) row.getCell(2).numFmt = '"₱"#,##0.00';
        });
        summaryWs.addRow([]);
      };
      addKpiBlock('Sales KPIs', [
        ['Total Sales', kpis.sales.totalRevenue, true],
        ['Total Orders', kpis.sales.totalOrders],
        ['Total Items Sold', kpis.sales.totalUnitsSold],
        ['Average Order Value', kpis.sales.avgOrderValue, true],
        ['Total Profit', kpis.sales.totalProfit, true],
        ['Completed Orders', kpis.sales.completedOrders],
        ['Pending Orders', kpis.sales.pendingOrders],
        ['Cancelled Orders', kpis.sales.cancelledOrders],
      ]);
      addKpiBlock('Inventory KPIs', [
        ['Total SKUs', kpis.inventory.totalSKUs],
        ['Low Stock Items', kpis.inventory.lowStockCount],
        ['Out of Stock Items', kpis.inventory.outOfStockCount],
      ]);
      addKpiBlock('Financial / Receivables', [
        ['Total Invoiced', kpis.ar.totalInvoiced, true],
        ['Total Collected', kpis.ar.totalCollected, true],
        ['Outstanding AR', kpis.ar.outstandingAr, true],
      ]);

      if (report.insights?.length > 0) {
        const insightsHeaderRow = summaryWs.addRow(['Management Insights', '']);
        insightsHeaderRow.font = { bold: true };
        insightsHeaderRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; });
        report.insights.forEach(i => summaryWs.addRow([i]).getCell(1).alignment = { wrapText: true });
      }

      // ── Sales Analysis ───────────────────────────────────────────────
      const perf = reportType === 'monthly' ? report.salesPerformance : report.annualSummary;
      const perfRows = Object.entries(perf || {}).map(([key, t]) => [
        key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), t.current, t.previous, t.delta, t.deltaPct,
      ]);
      addTableSheet(wb, 'Sales Analysis', ['Metric', 'Current', 'Previous', 'Change', 'Change %'], perfRows, {
        currencyCols: [1, 2, 3], percentCols: [4], widths: [22, 16, 16, 16, 12],
      });

      // ── Monthly / Daily Sales (+ trend chart images) ─────────────────
      const trendSheetName = reportType === 'monthly' ? 'Daily Sales' : 'Monthly Sales';
      const trendRows = reportType === 'monthly'
        ? (report.salesTrendSeries || []).map(d => [d.date, d.revenue])
        : (report.monthlySalesSeries || []).map(d => [d.month, d.revenue, d.orders, d.completedOrders]);
      const trendHeaders = reportType === 'monthly' ? ['Date', 'Revenue'] : ['Month', 'Revenue', 'Orders', 'Completed Orders'];
      const trendWs = addTableSheet(wb, trendSheetName, trendHeaders, trendRows, { currencyCols: [1] });
      let chartRow = trendRows.length + 3;
      chartRow = addImageToSheet(wb, trendWs, salesTrendImg, { row: chartRow });
      addImageToSheet(wb, trendWs, ordersTrendImg, { row: chartRow });

      // ── Product Performance (+ chart) ────────────────────────────────
      const prodRows = (report.productPerformance || []).map(p => [p.rank, p.name, p.sku, p.category, p.unitsSold, p.revenue, p.grossProfit, p.pctOfSales]);
      const prodWs = addTableSheet(wb, 'Product Performance',
        ['Rank', 'Product', 'SKU', 'Category', 'Units Sold', 'Revenue', 'Gross Profit', '% of Sales'],
        prodRows, { currencyCols: [5, 6], percentCols: [7], widths: [6, 26, 18, 16, 12, 14, 14, 12] });
      addImageToSheet(wb, prodWs, productsImg, { row: prodRows.length + 3 });

      // ── Inventory Summary (+ health charts) ──────────────────────────
      const movement = report.inventoryMovement || {};
      const invWs = wb.addWorksheet('Inventory Summary');
      invWs.columns = [{ width: 26 }, { width: 20 }];
      invWs.addRow(['Inventory Metric', 'Value']);
      styleHeader(invWs.getRow(1));
      invWs.addRow(['Beginning Inventory', movement.beginningInventoryNote || 'N/A']);
      invWs.addRow(['Stock Received', movement.stockReceived]);
      invWs.addRow(['Stock Sold', movement.stockSold]);
      invWs.addRow(['Manual Adjustments', movement.adjustments]);
      invWs.addRow([]);
      const stockLevelHeaderRow = invWs.addRow(['Stock Level Health', 'Count']);
      stockLevelHeaderRow.font = { bold: true };
      Object.entries(report.inventoryHealth?.stockLevel || {}).forEach(([k, v]) => invWs.addRow([k, v]));
      invWs.addRow([]);
      const velocityHeaderRow = invWs.addRow(['Movement Velocity Health', 'Count']);
      velocityHeaderRow.font = { bold: true };
      Object.entries(report.inventoryHealth?.velocity || {}).forEach(([k, v]) => invWs.addRow([k, v]));
      let invChartRow = invWs.rowCount + 2;
      invChartRow = addImageToSheet(wb, invWs, stockLevelImg, { row: invChartRow, width: 400 });
      addImageToSheet(wb, invWs, velocityImg, { row: invChartRow, width: 400 });

      // ── Inventory Movement (per-product) ─────────────────────────────
      addTableSheet(wb, 'Inventory Movement',
        ['SKU', 'Product', 'Current Stock', 'Units Sold', 'Manual Stock In', 'Manual Stock Out'],
        (movement.byProduct || []).map(p => [p.sku, p.name, p.currentStock, p.unitsSold, p.manualStockIn, p.manualStockOut]),
        { widths: [18, 26, 14, 12, 14, 14] });

      // ── Low Stock (status-highlighted) ───────────────────────────────
      const lowStockWs = addTableSheet(wb, 'Low Stock',
        ['SKU', 'Product', 'Current Stock', 'Reorder Level', 'Suggested Action', 'Status'],
        (report.lowStockReport || []).map(r => [r.sku, r.name, r.currentStock, r.reorderLevel, r.suggestedAction, r.status]),
        { widths: [18, 24, 12, 12, 30, 12] });
      (report.lowStockReport || []).forEach((r, i) => {
        const fill = STATUS_FILL[r.status];
        if (fill) lowStockWs.getRow(i + 2).getCell(6).fill = fill;
      });

      // ── Accounts Receivable (+ aging chart, top-10 table only) ───────
      const arWs = wb.addWorksheet('Accounts Receivable');
      arWs.columns = [{ width: 22 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 12 }];
      arWs.addRow(['AR Summary', 'Amount']);
      styleHeader(arWs.getRow(1), GREEN_FILL);
      arWs.addRow(['Total Invoiced', report.accountsReceivable?.summary?.totalInvoiced]).getCell(2).numFmt = '"₱"#,##0.00';
      arWs.addRow(['Total Collected', report.accountsReceivable?.summary?.totalCollected]).getCell(2).numFmt = '"₱"#,##0.00';
      arWs.addRow(['Outstanding AR', report.accountsReceivable?.summary?.outstandingAr]).getCell(2).numFmt = '"₱"#,##0.00';
      arWs.addRow([]);
      addImageToSheet(wb, arWs, arAgingImg, { row: arWs.rowCount, width: 480 });
      const arTableHeaderRow = arWs.addRow(['Customer (Top 10 by Amount)', 'Invoice', 'Amount', 'Issued', 'Age (days)']);
      styleHeader(arTableHeaderRow);
      topOutstandingInvoices.forEach(inv => {
        const row = arWs.addRow([inv.customerName, inv.invoiceNumber, inv.amount, formatDate(inv.issuedAt), inv.ageDays]);
        row.getCell(3).numFmt = '"₱"#,##0.00';
        if (inv.ageDays > 90) row.getCell(5).fill = STATUS_FILL.Critical;
        else if (inv.ageDays > 60) row.getCell(5).fill = STATUS_FILL.Low;
      });

      // ── Data — raw rows for further analysis ─────────────────────────
      addTableSheet(wb, 'Data',
        ['SKU', 'Name', 'Category', 'Units Sold', 'Revenue', 'Gross Profit', 'Lines Missing Cost'],
        (report.productPerformance || []).map(p => [p.sku, p.name, p.category, p.unitsSold, p.revenue, p.grossProfit, p.linesMissingCost]),
        { currencyCols: [4, 5], widths: [18, 26, 16, 12, 14, 14, 16] });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wrapntrack-${reportType}-report-${reportType === 'monthly' ? `${year}-${String(month).padStart(2, '0')}` : year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      toast.success('Excel report exported');
    } catch (e) {
      toast.error('Excel export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const kpis = report?.kpis;

  return (
    <AppShell searchPlaceholder="Search reports..." contentClassName="br-page-content" showSearch={false}>
      <div className="br-content">
        <div className="br-header">
          <div>
            <h1 className="ui-page-title">Sales & Inventory Reports</h1>
            <p className="br-subtitle">Management reporting for WrapNTrack</p>
          </div>
        </div>

        <div className="br-filters ui-card">
          <div className="br-filter-group">
            <label>Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {reportType === 'monthly' && (
            <div className="br-filter-group">
              <label>Month</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
          <div className="br-filter-group">
            <label>Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="br-filter-actions">
            <button className="br-btn br-btn-ghost" onClick={fetchReport} disabled={loading}>
              {loading ? 'Loading…' : 'Generate Report'}
            </button>
            <button className="br-btn br-btn-ghost" onClick={exportExcel} disabled={!report || exporting}>
              {exporting ? 'Exporting…' : '↓ Excel'}
            </button>
            <button className="br-btn br-btn-ghost" onClick={exportPDF} disabled={!report || exporting}>
              {exporting ? 'Exporting…' : '↓ PDF'}
            </button>
          </div>
        </div>

        {error && (
          <SectionCard>
            <EmptyState icon="⚠️" title="Report failed to load" message={error} action={
              <button className="br-btn br-btn-ghost" onClick={fetchReport}>Retry</button>
            } />
          </SectionCard>
        )}

        {loading && !report && (
          <SectionCard><div className="br-skeleton" style={{ height: 300 }} /></SectionCard>
        )}

        {report && !error && (
          <>
            {/* ── Section 1: Header ─────────────────────────────────────── */}
            <div className="br-report-header">
              <div className="br-report-brand">WrapNTrack</div>
              <div className="br-report-title">
                {reportType === 'monthly' ? 'Monthly' : 'Annual'} Sales &amp; Inventory Report
              </div>
              <div className="br-report-meta">
                Reporting Period: {periodLabel} · Generated: {new Date().toLocaleString('en-PH')}
              </div>
            </div>

            {/* ── Section 2: KPI Overview ───────────────────────────────── */}
            <SectionCard title="Executive Summary">
              <div className="br-kpi-grid">
                <KpiCard label="Total Sales" value={formatPeso(kpis.sales.totalRevenue)} color="brand" />
                <KpiCard label="Total Orders" value={formatNum(kpis.sales.totalOrders)} color="blue" />
                <KpiCard label="Total Items Sold" value={formatNum(kpis.sales.totalUnitsSold)} color="green" />
                <KpiCard label="Avg Order Value" value={formatPeso(kpis.sales.avgOrderValue)} color="brand" />
                <KpiCard label="Total SKUs" value={formatNum(kpis.inventory.totalSKUs)} color="blue" />
                <KpiCard label="Low Stock Items" value={formatNum(kpis.inventory.lowStockCount)} color="orange" />
                <KpiCard label="Out-of-Stock Items" value={formatNum(kpis.inventory.outOfStockCount)} color="red" />
                <KpiCard label="Total Invoiced" value={formatPeso(kpis.ar.totalInvoiced)} color="blue" />
                <KpiCard label="Total Collected" value={formatPeso(kpis.ar.totalCollected)} color="green" />
                <KpiCard label="Outstanding AR" value={formatPeso(kpis.ar.outstandingAr)} color="red" />
              </div>
              {kpis.sales.marginCoverage.linesMissingCost > 0 && (
                <p className="br-note">
                  Profit figures exclude {kpis.sales.marginCoverage.linesMissingCost} of {kpis.sales.marginCoverage.lineCount} order lines with unknown cost (not assumed to be zero-cost).
                </p>
              )}
            </SectionCard>

            {/* ── Section 3: Sales Performance ──────────────────────────── */}
            <SectionCard title={reportType === 'monthly' ? 'Sales Performance vs. Previous Month' : 'Annual Performance vs. Previous Year'}>
              <div className="br-table-wrap">
                <table className="br-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="br-num">{reportType === 'monthly' ? 'Current Month' : 'Current Year'}</th>
                      <th className="br-num">{reportType === 'monthly' ? 'Previous Month' : 'Previous Year'}</th>
                      <th className="br-num">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries((reportType === 'monthly' ? report.salesPerformance : report.annualSummary) || {}).map(([key, t]) => {
                      const isCurrency = Math.abs(t.current) > 10000 || Math.abs(t.previous) > 10000;
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                      return (
                        <tr key={key}>
                          <td>{label}</td>
                          <td className="br-num">{isCurrency ? formatPeso(t.current) : formatNum(t.current)}</td>
                          <td className="br-num">{isCurrency ? formatPeso(t.previous) : formatNum(t.previous)}</td>
                          <td className={`br-num br-trend-${t.direction}`}>
                            <TrendArrow direction={t.direction} /> {t.deltaPct !== null ? `${t.deltaPct > 0 ? '+' : ''}${t.deltaPct}%` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* ── Section 4: Sales Trend ─────────────────────────────────── */}
            <SectionCard title={reportType === 'monthly' ? 'Sales Trend (Daily)' : 'Monthly Sales Trend — Year over Year'}>
              {salesTrendData.length === 0 ? (
                <EmptyState message="No sales data for this period." />
              ) : (
                <div ref={salesTrendRef}>
                  <TrendChart
                    data={salesTrendData}
                    leftKey="revenue"
                    rightKey={reportType === 'yearly' ? 'prevRevenue' : undefined}
                    leftLabel={reportType === 'yearly' ? `${year} Revenue` : 'Revenue'}
                    rightLabel={reportType === 'yearly' ? `${year - 1} Revenue` : undefined}
                    leftCurrency
                    rightCurrency
                    sameAxis={reportType === 'yearly'}
                    height={280}
                    ariaLabel="Sales revenue trend"
                  />
                </div>
              )}
            </SectionCard>

            {reportType === 'yearly' && ordersTrendData.length > 0 && (
              <SectionCard title="Monthly Order Volume">
                <div ref={ordersTrendRef}>
                  <TrendChart data={ordersTrendData} leftKey="orders" leftLabel="Orders" height={220} ariaLabel="Monthly order volume" />
                </div>
              </SectionCard>
            )}

            {/* ── Section 5: Sales by Product ────────────────────────────── */}
            <SectionCard title={reportType === 'monthly' ? 'Sales by Product' : 'Annual Top Products'}>
              {topProductsChartData.length === 0 ? (
                <EmptyState message="No product sales in this period." />
              ) : (
                <div ref={productsChartRef}>
                  <BarChart
                    data={topProductsChartData}
                    dataKey="value"
                    nameKey="name"
                    layout="horizontal"
                    isCurrency
                    height={Math.max(200, topProductsChartData.length * 32)}
                    ariaLabel="Top products by revenue"
                  />
                </div>
              )}
              <div className="br-table-wrap" style={{ marginTop: 16 }}>
                <table className="br-table">
                  <thead>
                    <tr>
                      <th>Rank</th><th>Product</th><th>SKU</th>
                      <th className="br-num">Units Sold</th><th className="br-num">Revenue</th><th className="br-num">% of Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.productPerformance || []).slice(0, 50).map(p => (
                      <tr key={p.sku}>
                        <td>{p.rank}</td>
                        <td>{p.name}</td>
                        <td className="br-sku">{p.sku}</td>
                        <td className="br-num">{formatNum(p.unitsSold)}</td>
                        <td className="br-num">{formatPeso(p.revenue)}</td>
                        <td className="br-num">{p.pctOfSales}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* ── Section 6/9: Inventory Movement ────────────────────────── */}
            <SectionCard title="Inventory Movement">
              <p className="br-note">
                {report.inventoryMovement.beginningInventoryNote}
              </p>
              <div className="br-strip">
                <div className="br-strip-tile">
                  <span className="br-strip-label">Stock Received</span>
                  <span className="br-strip-value">{formatNum(report.inventoryMovement.stockReceived)}</span>
                </div>
                <div className="br-strip-tile">
                  <span className="br-strip-label">Stock Sold</span>
                  <span className="br-strip-value">{formatNum(report.inventoryMovement.stockSold)}</span>
                </div>
                <div className="br-strip-tile">
                  <span className="br-strip-label">Manual Adjustments</span>
                  <span className="br-strip-value">{formatNum(report.inventoryMovement.adjustments)}</span>
                </div>
              </div>
              <div className="br-table-wrap" style={{ marginTop: 16 }}>
                <table className="br-table">
                  <thead>
                    <tr><th>Product</th><th className="br-num">Units Sold</th><th className="br-num">Manual Stock In</th><th className="br-num">Manual Stock Out</th><th className="br-num">Current Stock</th></tr>
                  </thead>
                  <tbody>
                    {(report.inventoryMovement.byProduct || []).slice(0, 50).map(p => (
                      <tr key={p.sku}>
                        <td>{p.name}</td>
                        <td className="br-num">{formatNum(p.unitsSold)}</td>
                        <td className="br-num">{formatNum(p.manualStockIn)}</td>
                        <td className="br-num">{formatNum(p.manualStockOut)}</td>
                        <td className="br-num">{p.currentStock !== null ? formatNum(p.currentStock) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* ── Section 7: Inventory Status ─────────────────────────────── */}
            <SectionCard title="Inventory Status">
              <div className="br-row-2col">
                <div>
                  <h3 className="br-subhead">By Stock Level</h3>
                  {stockLevelDonutData.length === 0 ? <EmptyState message="No inventory data." /> : (
                    <div ref={stockLevelRef}>
                      <DonutChart data={stockLevelDonutData} height={240} ariaLabel="Inventory by stock level" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="br-subhead">By Movement Velocity</h3>
                  {velocityDonutData.length === 0 ? <EmptyState message="No movement data." /> : (
                    <div ref={velocityRef}>
                      <DonutChart data={velocityDonutData} height={240} ariaLabel="Inventory by movement velocity" />
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* ── Section 8: Low Stock / Reorder Report ─────────────────────── */}
            <SectionCard title="Low Stock / Reorder Report">
              {(report.lowStockReport || []).length === 0 ? (
                <EmptyState message="No products currently need reordering." />
              ) : (
                <div className="br-table-wrap">
                  <table className="br-table">
                    <thead>
                      <tr><th>SKU</th><th>Product</th><th className="br-num">Current Stock</th><th className="br-num">Reorder Level</th><th>Suggested Action</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {report.lowStockReport.map(r => (
                        <tr key={r.sku}>
                          <td className="br-sku">{r.sku}</td>
                          <td>{r.name}</td>
                          <td className="br-num">{formatNum(r.currentStock)}</td>
                          <td className="br-num">{formatNum(r.reorderLevel)}</td>
                          <td>{r.suggestedAction}</td>
                          <td><span className={`br-status-pill br-status-${r.status.toLowerCase()}`}>{r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* ── Section 10: Accounts Receivable ───────────────────────────── */}
            <SectionCard title="Accounts Receivable">
              <div className="br-strip">
                <div className="br-strip-tile">
                  <span className="br-strip-label">Total Invoiced</span>
                  <span className="br-strip-value">{formatPeso(report.accountsReceivable.summary.totalInvoiced)}</span>
                </div>
                <div className="br-strip-tile">
                  <span className="br-strip-label">Total Collected</span>
                  <span className="br-strip-value">{formatPeso(report.accountsReceivable.summary.totalCollected)}</span>
                </div>
                <div className="br-strip-tile">
                  <span className="br-strip-label">Outstanding AR</span>
                  <span className="br-strip-value br-strip-red">{formatPeso(report.accountsReceivable.summary.outstandingAr)}</span>
                </div>
              </div>
              {arAgingData.length === 0 ? (
                <EmptyState message="No outstanding invoices." />
              ) : (
                <>
                  <div ref={arAgingRef} style={{ marginTop: 16 }}>
                    <BarChart
                      data={arAgingData}
                      dataKey="value"
                      nameKey="name"
                      layout="horizontal"
                      isCurrency
                      height={160}
                      ariaLabel="Outstanding accounts receivable by age"
                    />
                  </div>
                  <h3 className="br-subhead" style={{ textAlign: 'left', marginTop: 20 }}>
                    Largest Outstanding Balances (Top 10 of {report.accountsReceivable.outstandingInvoices.length})
                  </h3>
                  <div className="br-table-wrap">
                    <table className="br-table">
                      <thead>
                        <tr><th>Customer</th><th>Invoice</th><th className="br-num">Amount</th><th>Issued</th><th className="br-num">Age (days)</th></tr>
                      </thead>
                      <tbody>
                        {topOutstandingInvoices.map(inv => (
                          <tr key={inv.invoiceNumber}>
                            <td>{inv.customerName}</td>
                            <td className="br-sku">{inv.invoiceNumber}</td>
                            <td className="br-num">{formatPeso(inv.amount)}</td>
                            <td>{formatDate(inv.issuedAt)}</td>
                            <td className="br-num">{inv.ageDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </SectionCard>

            {/* ── Section 11: Management Insights ───────────────────────────── */}
            <SectionCard title="Management Insights" className="br-card-last">
              {(report.insights || []).length === 0 ? (
                <EmptyState message="No notable trends this period." />
              ) : (
                <ul className="br-insights-list">
                  {report.insights.map((insight, i) => <li key={i}>{insight}</li>)}
                </ul>
              )}
            </SectionCard>
          </>
        )}
      </div>
      <ToastContainer position="bottom-right" />
    </AppShell>
  );
}
