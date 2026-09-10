import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer } from '../lib/motion'
import { normalizeTla } from '../lib/tla'
import ClubCrest from '../components/ClubCrest'
import SiteHeader from '../components/SiteHeader'

// Simplified standard convention: top 4 = Champions League, 5th-6th =
// Europa League, 7th = Conference League, bottom 3 = relegation.
const QUALIFICATION_ZONES = [
  { id: 'ucl', label: 'Champions League', color: '#2563eb' },
  { id: 'uel', label: 'Europa League', color: '#f97316' },
  { id: 'ecl', label: 'Conference League', color: '#16a34a' },
  { id: 'rel', label: 'Relegation', color: '#dc2626' },
] as const

type Club = {
  id: number
  name: string
  short_name: string
}

type StandingRow = {
  position: number
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalDifference: number
  team: {
    name: string
    tla: string
    crest: string | null
  }
}

type StandingsGroup = {
  type: string
  table: StandingRow[]
}

type StandingsPayload = {
  standings: StandingsGroup[]
}

// Zone boundaries are in terms of true table slots (1st, 2nd, ...), but
// `position` is a competition-style rank that's shared by tied teams and
// then skips ahead (two teams tied at 17 are both `position: 17`, and the
// next team is `position: 19`). Checking `position` against a slot
// boundary directly under- or over-counts ties straddling that boundary —
// e.g. two teams tied at 17th (occupying slots 17-18 of 20) would both
// read as "not > 17" and miss the relegation zone entirely, even though
// slot 18 is within the bottom 3. So this computes each team's actual
// occupied slot range from its tie group and flags a zone on any overlap,
// coloring the whole tied group together rather than just whichever slot
// happens to clear the raw position check.
function getZoneColor(row: StandingRow, rows: StandingRow[]): string {
  const total = rows.length
  const betterCount = rows.filter((r) => r.position < row.position).length
  const tieGroupSize = rows.filter((r) => r.position === row.position).length
  const groupStart = betterCount + 1
  const groupEnd = betterCount + tieGroupSize

  const zones = [
    { start: 1, end: 4, color: QUALIFICATION_ZONES[0].color },
    { start: 5, end: 6, color: QUALIFICATION_ZONES[1].color },
    { start: 7, end: 7, color: QUALIFICATION_ZONES[2].color },
    { start: total - 2, end: total, color: QUALIFICATION_ZONES[3].color },
  ]

  const zone = zones.find((z) => groupStart <= z.end && groupEnd >= z.start)
  return zone?.color ?? 'transparent'
}

function resolveClub(tla: string, clubsByShortName: Record<string, Club>): Club | null {
  const club = clubsByShortName[normalizeTla(tla)]

  if (!club) {
    console.warn(`/table: standings tla "${tla}" did not match any known club short_name`)
    return null
  }

  return club
}

function TablePage() {
  const [rows, setRows] = useState<StandingRow[]>([])
  const [clubsByShortName, setClubsByShortName] = useState<Record<string, Club>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/standings').then((res) => res.json()),
      fetch('/api/clubs').then((res) => res.json()),
    ])
      .then(([standingsData, clubsData]: [{ standings: StandingsPayload }, { clubs: Club[] }]) => {
        const table = standingsData.standings?.standings?.find((group) => group.type === 'TOTAL')?.table ?? []
        const clubs: Club[] = clubsData.clubs ?? []
        const byShortName = Object.fromEntries(clubs.map((club) => [club.short_name.toUpperCase(), club]))

        setRows(table)
        setClubsByShortName(byShortName)
      })
      .catch(() => setError('Failed to load table'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-10">
        {error && <p className="text-red-500">{error}</p>}

        {!error && loading && <p className="text-gray-600 dark:text-gray-400">Loading table...</p>}

        {!error && !loading && rows.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400">No standings available.</p>
        )}

        {!error && rows.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer(0.03, 0.15)}
            className="overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-900"
          >
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Club</th>
                  <th className="px-4 py-3 text-right font-medium">P</th>
                  <th className="px-4 py-3 text-right font-medium">W</th>
                  <th className="px-4 py-3 text-right font-medium">D</th>
                  <th className="px-4 py-3 text-right font-medium">L</th>
                  <th className="px-4 py-3 text-right font-medium">GD</th>
                  <th className="px-4 py-3 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const club = resolveClub(row.team.tla, clubsByShortName)
                  const badgeLabel = club?.short_name ?? row.team.tla
                  const displayName = club?.name ?? row.team.name
                  const rowColor = getZoneColor(row, rows)

                  const nameCell = (
                    <div className="flex items-center gap-3">
                      <ClubCrest label={badgeLabel} crestUrl={row.team.crest} alt={displayName} known={Boolean(club)} size="xs" />
                      <span className="font-medium">{displayName}</span>
                    </div>
                  )

                  return (
                    <motion.tr
                      key={row.team.tla}
                      variants={fadeUp}
                      className="border-b border-gray-200 last:border-0 dark:border-gray-800"
                    >
                      <td className="py-3 pl-4 pr-4 text-gray-600 dark:text-gray-400" style={{ borderLeft: `3px solid ${rowColor}` }}>
                        {row.position}
                      </td>
                      <td className="px-4 py-3">
                        {club ? (
                          <Link
                            to={`/club/${club.short_name.toLowerCase()}`}
                            className="transition-opacity hover:opacity-70"
                          >
                            {nameCell}
                          </Link>
                        ) : (
                          nameCell
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{row.playedGames}</td>
                      <td className="px-4 py-3 text-right">{row.won}</td>
                      <td className="px-4 py-3 text-right">{row.draw}</td>
                      <td className="px-4 py-3 text-right">{row.lost}</td>
                      <td className="px-4 py-3 text-right">{row.goalDifference}</td>
                      <td className="px-4 py-3 text-right font-semibold">{row.points}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>
        )}

        {!error && rows.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {QUALIFICATION_ZONES.map((zone) => (
              <div key={zone.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TablePage
