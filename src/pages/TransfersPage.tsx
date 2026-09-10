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

function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [crestByShortName, setCrestByShortName] = useState<Record<string, string | null>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transfers')
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
  }, [])

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-10">
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
