import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts'
import { getBadgeColor } from '../lib/clubColors'
import { useIsDarkMode } from '../lib/theme'
import { getChartPalette, TOOLTIP_BG, TOOLTIP_TEXT, TOOLTIP_MUTED, type ChartPalette } from '../lib/chartTheme'
import { nudgeCollisions, labelWouldCollideRight } from '../lib/chartLayout'

export type AttackDefensePoint = {
  shortName: string
  name: string
  goalsFor: number
  goalsAgainst: number
}

// plotGoalsFor/plotGoalsAgainst are the (possibly nudged) coordinates
// actually handed to Recharts for positioning — goalsFor/goalsAgainst stay
// the true values, read by the tooltip and the ranked table on /clubs.
type PlottedPoint = AttackDefensePoint & { plotGoalsFor: number; plotGoalsAgainst: number }

type ShapeProps = {
  cx?: number
  cy?: number
  payload?: PlottedPoint
}

type Props = {
  points: AttackDefensePoint[]
  avgGoalsFor: number
  avgGoalsAgainst: number
  // short_name to emphasize (larger, club-colored, labeled) — every other
  // point renders dimmed and unlabeled, identified by hovering instead.
  // Omit for the league-wide view on /clubs, where every dot is equal and
  // the write-up below the chart already names the standout clubs.
  highlightClub?: string
  height?: number
}

// A background halo behind a label so it stays legible over the grid,
// other dots, or a card's own background — width is a rough character-count
// estimate (no canvas measurement available here), generous enough to never
// clip. `align` flips which side of (x, y) the box grows from — used to
// keep a label from covering a dot that happens to sit on its default side.
function LabelWithHalo({
  x,
  y,
  text,
  bold,
  align,
  palette,
}: {
  x: number
  y: number
  text: string
  bold: boolean
  align: 'start' | 'end'
  palette: ChartPalette
}) {
  const fontSize = bold ? 10 : 9
  const textWidth = text.length * (fontSize * 0.64) + 8
  const rectX = align === 'start' ? x - 3 : x - textWidth + 3

  return (
    <g>
      <rect
        x={rectX}
        y={y - fontSize - 1}
        width={textWidth}
        height={fontSize + 6}
        rx={3}
        fill={palette.labelBg}
        stroke={palette.labelBgStroke}
        strokeWidth={0.75}
        opacity={0.92}
      />
      <text x={x} y={y} textAnchor={align} fontSize={fontSize} fontWeight={bold ? 600 : 500} fill={palette.pointLabel}>
        {text}
      </text>
    </g>
  )
}

// Dots and labels are two separate Scatter layers rather than one <g> per
// point, specifically so every label paints above every dot — with a
// single layer, whichever point happened to come later in the data array
// could render its dot on top of an earlier point's label whenever two
// clubs' goals were close. The flip side of that fix is a label can now
// cover a *different* point's dot instead if it extends toward it —
// handled below by flipping that label to the other side when its default
// position would land on another dot (see labelSides in the component).
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
  labelSides: Map<string, 'start' | 'end'>,
  palette: ChartPalette,
) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || !payload) return <g />

  const isHighlighted = Boolean(highlightClub) && payload.shortName.toUpperCase() === highlightClub!.toUpperCase()
  if (!isHighlighted) return <g key={payload.shortName} />

  const radius = 8 // matches the highlighted dot's own radius in renderDot
  const align = labelSides.get(payload.shortName.toUpperCase()) ?? 'start'
  const x = align === 'start' ? cx + radius + 4 : cx - radius - 4

  return <LabelWithHalo key={payload.shortName} x={x} y={cy + 3} text={payload.shortName} bold align={align} palette={palette} />
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: AttackDefensePoint }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload

  return (
    <div style={{ background: TOOLTIP_BG, color: TOOLTIP_TEXT, borderRadius: 6, padding: '6px 9px', fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 600 }}>{point.name}</div>
      <div style={{ color: TOOLTIP_MUTED }}>
        {point.goalsFor} scored · {point.goalsAgainst} conceded
      </div>
    </div>
  )
}

