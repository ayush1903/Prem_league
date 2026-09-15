import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'
import ClubCrest from '../components/ClubCrest'
import SiteHeader from '../components/SiteHeader'
import SpendPerformanceChart, { type SpendPoint } from '../components/SpendPerformanceChart'
import AttackDefenseChart, { type AttackDefensePoint } from '../components/AttackDefenseChart'

const MotionLink = motion.create(Link)

type Club = {
  id: number
  name: string
  short_name: string
  crest: string | null
}

type SpendPointWithResidual = SpendPoint & { residual: number }

type SpendVsPerformance = {
  points: SpendPointWithResidual[]
  correlation: number | null
  sampleSize: number
  slope: number
  intercept: number
  overperformer: SpendPointWithResidual | null
  underperformer: SpendPointWithResidual | null
  excludedClubs: string[]
}

type AttackVsDefensePoint = AttackDefensePoint & { balanceScore: number }

type AttackVsDefense = {
  points: AttackVsDefensePoint[]
  avgGoalsFor: number
  avgGoalsAgainst: number
  bestBalanced: AttackVsDefensePoint | null
  worstBalanced: AttackVsDefensePoint | null
}

type ClubsAnalytics = {
  spendVsPerformance: SpendVsPerformance
  attackVsDefense: AttackVsDefense
}

// Top/bottom N by a numeric key, plus how many were left out of the middle —
// used to keep each ranked table short while still showing it's a ranking,
// not just an arbitrary slice.
function rankedExtremes<T>(items: T[], key: (item: T) => number, n = 3) {
  const sorted = [...items].sort((a, b) => key(b) - key(a))
  const top = sorted.slice(0, n)
  const bottom = sorted.length > n * 2 ? sorted.slice(-n) : sorted.slice(n)
  const omitted = Math.max(sorted.length - top.length - bottom.length, 0)
  return { top, bottom, omitted }
}

