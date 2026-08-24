// routes/reports.js
//
// Monthly and Yearly Sales & Inventory Reports. Both endpoints call the same
// services/reportService.js functions with different date bounds -- see that
// file's header comment for the reuse rationale and the documented gap
// around historical inventory snapshots (getInventoryMovement's
// beginningInventory is intentionally null, not fabricated).
//
// Financial figures (revenue, profit, AR) are gated behind requireFinancialScope(),
// the same server-side role check every other analytics route in this app uses --
// a packer must not see currency figures in any response body.

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireFinancialScope } = require('../middleware/analyticsScope');
const rs = require('../services/reportService');

router.get('/monthly', requireFinancialScope(), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // 1-12
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year and month (1-12) are required' });
    }

    const { start, end } = rs.resolveMonthRange(year, month);
    const prev = rs.previousMonthRange(year, month);

    const [
      salesSummary, prevSalesSummary,
      dailySeries,
      productPerformance,
      stockLevelHealth, velocityHealth,
      inventoryMovement,
      arSummary, prevArSummary, outstandingInvoices,
    ] = await Promise.all([
      rs.getSalesSummary(pool, start, end),
      rs.getSalesSummary(pool, prev.start, prev.end),
      rs.getDailySalesSeries(pool, start, end),
      rs.getProductPerformance(pool, start, end),
      rs.getStockLevelHealth(pool),
      rs.getVelocityHealth(pool, Math.round((end - start) / 86400000) + 1),
      rs.getInventoryMovement(pool, start, end),
      rs.getArSummary(pool, start, end),
      rs.getArSummary(pool, prev.start, prev.end),
      rs.getOutstandingInvoices(pool, end),
    ]);

    const salesTrend = rs.trend(salesSummary.totalRevenue, prevSalesSummary.totalRevenue);
    const ordersTrend = rs.trend(salesSummary.totalOrders, prevSalesSummary.totalOrders);
    const unitsTrend = rs.trend(salesSummary.totalUnitsSold, prevSalesSummary.totalUnitsSold);
    const aovTrend = rs.trend(salesSummary.avgOrderValue, prevSalesSummary.avgOrderValue);
    const arTrend = rs.trend(arSummary.outstandingAr, prevArSummary.outstandingAr);

    const topProduct = productPerformance[0] || null;
    const lowStockReport = rs.getLowStockReport(stockLevelHealth.rows);
    const outOfStockCount = stockLevelHealth.counts['Out of Stock'] || 0;
    const lowStockCount = (stockLevelHealth.counts['Reorder Recommended'] || 0) + (stockLevelHealth.counts['Approaching Reorder Point'] || 0);

    const insights = rs.generateMonthlyInsights({
      salesTrend, topProduct, lowStockCount, outOfStockCount, arTrend,
    });

    res.json({
      success: true,
      data: {
        period: { year, month, start: rs.toDateStr(start), end: rs.toDateStr(end) },
        kpis: {
          sales: salesSummary,
          inventory: {
            totalSKUs: stockLevelHealth.rows.length,
            lowStockCount,
            outOfStockCount,
          },
          ar: arSummary,
        },
        salesPerformance: {
          totalRevenue: salesTrend,
          orders: ordersTrend,
          itemsSold: unitsTrend,
          avgOrderValue: aovTrend,
        },
        salesTrendSeries: dailySeries,
        productPerformance,
        inventoryHealth: {
          stockLevel: stockLevelHealth.counts,
          velocity: velocityHealth.counts,
        },
        lowStockReport,
        inventoryMovement,
        accountsReceivable: {
          summary: arSummary,
          trend: arTrend,
          outstandingInvoices,
        },
        insights,
      },
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate monthly report' });
  }
});

router.get('/yearly', requireFinancialScope(), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!Number.isInteger(year)) {
      return res.status(400).json({ success: false, message: 'year is required' });
    }

    const { start, end } = rs.resolveYearRange(year);
    const prevRange = rs.previousYearRange(year);

    const [
      salesSummary, prevSalesSummary,
      monthlySeries, prevMonthlySeries,
      productPerformance,
      stockLevelHealth, velocityHealth,
      inventoryMovement,
      arSummary, prevArSummary, outstandingInvoices,
    ] = await Promise.all([
      rs.getSalesSummary(pool, start, end),
      rs.getSalesSummary(pool, prevRange.start, prevRange.end),
      rs.getMonthlySalesSeries(pool, year),
      rs.getMonthlySalesSeries(pool, year - 1),
      rs.getProductPerformance(pool, start, end),
      rs.getStockLevelHealth(pool),
      rs.getVelocityHealth(pool, 365),
      rs.getInventoryMovement(pool, start, end),
      rs.getArSummary(pool, start, end),
      rs.getArSummary(pool, prevRange.start, prevRange.end),
      rs.getOutstandingInvoices(pool, end),
    ]);

    const salesTrend = rs.trend(salesSummary.totalRevenue, prevSalesSummary.totalRevenue);
    const ordersTrend = rs.trend(salesSummary.totalOrders, prevSalesSummary.totalOrders);
    const unitsTrend = rs.trend(salesSummary.totalUnitsSold, prevSalesSummary.totalUnitsSold);
    const profitTrend = rs.trend(salesSummary.totalProfit, prevSalesSummary.totalProfit);
    const arTrend = rs.trend(arSummary.outstandingAr, prevArSummary.outstandingAr);

    const strongestMonth = monthlySeries.reduce((best, m) => (!best || m.revenue > best.revenue) ? m : best, null);
    const weakestMonth = monthlySeries.filter(m => m.revenue > 0).reduce((worst, m) => (!worst || m.revenue < worst.revenue) ? m : worst, null);
    const topProduct = productPerformance[0] || null;
    const lowStockReport = rs.getLowStockReport(stockLevelHealth.rows);
    const outOfStockCount = stockLevelHealth.counts['Out of Stock'] || 0;
    const lowStockCount = (stockLevelHealth.counts['Reorder Recommended'] || 0) + (stockLevelHealth.counts['Approaching Reorder Point'] || 0);

    const insights = rs.generateMonthlyInsights({
      salesTrend, topProduct, lowStockCount, outOfStockCount, arTrend,
    });
    if (strongestMonth) insights.push(`${strongestMonth.month} was the strongest month, with ₱${strongestMonth.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} in revenue.`);
    if (weakestMonth) insights.push(`${weakestMonth.month} was the weakest month with recorded sales, with ₱${weakestMonth.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} in revenue.`);

    res.json({
      success: true,
      data: {
        period: { year, start: rs.toDateStr(start), end: rs.toDateStr(end) },
        kpis: {
          sales: salesSummary,
          inventory: {
            totalSKUs: stockLevelHealth.rows.length,
            lowStockCount,
            outOfStockCount,
          },
          ar: arSummary,
        },
        annualSummary: {
          totalSales: salesTrend,
          orders: ordersTrend,
          itemsSold: unitsTrend,
          grossProfit: profitTrend,
          outstandingAr: arTrend,
        },
        monthlySalesSeries: monthlySeries,
        previousYearMonthlySalesSeries: prevMonthlySeries,
        productPerformance,
        inventoryHealth: {
          stockLevel: stockLevelHealth.counts,
          velocity: velocityHealth.counts,
        },
        lowStockReport,
        inventoryMovement,
        accountsReceivable: {
          summary: arSummary,
          trend: arTrend,
          outstandingInvoices,
        },
        strongestMonth,
        weakestMonth,
        insights,
      },
    });
  } catch (error) {
    console.error('Error generating yearly report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate yearly report' });
  }
});

module.exports = router;
