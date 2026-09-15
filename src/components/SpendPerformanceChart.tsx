import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { getBadgeColor } from '../lib/clubColors'

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

// Spend vs. performance: net transfer spend (x) against league points (y),
// with the league's OLS trend line. Shared between the full league-wide
// chart on /clubs (no highlightClub) and the mini per-club chart on
// /club/:slug (highlightClub set to that club's short_name).
function SpendPerformanceChart({ points, slope, intercept, highlightClub, height = 320 }: Props) {
  const isMini = height < 260
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
        <CartesianGrid stroke="#f3f4f6" />
        <XAxis
          type="number"
          dataKey="netSpendM"
          name="Net spend"
          tick={!isMini ? { fontSize: 10, fill: '#9ca3af' } : false}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
          label={
            isMini
              ? undefined
              : { value: 'Net spend (£m)', position: 'insideBottom', offset: -14, fontSize: 11, fill: '#6b7280' }
          }
        />
        <YAxis
          type="number"
          dataKey="points"
          name="Points"
          tick={!isMini ? { fontSize: 10, fill: '#9ca3af' } : false}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
          width={isMini ? 4 : 32}
          label={isMini ? undefined : { value: 'Points', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' }}
        />
        {!isMini && (
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value, name) => [name === 'Net spend' ? `£${value}m` : value, name]}
            labelFormatter={() => ''}
          />
        )}
        <Scatter
          data={trendLine}
          dataKey="points"
          line={{ stroke: '#9ca3af', strokeDasharray: '4 4', strokeWidth: 1.5 }}
          shape={() => <g />}
          isAnimationActive={false}
          legendType="none"
        />
        <Scatter
          data={points}
          dataKey="points"
          shape={(props: ShapeProps) => renderPoint(props, highlightClub, !isMini)}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default SpendPerformanceChart
