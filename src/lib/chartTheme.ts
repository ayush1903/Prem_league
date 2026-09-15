// Shared light/dark palette for the raw-SVG chart internals (Recharts
// doesn't pick up Tailwind's `dark:` classes on inline SVG attributes), kept
// in step with the gray-100/gray-900 card + gray-600/gray-400 text
// convention used everywhere else in the app.
export type ChartPalette = {
  grid: string
  axisLine: string
  tick: string
  axisLabel: string
  pointLabel: string
  dimmedDot: string
  referenceLine: string
  labelBg: string
  labelBgStroke: string
}

const LIGHT: ChartPalette = {
  grid: '#f3f4f6',
  axisLine: '#e5e7eb',
  tick: '#9ca3af',
  axisLabel: '#6b7280',
  pointLabel: '#374151',
  dimmedDot: '#d1d5db',
  referenceLine: '#9ca3af',
  labelBg: '#ffffff',
  labelBgStroke: '#e5e7eb',
}

const DARK: ChartPalette = {
  grid: '#1f2937',
  axisLine: '#374151',
  tick: '#6b7280',
  axisLabel: '#9ca3af',
  pointLabel: '#e5e7eb',
  dimmedDot: '#4b5563',
  referenceLine: '#6b7280',
  labelBg: '#111827',
  labelBgStroke: '#374151',
}

export function getChartPalette(isDark: boolean): ChartPalette {
  return isDark ? DARK : LIGHT
}

// A fixed dark chip regardless of page theme (a common, simple convention
// for chart tooltips — an overlay, not page content).
export const TOOLTIP_BG = '#111827'
export const TOOLTIP_TEXT = '#f9fafb'
export const TOOLTIP_MUTED = '#9ca3af'
