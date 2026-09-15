import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { getBadgeColor } from '../lib/clubColors'
import { useIsDarkMode } from '../lib/theme'
import { getChartPalette, TOOLTIP_BG, TOOLTIP_TEXT, TOOLTIP_MUTED, type ChartPalette } from '../lib/chartTheme'

export type SpendPoint = {
  shortName: string
  name: string
  netSpendM: number
  points: number
}

type ShapeProps = {
  cx?: number
  cy?: number
  payload?: SpendPoint
}

type Props = {
  points: SpendPoint[]
  slope: number
  intercept: number
  // short_name to emphasize (larger, club-colored, labeled) — every other
  // point renders dimmed. Omit for the league-wide view on /clubs.
  highlightClub?: string
  // short_names to always label even without a highlight (e.g. the
  // overperformer/underperformer) — everything else is identified by
  // hovering instead of a permanent label, since labeling all 20 clubs
  // makes crowded clusters unreadable.
  labeledClubs?: string[]
  height?: number
}

// A background halo behind a label so it stays legible over the grid,
// other dots, or a card's own background — width is a rough character-count
// estimate (no canvas measurement available here), generous enough to never
// clip.
function LabelWithHalo({
  x,
  y,
  text,
  bold,
  palette,
}: {
  x: number
  y: number
  text: string
  bold: boolean
  palette: ChartPalette
}) {
  const fontSize = bold ? 10 : 9
  const width = text.length * (fontSize * 0.64) + 8
  return (
    <g>
      <rect
        x={x - 3}
        y={y - fontSize - 1}
        width={width}
        height={fontSize + 6}
        rx={3}
        fill={palette.labelBg}
        stroke={palette.labelBgStroke}
        strokeWidth={0.75}
        opacity={0.92}
      />
      <text x={x} y={y} fontSize={fontSize} fontWeight={bold ? 600 : 500} fill={palette.pointLabel}>
        {text}
      </text>
    </g>
  )
}

// Dots and labels are two separate Scatter layers (see below) rather than
// one <g> per point, specifically so every label paints above every dot —
// with a single layer, whichever point happened to come later in the data
// array could render its dot on top of an earlier point's label whenever
// two clubs' spend/points were close enough to sit near each other (e.g.
// Man City and Arsenal only £11.2m apart), clipping the label text.
function renderDot(props: ShapeProps, highlightClub: string | undefined, palette: ChartPalette) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || !payload) return <g />

  const isHighlighted = Boolean(highlightClub) && payload.shortName.toUpperCase() === highlightClub!.toUpperCase()
  const dimmed = Boolean(highlightClub) && !isHighlighted
  const color = dimmed ? palette.dimmedDot : getBadgeColor(payload.shortName)
  const radius = isHighlighted ? 8 : dimmed ? 3.5 : 6

  return (
    <circle
      key={payload.shortName}
      cx={cx}
      cy={cy}
      r={radius}
      fill={color}
      stroke={isHighlighted ? '#fff' : 'none'}
      strokeWidth={isHighlighted ? 2 : 0}
    />
  )
}

function renderLabel(
  props: ShapeProps,
  highlightClub: string | undefined,
  labeledClubs: Set<string>,
  palette: ChartPalette,
) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || !payload) return <g />

  const isHighlighted = Boolean(highlightClub) && payload.shortName.toUpperCase() === highlightClub!.toUpperCase()
  const showLabel = isHighlighted || (!highlightClub && labeledClubs.has(payload.shortName.toUpperCase()))
  if (!showLabel) return <g key={payload.shortName} />

  const radius = isHighlighted ? 8 : 6
  return (
    <LabelWithHalo
      key={payload.shortName}
      x={cx + radius + 4}
      y={cy + 3}
      text={payload.shortName}
      bold={isHighlighted}
      palette={palette}
    />
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: SpendPoint }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload

  return (
    <div style={{ background: TOOLTIP_BG, color: TOOLTIP_TEXT, borderRadius: 6, padding: '6px 9px', fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 600 }}>{point.name}</div>
      <div style={{ color: TOOLTIP_MUTED }}>
        Net spend: £{point.netSpendM.toFixed(1)}m · {point.points} pts
      </div>
    </div>
  )
}

// Spend vs. performance: net transfer spend (x) against league points (y),
// with the league's OLS trend line. Shared between the full league-wide
// chart on /clubs (no highlightClub) and the mini per-club chart on
// /club/:slug (highlightClub set to that club's short_name).
function SpendPerformanceChart({ points, slope, intercept, highlightClub, labeledClubs, height = 320 }: Props) {
  const isDark = useIsDarkMode()
  const palette = getChartPalette(isDark)
  const isMini = height < 260
  const labeledSet = new Set((labeledClubs ?? []).map((c) => c.toUpperCase()))

  const xs = points.map((p) => p.netSpendM)
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 0)
  const trendLine = [
    { netSpendM: minX, points: intercept + slope * minX },
    { netSpendM: maxX, points: intercept + slope * maxX },
  ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: isMini ? 8 : 16, bottom: isMini ? 4 : 24, left: isMini ? 4 : 8 }}>
        <CartesianGrid stroke={palette.grid} />
        <XAxis
          type="number"
          dataKey="netSpendM"
          name="Net spend"
          tick={!isMini ? { fontSize: 10, fill: palette.tick } : false}
          axisLine={{ stroke: palette.axisLine }}
          tickLine={false}
          label={
            isMini
              ? undefined
              : { value: 'Net spend (£m)', position: 'insideBottom', offset: -14, fontSize: 11, fill: palette.axisLabel }
          }
        />
        <YAxis
          type="number"
          dataKey="points"
          name="Points"
          tick={!isMini ? { fontSize: 10, fill: palette.tick } : false}
          axisLine={{ stroke: palette.axisLine }}
          tickLine={false}
          width={isMini ? 4 : 32}
          label={isMini ? undefined : { value: 'Points', angle: -90, position: 'insideLeft', fontSize: 11, fill: palette.axisLabel }}
        />
        {!isMini && <Tooltip cursor={{ strokeDasharray: '3 3', stroke: palette.axisLine }} content={<ChartTooltip />} />}
        <Scatter
          data={trendLine}
          dataKey="points"
          line={{ stroke: palette.referenceLine, strokeDasharray: '4 4', strokeWidth: 1.5 }}
          shape={() => <g />}
          isAnimationActive={false}
          legendType="none"
        />
        <Scatter
          data={points}
          dataKey="points"
          shape={(props: ShapeProps) => renderDot(props, highlightClub, palette)}
          isAnimationActive={false}
        />
        <Scatter
          data={points}
          dataKey="points"
          shape={(props: ShapeProps) => renderLabel(props, highlightClub, labeledSet, palette)}
          isAnimationActive={false}
          legendType="none"
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default SpendPerformanceChart
