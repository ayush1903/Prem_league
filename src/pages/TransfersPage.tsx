import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp, fadeUp, staggerContainer, cardHover } from '../lib/motion'
import { getBadgeColor, getClubInitials } from '../lib/clubColors'

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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transfers')
      .then((res) => res.json())
      .then((data) => setTransfers(data.transfers ?? []))
      .catch(() => setError('Failed to load transfers'))
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
            Transfers
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
            const type = transfer.type ?? 'rumour'

            return (
              <motion.div
                key={`${transfer.club_name}-${transfer.player_name}-${index}`}
                variants={fadeUp}
                {...cardHover}
                className="flex items-center gap-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-bold text-white"
                  style={{ backgroundColor: getBadgeColor(initials) }}
                >
                  {initials}
                </div>

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
