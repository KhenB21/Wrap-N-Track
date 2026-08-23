// Shared utilities for all chart wrappers.
// Charts read colours from CSS custom properties so light/dark theming is free.

export function getCssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

export function getChartColors() {
  return {
    brand:      getCssVar('--brand')          || '#6366f1',
    brandSoft:  getCssVar('--brand-soft')     || '#e0e7ff',
    success:    getCssVar('--success')        || '#22c55e',
    warning:    getCssVar('--warning')        || '#f59e0b',
    danger:     getCssVar('--danger')         || '#ef4444',
    text:       getCssVar('--text')           || '#0f172a',
    textMuted:  getCssVar('--text-muted')     || '#94a3b8',
    border:     getCssVar('--border')         || '#e2e8f0',
    surface:    getCssVar('--surface')        || '#ffffff',
    palette: [
      getCssVar('--chart-1') || '#3b82f6',
      getCssVar('--chart-2') || '#059669',
      getCssVar('--chart-3') || '#b45309',
      getCssVar('--chart-4') || '#ef4444',
      getCssVar('--chart-5') || '#7c3aed',
      getCssVar('--chart-6') || '#0e7490',
      getCssVar('--chart-7') || '#c2410c',
      getCssVar('--chart-8') || '#4d7c0f',
    ],
  };
}

export const PESO_FORMATTER = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
export const NUMBER_FORMATTER = new Intl.NumberFormat('en-PH');

export function formatPeso(v) { return PESO_FORMATTER.format(v ?? 0); }
export function formatNum(v)  { return NUMBER_FORMATTER.format(v ?? 0); }
