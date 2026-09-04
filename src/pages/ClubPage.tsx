import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp, fadeUp, staggerContainer, cardHover } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'

type Player = {
  first_name: string
  second_name: string
  element_type: number
}

type TeamResponse = {
  team: string
  players: Player[]
}

type ClubContent = {
  club_name: string
  manager: string | null
  formation: string | null
  club_summary: string | null
  playstyle_summary: string | null
  net_spend: string | null
  status: string
  updated_at: string
}

type Transfer = {
  club_name: string
  player_name: string
  type: string | null
  fee: string | null
  source_name: string | null
  date_logged: string
  status: string
}

type Status = 'loading' | 'ready' | 'not-found' | 'error'

const POSITION_LABELS: Record<number, string> = {
  1: 'Goalkeeper',
  2: 'Defender',
  3: 'Midfielder',
  4: 'Forward',
}

const POSITION_GROUPS: { type: number; heading: string }[] = [
  { type: 1, heading: 'Goalkeepers' },
  { type: 2, heading: 'Defenders' },
  { type: 3, heading: 'Midfielders' },
  { type: 4, heading: 'Forwards' },
]

const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1'

function ClubNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <p className="text-gray-600 dark:text-gray-400">
        Club not found — this doesn't match a current Premier League club.
      </p>
    </div>
  )
}

function ClubPage() {
  const { slug } = useParams<{ slug: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [clubContent, setClubContent] = useState<ClubContent | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])

  useEffect(() => {
    if (!slug) {
      setStatus('not-found')
      return
    }

    setStatus('loading')
    setTeam(null)
    setClubContent(null)
    setTransfers([])

    const clubParam = `club=${encodeURIComponent(slug)}`
    const previewParam = isPreview ? '&preview=1' : ''

    fetch(`/api/team?${clubParam}`)
      .then((res) => {
        if (res.status === 404) {
          setStatus('not-found')
          return null
        }
        if (!res.ok) {
          setStatus('error')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data) {
          setTeam(data)
          setStatus('ready')
        }
      })
      .catch(() => setStatus('error'))

    fetch(`/api/club-content?${clubParam}${previewParam}`)
      .then((res) => res.json())
      .then((data) => setClubContent(data.clubContent ?? null))
      .catch(() => {})

    fetch(`/api/transfers?${clubParam}${previewParam}`)
      .then((res) => res.json())
      .then((data) => setTransfers(data.transfers ?? []))
      .catch(() => {})
  }, [slug])

  if (status === 'not-found') {
    return <ClubNotFoundPage />
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
        <p className="text-red-500">Failed to load team data</p>
      </div>
    )
  }

  if (status === 'loading' || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
        <p>Loading squad — first visit for this club can take a moment...</p>
      </div>
    )
  }

  const badgeLabel = (slug ?? '').toUpperCase()
  const players = team.players ?? []
  const playersByType = players.reduce<Record<number, Player[]>>((acc, player) => {
    acc[player.element_type] = acc[player.element_type] ?? []
    acc[player.element_type].push(player)
    return acc
  }, {})

  const squadSize = players.length
  const defenderCount = (playersByType[2] ?? []).length
  const forwardCount = (playersByType[4] ?? []).length

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {isPreview && (
          <div className="mb-6 rounded-lg border border-yellow-400 bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-300">
            Preview mode — showing draft content that isn't published yet.
          </div>
        )}

        <motion.header
          initial="hidden"
          animate="visible"
          variants={fadeSlideUp}
          className="flex items-center gap-4"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg font-bold text-white"
            style={{ backgroundColor: getBadgeColor(badgeLabel) }}
          >
            {badgeLabel}
          </div>
          <div>
            <h1 className="text-3xl font-semibold">{team.team}</h1>
            {clubContent && (clubContent.manager || clubContent.formation) && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {clubContent.manager}
                {clubContent.manager && clubContent.formation ? ' · ' : ''}
                {clubContent.formation}
              </p>
            )}
          </div>
        </motion.header>

        {clubContent && (clubContent.club_summary || clubContent.playstyle_summary) && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
            className="mt-8 space-y-4 rounded-lg bg-gray-100 p-5 dark:bg-gray-900"
          >
            {clubContent.club_summary && (
              <p className="text-gray-800 dark:text-gray-200">{clubContent.club_summary}</p>
            )}
            {clubContent.playstyle_summary && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{clubContent.playstyle_summary}</p>
            )}
          </motion.section>
        )}

        {transfers.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-semibold">Transfers</h2>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer(0.06, 0.15)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {transfers.map((transfer, index) => (
                <motion.div
                  key={`${transfer.player_name}-${index}`}
                  variants={fadeUp}
                  {...cardHover}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                >
                  <p className="font-medium">{transfer.player_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {transfer.type === 'in' ? 'In' : transfer.type === 'out' ? 'Out' : 'Rumour'}
                    {transfer.fee ? ` · ${transfer.fee}` : ''}
                  </p>
                  {transfer.source_name && (
                    <p className="mt-1 text-xs text-gray-500">Source: {transfer.source_name}</p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.06, 0.25)}
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Squad Size</p>
            <p className="text-2xl font-bold">{squadSize}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Defenders</p>
            <p className="text-2xl font-bold">{defenderCount}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Forwards</p>
            <p className="text-2xl font-bold">{forwardCount}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Net Spend</p>
            <p className="text-2xl font-bold">{clubContent?.net_spend ?? '—'}</p>
          </motion.div>
        </motion.div>

        <div className="mt-10 space-y-8">
          {POSITION_GROUPS.map((group, groupIndex) => {
            const groupPlayers = playersByType[group.type] ?? []
            if (groupPlayers.length === 0) return null

            return (
              <section key={group.type}>
                <h2 className="mb-3 text-xl font-semibold">{group.heading}</h2>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer(0.05, 0.35 + groupIndex * 0.1)}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                >
                  {groupPlayers.map((player, index) => (
                    <motion.div
                      key={`${player.first_name}-${player.second_name}-${index}`}
                      variants={fadeUp}
                      {...cardHover}
                      className="rounded-lg bg-gray-100 p-3 dark:bg-gray-900"
                    >
                      <p className="font-medium">
                        {player.first_name} {player.second_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{POSITION_LABELS[player.element_type]}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ClubPage
