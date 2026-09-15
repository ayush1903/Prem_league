import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts'
import { getBadgeColor } from '../lib/clubColors'
import { useIsDarkMode } from '../lib/theme'
import { getChartPalette, TOOLTIP_BG, TOOLTIP_TEXT, TOOLTIP_MUTED, type ChartPalette } from '../lib/chartTheme'

export type AttackDefensePoint = {
  shortName: string
  name: string
  goalsFor: number
  goalsAgainst: number
}

type ShapeProps = {
  cx?: number
  cy?: number
  payload?: AttackDefensePoint
}

type Props = {
  points: AttackDefensePoint[]
  avgGoalsFor: number
  avgGoalsAgainst: number
  // short_name to emphasize (larger, club-colored, labeled) — every other
  // point renders dimmed. Omit for the league-wide view on /clubs.
  highlightClub?: string
  // short_names to always label even without a highlight (e.g. the
  // best-/worst-balanced clubs) — everything else is identified by
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

function renderPoint(
  props: ShapeProps,
  highlightClub: string | undefined,
  labeledClubs: Set<string>,
  palette: ChartPalette,
) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || !payload) return <g />

  const isHighlighted = Boolean(highlightClub) && payload.shortName.toUpperCase() === highlightClub!.toUpperCase()
  const dimmed = Boolean(highlightClub) && !isHighlighted
  const showLabel = isHighlighted || (!highlightClub && labeledClubs.has(payload.shortName.toUpperCase()))
  const color = dimmed ? palette.dimmedDot : getBadgeColor(payload.shortName)
  const radius = isHighlighted ? 8 : dimmed ? 3.5 : 6

  return (
    <g key={payload.shortName}>
      <circle cx={cx} cy={cy} r={radius} fill={color} stroke={isHighlighted ? '#fff' : 'none'} strokeWidth={isHighlighted ? 2 : 0} />
      {showLabel && (
        <LabelWithHalo x={cx + radius + 4} y={cy + 3} text={payload.shortName} bold={isHighlighted} palette={palette} />
      )}
    </g>
  )
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
function AttackDefenseChart({ points, avgGoalsFor, avgGoalsAgainst, highlightClub, labeledClubs, height = 320 }: Props) {
  const isDark = useIsDarkMode()
  const palette = getChartPalette(isDark)
  const isMini = height < 260
  const labeledSet = new Set((labeledClubs ?? []).map((c) => c.toUpperCase()))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: isMini ? 8 : 16, bottom: isMini ? 4 : 24, left: isMini ? 4 : 8 }}>
        <CartesianGrid stroke={palette.grid} />
        <XAxis
          type="number"
          dataKey="goalsFor"
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
          dataKey="goalsAgainst"
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
          data={points}
          dataKey="goalsAgainst"
          shape={(props: ShapeProps) => renderPoint(props, highlightClub, labeledSet, palette)}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default AttackDefenseChart
