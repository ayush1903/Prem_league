import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp, fadeUp, staggerContainer } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'

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
  }
}

type StandingsGroup = {
  type: string
  table: StandingRow[]
}

type StandingsPayload = {
  standings: StandingsGroup[]
}

// football-data.org uses 'NOT' for Nottingham Forest where our clubs use 'NFO'.
const TLA_OVERRIDES: Record<string, string> = {
  NOT: 'NFO',
}

function resolveClub(tla: string, clubsByShortName: Record<string, Club>): Club | null {
  const shortName = TLA_OVERRIDES[tla] ?? tla
  const club = clubsByShortName[shortName]

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
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <motion.header
        initial="hidden"
        animate="visible"
        variants={fadeSlideUp}
        style={{ backgroundColor: '#38003C' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
          <h1 className="inline-block text-3xl font-bold text-white">
            Table
            <span
              className="mt-2 block h-1 w-full rounded-full"
              style={{ backgroundColor: '#00FF85' }}
            />
          </h1>
          <Link
            to="/"
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            ← Premier League
          </Link>
        </div>
      </motion.header>

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

                  const nameCell = (
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded font-bold text-white"
                        style={{ backgroundColor: getBadgeColor(badgeLabel), fontSize: '0.65rem' }}
                      >
                        {badgeLabel}
                      </div>
                      <span className="font-medium">{displayName}</span>
                    </div>
                  )

                  return (
                    <motion.tr
                      key={row.team.tla}
                      variants={fadeUp}
                      className="border-b border-gray-200 last:border-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.position}</td>
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
      </div>
    </div>
  )
}

export default TablePage
