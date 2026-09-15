import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, clubCardHover } from '../lib/motion'
import { getClubInitials, getBadgeColor } from '../lib/clubColors'
import ClubCrest from '../components/ClubCrest'
import SiteHeader from '../components/SiteHeader'

type Club = {
  id: number
  name: string
  short_name: string
  crest: string | null
}

type Transfer = {
  club_name: string
  player_name: string
  type: string | null
  fee: string | null
  source_name: string | null
  date_logged: string
  status: string
  short_name: string | null
}

type ClubMovement = {
  shortName: string | null
  name: string
  totalIn: number
  totalOut: number
}

type TransferMarket = {
  byClub: ClubMovement[]
  leagueTotalIn: number
  leagueTotalOut: number
  biggestSpender: ClubMovement | null
  biggestSeller: ClubMovement | null
  excludedDealCount: number
}

const TYPE_LABELS: Record<string, string> = {
  in: 'In',
  out: 'Out',
  rumour: 'Rumour',
}

const TYPE_STYLES: Record<string, string> = {
  in: 'text-green-600 dark:text-green-400',
  out: 'text-red-600 dark:text-red-400',
  rumour: 'text-yellow-600 dark:text-yellow-400',
}

function formatDate(dateLogged: string): string {
  return new Date(dateLogged).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1'

function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [crestByShortName, setCrestByShortName] = useState<Record<string, string | null>>({})
  const [market, setMarket] = useState<TransferMarket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const previewParam = isPreview ? '?preview=1' : ''

    fetch(`/api/transfers${previewParam}`)
      .then((res) => res.json())
      .then((data) => setTransfers(data.transfers ?? []))
      .catch(() => setError('Failed to load transfers'))
      .finally(() => setLoading(false))

    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => {
        const clubs: Club[] = data.clubs ?? []
        setCrestByShortName(Object.fromEntries(clubs.map((club) => [club.short_name.toUpperCase(), club.crest])))
      })
      .catch(() => {})

    fetch('/api/transfers-analytics')
      .then((res) => res.json())
      .then((data) => setMarket(data.transferMarket ?? null))
      .catch(() => setMarketError('Failed to load transfer market summary'))
  }, [])

  const topSpenders = market ? [...market.byClub].filter((c) => c.totalIn > 0).sort((a, b) => b.totalIn - a.totalIn).slice(0, 6) : []
  const topSellers = market ? [...market.byClub].filter((c) => c.totalOut > 0).sort((a, b) => b.totalOut - a.totalOut).slice(0, 6) : []
  const netMovers = market
    ? [...market.byClub]
        .map((c) => ({ ...c, net: c.totalIn - c.totalOut }))
        .sort((a, b) => b.net - a.net)
    : []
  const netTop = netMovers.slice(0, 3)
  const netBottom = netMovers.length > 6 ? netMovers.slice(-3) : netMovers.slice(3)

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-10">
        {isPreview && (
          <div className="mb-6 rounded-lg border border-yellow-400 bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-300">
            Preview mode — showing draft content that isn't published yet.
          </div>
        )}

        {marketError && <p className="mb-6 text-red-500">{marketError}</p>}

        {market && (
          <div className="mb-8 rounded-lg border-l-[3px] border-[#00FF85] bg-gray-100 p-5 dark:bg-gray-900">
            <p className="mb-2 text-[15px] font-semibold">Transfer market this window</p>
            <p className="mb-4 rounded-md bg-white p-2.5 text-xs leading-relaxed text-gray-600 dark:bg-gray-950 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">What this shows:</span> total transfer
              fees logged for each club this window, split by signings (in) and sales (out). Only published deals with
              a confirmed fee are counted — loan moves and fees reported as "undisclosed" are excluded from every total
              below, not counted as £0.
            </p>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-white p-3 dark:bg-gray-950">
                <p className="text-xs text-gray-500 dark:text-gray-400">League spend (in)</p>
                <p className="mt-1 font-display text-xl font-extrabold">£{market.leagueTotalIn.toFixed(1)}m</p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-gray-950">
                <p className="text-xs text-gray-500 dark:text-gray-400">League spend (out)</p>
                <p className="mt-1 font-display text-xl font-extrabold">£{market.leagueTotalOut.toFixed(1)}m</p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-gray-950">
                <p className="text-xs text-gray-500 dark:text-gray-400">Biggest spender</p>
                <p className="mt-1 text-base font-bold">{market.biggestSpender?.name ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-gray-950">
                <p className="text-xs text-gray-500 dark:text-gray-400">Biggest seller</p>
                <p className="mt-1 text-base font-bold">{market.biggestSeller?.name ?? '—'}</p>
              </div>
            </div>

            {(topSpenders.length > 0 || topSellers.length > 0) && (
              <div className="mb-2 flex flex-col gap-6 sm:flex-row">
                {topSpenders.length > 0 && (
                  <div className="flex-1">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Top spenders (in)
                    </p>
                    {topSpenders.map((c) => (
                      <div key={c.shortName ?? c.name} className="mb-2 flex items-center gap-2">
                        <span className="w-9 text-xs font-semibold">{c.shortName ?? c.name.slice(0, 3).toUpperCase()}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
                          <span
                            className="block h-full rounded"
                            style={{
                              width: `${(c.totalIn / topSpenders[0].totalIn) * 100}%`,
                              backgroundColor: getBadgeColor(c.shortName ?? c.name),
                            }}
                          />
                        </span>
                        <span className="w-16 text-right text-xs text-gray-600 dark:text-gray-400">£{c.totalIn.toFixed(1)}m</span>
                      </div>
                    ))}
                  </div>
                )}
                {topSellers.length > 0 && (
                  <div className="flex-1">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Top sellers (out)
                    </p>
                    {topSellers.map((c) => (
                      <div key={c.shortName ?? c.name} className="mb-2 flex items-center gap-2">
                        <span className="w-9 text-xs font-semibold">{c.shortName ?? c.name.slice(0, 3).toUpperCase()}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
                          <span
                            className="block h-full rounded"
                            style={{
                              width: `${(c.totalOut / topSellers[0].totalOut) * 100}%`,
                              backgroundColor: getBadgeColor(c.shortName ?? c.name),
                            }}
                          />
                        </span>
                        <span className="w-16 text-right text-xs text-gray-600 dark:text-gray-400">£{c.totalOut.toFixed(1)}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {netTop.length > 0 && (
              <table className="mt-4 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
                    <th className="py-1 pr-1 font-medium">Club</th>
                    <th className="py-1 px-1 text-right font-medium">In</th>
                    <th className="py-1 px-1 text-right font-medium">Out</th>
                    <th className="py-1 pl-1 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {netTop.map((c) => (
                    <tr key={c.shortName ?? c.name} className="border-b border-gray-50 dark:border-gray-900">
                      <td className="py-1 pr-1">
                        <span
                          aria-hidden="true"
                          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getBadgeColor(c.shortName ?? c.name) }}
                        />
                        {c.name}
                      </td>
                      <td className="py-1 px-1 text-right">£{c.totalIn.toFixed(1)}m</td>
                      <td className="py-1 px-1 text-right">£{c.totalOut.toFixed(1)}m</td>
                      <td className="py-1 pl-1 text-right font-semibold text-red-600 dark:text-red-400">
                        +£{c.net.toFixed(1)}m
                      </td>
                    </tr>
                  ))}
                  {netMovers.length > netTop.length + netBottom.length && (
                    <tr>
                      <td colSpan={4} className="py-1 text-center text-gray-400">
                        ⋯ {netMovers.length - netTop.length - netBottom.length} clubs omitted ⋯
                      </td>
                    </tr>
                  )}
                  {netBottom.map((c) => (
                    <tr key={c.shortName ?? c.name} className="border-b border-gray-50 dark:border-gray-900">
                      <td className="py-1 pr-1">
                        <span
                          aria-hidden="true"
                          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getBadgeColor(c.shortName ?? c.name) }}
                        />
                        {c.name}
                      </td>
                      <td className="py-1 px-1 text-right">£{c.totalIn.toFixed(1)}m</td>
                      <td className="py-1 px-1 text-right">£{c.totalOut.toFixed(1)}m</td>
                      <td className="py-1 pl-1 text-right font-semibold text-green-600 dark:text-green-400">
                        &minus;£{Math.abs(c.net).toFixed(1)}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              <strong>Insight (computed live):</strong> £{market.leagueTotalIn.toFixed(1)}m spent, £
              {market.leagueTotalOut.toFixed(1)}m recouped across the league this window ({market.excludedDealCount}{' '}
              loan/undisclosed deal{market.excludedDealCount === 1 ? '' : 's'} excluded from totals).
              {market.biggestSpender && (
                <>
                  {' '}
                  Biggest spender: <strong>{market.biggestSpender.name}</strong> (£{market.biggestSpender.totalIn.toFixed(1)}m).
                </>
              )}
              {market.biggestSeller && (
                <>
                  {' '}
                  Biggest seller: <strong>{market.biggestSeller.name}</strong> (£{market.biggestSeller.totalOut.toFixed(1)}m).
                </>
              )}
            </p>
          </div>
        )}

        {error && <p className="text-red-500">{error}</p>}

        {!error && loading && <p className="text-gray-600 dark:text-gray-400">Loading transfers...</p>}

        {!error && !loading && transfers.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400">No transfers logged yet.</p>
        )}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.05, 0.15)}
          className="flex flex-col gap-3"
        >
          {transfers.map((transfer, index) => {
            const initials = getClubInitials(transfer.club_name, transfer.short_name)
            const crestUrl = transfer.short_name ? crestByShortName[transfer.short_name.toUpperCase()] ?? null : null
            const type = transfer.type ?? 'rumour'
            const clubColor = getBadgeColor(transfer.short_name ?? initials)

            return (
              <motion.div
                key={`${transfer.club_name}-${transfer.player_name}-${index}`}
                variants={fadeUp}
                {...clubCardHover(clubColor)}
                className="flex items-center gap-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                style={{ borderLeft: `4px solid ${clubColor}` }}
              >
                <ClubCrest label={initials} crestUrl={crestUrl} alt={transfer.club_name} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="font-medium">{transfer.player_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{transfer.club_name}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${TYPE_STYLES[type] ?? TYPE_STYLES.rumour}`}>
                    {TYPE_LABELS[type] ?? 'Rumour'}
                    {transfer.fee ? ` · ${transfer.fee}` : ''}
                  </p>
                  {transfer.source_name && (
                    <p className="text-xs text-gray-500">Source: {transfer.source_name}</p>
                  )}
                  <p className="text-xs text-gray-500">{formatDate(transfer.date_logged)}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

export default TransfersPage
