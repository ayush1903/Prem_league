import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts'
import { getBadgeColor } from '../lib/clubColors'

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
  height?: number
}

function renderPoint(props: ShapeProps, highlightClub: string | undefined, showAllLabels: boolean) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || !payload) return <g />

  const isHighlighted = Boolean(highlightClub) && payload.shortName.toUpperCase() === highlightClub!.toUpperCase()
  const dimmed = Boolean(highlightClub) && !isHighlighted
  const color = dimmed ? '#d1d5db' : getBadgeColor(payload.shortName)
  const radius = isHighlighted ? 8 : dimmed ? 3.5 : 6

  return (
    <g key={payload.shortName}>
      <circle cx={cx} cy={cy} r={radius} fill={color} stroke={isHighlighted ? '#fff' : 'none'} strokeWidth={isHighlighted ? 2 : 0} />
      {(showAllLabels || isHighlighted) && (
        <text
          x={cx + radius + 3}
          y={cy + 3}
          fontSize={isHighlighted ? 10 : 9}
          fontWeight={isHighlighted ? 600 : 400}
          fill="#374151"
        >
          {payload.shortName}
        </text>
      )}
    </g>
  )
}

// Attack vs. defense quadrant: goals scored (x) against goals conceded
// (y, reversed so fewer conceded reads higher), split by the league-average
// scored/conceded into four quadrants. Shared between the full league-wide
// chart on /clubs (no highlightClub) and the mini per-club chart on
// /club/:slug (highlightClub set to that club's short_name).
function AttackDefenseChart({ points, avgGoalsFor, avgGoalsAgainst, highlightClub, height = 320 }: Props) {
  const isMini = height < 260

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: isMini ? 8 : 16, bottom: isMini ? 4 : 24, left: isMini ? 4 : 8 }}>
        <CartesianGrid stroke="#f3f4f6" />
        <XAxis
          type="number"
          dataKey="goalsFor"
          name="Goals scored"
          tick={!isMini ? { fontSize: 10, fill: '#9ca3af' } : false}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
          label={
            isMini ? undefined : { value: 'Goals scored', position: 'insideBottom', offset: -14, fontSize: 11, fill: '#6b7280' }
          }
        />
        <YAxis
          type="number"
          dataKey="goalsAgainst"
          name="Goals conceded"
          reversed
          tick={!isMini ? { fontSize: 10, fill: '#9ca3af' } : false}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
          width={isMini ? 4 : 32}
          label={
            isMini
              ? undefined
              : { value: 'Goals conceded (fewer = higher)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#6b7280' }
          }
        />
        {!isMini && (
          <Tooltip cursor={{ strokeDasharray: '3 3' }} labelFormatter={() => ''} />
        )}
        <ReferenceLine x={avgGoalsFor} stroke="#d1d5db" strokeDasharray="3 4" />
        <ReferenceLine y={avgGoalsAgainst} stroke="#d1d5db" strokeDasharray="3 4" />
        <Scatter
          data={points}
          dataKey="goalsAgainst"
          shape={(props: ShapeProps) => renderPoint(props, highlightClub, !isMini)}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default AttackDefenseChart