// Attack vs. defense quadrant: goals scored (x) against goals conceded
// (y, reversed so fewer conceded reads higher), split by the league-average
// scored/conceded into four quadrants. Shared between the full league-wide
// chart on /clubs (no highlightClub) and the mini per-club chart on
// /club/:slug (highlightClub set to that club's short_name).
function AttackDefenseChart({ points, avgGoalsFor, avgGoalsAgainst, highlightClub, height = 320 }: Props) {
  const isDark = useIsDarkMode()
  const palette = getChartPalette(isDark)
  const isMini = height < 260

  const xs = points.map((p) => p.goalsFor)
  const ys = points.map((p) => p.goalsAgainst)
  const xRange = Math.max(...xs) - Math.min(...xs) || 1
  const yRange = Math.max(...ys) - Math.min(...ys) || 1

  const positions = nudgeCollisions(
    points.map((p) => ({ key: p.shortName, x: p.goalsFor, y: p.goalsAgainst })),
    xRange,
    yRange,
  )
  const plotPoints: PlottedPoint[] = points.map((p) => {
    const pos = positions.get(p.shortName)!
    return { ...p, plotGoalsFor: pos.x, plotGoalsAgainst: pos.y }
  })

  // Only the highlighted club (mini per-club charts) ever gets a permanent
  // label now — still worth checking it wouldn't land on a neighboring dot.
  const labelSides = new Map<string, 'start' | 'end'>(
    points
      .filter((p) => p.shortName.toUpperCase() === highlightClub?.toUpperCase())
      .map((p) => [
        p.shortName.toUpperCase(),
        labelWouldCollideRight(p.shortName, positions, xRange, yRange) ? 'end' : 'start',
      ]),
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: isMini ? 8 : 16, bottom: isMini ? 4 : 24, left: isMini ? 4 : 8 }}>
        <CartesianGrid stroke={palette.grid} />
        <XAxis
          type="number"
          dataKey="plotGoalsFor"
          name="Goals scored"
          tick={!isMini ? { fontSize: 10, fill: palette.tick } : false}
          axisLine={{ stroke: palette.axisLine }}
          tickLine={false}
          label={
            isMini ? undefined : { value: 'Goals scored', position: 'insideBottom', offset: -14, fontSize: 11, fill: palette.axisLabel }
          }
        />
        <YAxis
          type="number"
          dataKey="plotGoalsAgainst"
          name="Goals conceded"
          reversed
          tick={!isMini ? { fontSize: 10, fill: palette.tick } : false}
          axisLine={{ stroke: palette.axisLine }}
          tickLine={false}
          width={isMini ? 4 : 32}
          label={
            isMini
              ? undefined
              : { value: 'Goals conceded (fewer = higher)', angle: -90, position: 'insideLeft', fontSize: 10, fill: palette.axisLabel }
          }
        />
        {!isMini && <Tooltip cursor={{ strokeDasharray: '3 3', stroke: palette.axisLine }} content={<ChartTooltip />} />}
        <ReferenceLine x={avgGoalsFor} stroke={palette.referenceLine} strokeDasharray="3 4" />
        <ReferenceLine y={avgGoalsAgainst} stroke={palette.referenceLine} strokeDasharray="3 4" />
        <Scatter
          data={plotPoints}
          dataKey="plotGoalsAgainst"
          shape={(props: ShapeProps) => renderDot(props, highlightClub, palette)}
          isAnimationActive={false}
        />
        <Scatter
          data={plotPoints}
          dataKey="plotGoalsAgainst"
          shape={(props: ShapeProps) => renderLabel(props, highlightClub, labelSides, palette)}
          isAnimationActive={false}
          legendType="none"
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default AttackDefenseChart