function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [analytics, setAnalytics] = useState<ClubsAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => setClubs(data.clubs ?? []))
      .catch(() => setError('Failed to load clubs'))

    fetch('/api/clubs-analytics')
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch(() => setAnalyticsError('Failed to load club analytics'))
  }, [])

  const spend = analytics?.spendVsPerformance
  const attackDefense = analytics?.attackVsDefense

  const spendRanks = spend ? rankedExtremes(spend.points, (p) => p.residual) : null

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />

      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold">PL Clubs</h1>

        <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
          {/* Grid: full width and stacked below the charts under xl; a
              fixed-width left column beside them from xl up. */}
          <div className="order-2 xl:order-1 xl:w-[440px] xl:shrink-0">
            {error && <p className="text-red-500">{error}</p>}

            {!error && clubs.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400">Loading clubs...</p>
            )}

            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">The 20 clubs</p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer(0.05, 0.15)}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-3"
            >
              {clubs.map((club) => (
                <MotionLink
                  key={club.id}
                  to={`/club/${club.short_name.toLowerCase()}`}
                  variants={fadeUp}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="club-card flex flex-col items-center gap-3 rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-900"
                  style={{ '--club': getBadgeColor(club.short_name) } as CSSProperties}
                >
                  <ClubCrest label={club.short_name} crestUrl={club.crest} alt={club.name} size="xl" />
                  <p className="text-sm font-medium">{club.name}</p>
                </MotionLink>
              ))}
            </motion.div>
          </div>

          {/* Charts: full width and stacked above the grid under xl; a
              flexible right column beside it from xl up. */}
          <div className="order-1 min-w-0 xl:order-2 xl:flex-1">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#00FF85]" />
              Club analytics
            </h2>

            {analyticsError && <p className="text-red-500">{analyticsError}</p>}

            {!analyticsError && !analytics && (
              <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
            )}

            <div className="flex flex-col gap-5">
              {spend && (
                <div className="rounded-lg border-l-[3px] border-[#00FF85] bg-gray-100 p-5 dark:bg-gray-900">
                  <p className="text-[15px] font-semibold">Spend vs. performance</p>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Net spend (£m) vs. points this season</p>
                  <p className="mb-3 rounded-md bg-white p-2.5 text-xs leading-relaxed text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">How to read this:</span> each dot is a
                    club, plotted by net transfer spend (x) against league points (y). The dashed line is the league's
                    best-fit trend — dots above it are outperforming their spend; dots below are underperforming it.
                  </p>

                  <SpendPerformanceChart
                    points={spend.points}
                    slope={spend.slope}
                    intercept={spend.intercept}
                    labeledClubs={[spend.overperformer?.shortName, spend.underperformer?.shortName].filter(
                      (v): v is string => Boolean(v),
                    )}
                  />

                  {spendRanks && spendRanks.top.length > 0 && (
                    <table className="mt-3 w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
                          <th className="py-1 pr-1 font-medium">Club</th>
                          <th className="py-1 px-1 text-right font-medium">Net spend</th>
                          <th className="py-1 px-1 text-right font-medium">Pts</th>
                          <th className="py-1 pl-1 text-right font-medium">vs. expected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spendRanks.top.map((p) => (
                          <tr key={p.shortName} className="border-b border-gray-50 dark:border-gray-900">
                            <td className="py-1 pr-1">
                              <span
                                aria-hidden="true"
                                className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: getBadgeColor(p.shortName) }}
                              />
                              {p.name}
                            </td>
                            <td className="py-1 px-1 text-right">£{p.netSpendM.toFixed(0)}m</td>
                            <td className="py-1 px-1 text-right">{p.points}</td>
                            <td className="py-1 pl-1 text-right font-semibold text-green-600 dark:text-green-400">
                              {p.residual >= 0 ? '+' : ''}
                              {p.residual.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                        {spendRanks.omitted > 0 && (
                          <tr>
                            <td colSpan={4} className="py-1 text-center text-gray-400">
                              ⋯ {spendRanks.omitted} clubs omitted ⋯
                            </td>
                          </tr>
                        )}
                        {spendRanks.bottom.map((p) => (
                          <tr key={p.shortName} className="border-b border-gray-50 dark:border-gray-900">
                            <td className="py-1 pr-1">
                              <span
                                aria-hidden="true"
                                className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: getBadgeColor(p.shortName) }}
                              />
                              {p.name}
                            </td>
                            <td className="py-1 px-1 text-right">£{p.netSpendM.toFixed(0)}m</td>
                            <td className="py-1 px-1 text-right">{p.points}</td>
                            <td className="py-1 pl-1 text-right font-semibold text-red-600 dark:text-red-400">
                              {p.residual.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    <strong>Insight (computed live):</strong>{' '}
                    {spend.correlation === null ? (
                      'Not enough clubs have reported spend yet to compute a reliable correlation.'
                    ) : (
                      <>
                        Net spend and points correlate at <strong>r&nbsp;=&nbsp;{spend.correlation.toFixed(2)}</strong> (n=
                        {spend.sampleSize} clubs with reported spend).
                        {spend.overperformer && (
                          <>
                            {' '}
                            Biggest overperformer: <strong>{spend.overperformer.name}</strong> (+
                            {spend.overperformer.residual.toFixed(1)} pts vs. expected).
                          </>
                        )}
                        {spend.underperformer && (
                          <>
                            {' '}
                            Biggest underperformer: <strong>{spend.underperformer.name}</strong> (
                            {spend.underperformer.residual.toFixed(1)} pts vs. expected).
                          </>
                        )}
                      </>
                    )}
                  </p>
                  {spend.excludedClubs.length > 0 && (
                    <p className="mt-1 text-[11px] italic text-gray-400">
                      {spend.excludedClubs.length} club{spend.excludedClubs.length === 1 ? '' : 's'} without usable spend
                      data excluded: {spend.excludedClubs.join(', ')}.
                    </p>
                  )}
                </div>
              )}

              {attackDefense && (
                <div className="rounded-lg border-l-[3px] border-[#00FF85] bg-gray-100 p-5 dark:bg-gray-900">
                  <p className="text-[15px] font-semibold">Attack vs. defense</p>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Goals scored vs. goals conceded, split into quadrants
                  </p>
                  <p className="mb-3 rounded-md bg-white p-2.5 text-xs leading-relaxed text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">How to read this:</span> each dot is
                    a club, plotted by goals scored (x) against goals conceded (y, inverted so fewer conceded sits
                    higher). The dashed lines mark the league-average scored/conceded and split the chart into four
                    quadrants: strong both ends (top right), leaky but prolific (bottom right), tight but blunt (top
                    left), struggling both ends (bottom left).
                  </p>

                  <AttackDefenseChart
                    points={attackDefense.points}
                    avgGoalsFor={attackDefense.avgGoalsFor}
                    avgGoalsAgainst={attackDefense.avgGoalsAgainst}
                    labeledClubs={[attackDefense.bestBalanced?.shortName, attackDefense.worstBalanced?.shortName].filter(
                      (v): v is string => Boolean(v),
                    )}
                  />

                  {(() => {
                    const ranks = rankedExtremes(attackDefense.points, (p) => p.balanceScore)
                    if (ranks.top.length === 0) return null

                    return (
                      <table className="mt-3 w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
                            <th className="py-1 pr-1 font-medium">Club</th>
                            <th className="py-1 px-1 text-right font-medium">GF</th>
                            <th className="py-1 px-1 text-right font-medium">GA</th>
                            <th className="py-1 pl-1 text-right font-medium">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranks.top.map((p) => (
                            <tr key={p.shortName} className="border-b border-gray-50 dark:border-gray-900">
                              <td className="py-1 pr-1">
                                <span
                                  aria-hidden="true"
                                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: getBadgeColor(p.shortName) }}
                                />
                                {p.name}
                              </td>
                              <td className="py-1 px-1 text-right">{p.goalsFor}</td>
                              <td className="py-1 px-1 text-right">{p.goalsAgainst}</td>
                              <td className="py-1 pl-1 text-right font-semibold text-green-600 dark:text-green-400">
                                +{p.balanceScore.toFixed(0)}
                              </td>
                            </tr>
                          ))}
                          {ranks.omitted > 0 && (
                            <tr>
                              <td colSpan={4} className="py-1 text-center text-gray-400">
                                ⋯ {ranks.omitted} clubs omitted ⋯
                              </td>
                            </tr>
                          )}
                          {ranks.bottom.map((p) => (
                            <tr key={p.shortName} className="border-b border-gray-50 dark:border-gray-900">
                              <td className="py-1 pr-1">
                                <span
                                  aria-hidden="true"
                                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: getBadgeColor(p.shortName) }}
                                />
                                {p.name}
                              </td>
                              <td className="py-1 px-1 text-right">{p.goalsFor}</td>
                              <td className="py-1 px-1 text-right">{p.goalsAgainst}</td>
                              <td className="py-1 pl-1 text-right font-semibold text-red-600 dark:text-red-400">
                                {p.balanceScore.toFixed(0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}

                  <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    <strong>Insight (computed live):</strong> League average this season:{' '}
                    <strong>{attackDefense.avgGoalsFor.toFixed(1)} scored</strong>,{' '}
                    <strong>{attackDefense.avgGoalsAgainst.toFixed(1)} conceded</strong> per club.
                    {attackDefense.bestBalanced && (
                      <>
                        {' '}
                        <strong>{attackDefense.bestBalanced.name}</strong> sit furthest into the strong-attack/strong-defense
                        quadrant (+{attackDefense.bestBalanced.balanceScore.toFixed(0)} vs. league).
                      </>
                    )}
                    {attackDefense.worstBalanced && (
                      <>
                        {' '}
                        <strong>{attackDefense.worstBalanced.name}</strong> sit furthest into the weak-attack/weak-defense
                        quadrant ({attackDefense.worstBalanced.balanceScore.toFixed(0)}).
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClubsPage
