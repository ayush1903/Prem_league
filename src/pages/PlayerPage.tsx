import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp, fadeUp, staggerContainer, cardHover } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'

type Player = {
  id: number
  first_name: string
  second_name: string
  element_type: number
  goals_scored: number
  assists: number
  minutes: number
  total_points: number
  now_cost: number
  form: string
  selected_by_percent: string
}

type TeamResponse = {
  team: string
  players: Player[]
}

type Status = 'loading' | 'ready' | 'not-found' | 'error'

const POSITION_LABELS: Record<number, string> = {
  1: 'Goalkeeper',
  2: 'Defender',
  3: 'Midfielder',
  4: 'Forward',
}

function PlayerNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <p className="text-gray-600 dark:text-gray-400">Player not found for this club.</p>
    </div>
  )
}

function PlayerPage() {
  const { slug, playerId } = useParams<{ slug: string; playerId: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)

  useEffect(() => {
    if (!slug || !playerId) {
      setStatus('not-found')
      return
    }

    setStatus('loading')
    setTeam(null)
    setPlayer(null)

    fetch(`/api/team?club=${encodeURIComponent(slug)}`)
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
      .then((data: TeamResponse | null) => {
        if (!data) return

        const match = (data.players ?? []).find((p) => p.id === Number(playerId))
        if (!match) {
          setStatus('not-found')
          return
        }

        setTeam(data)
        setPlayer(match)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [slug, playerId])

  if (status === 'not-found') {
    return <PlayerNotFoundPage />
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
        <p className="text-red-500">Failed to load player data</p>
      </div>
    )
  }

  if (status === 'loading' || !team || !player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
        <p>Loading player...</p>
      </div>
    )
  }

  const badgeLabel = (slug ?? '').toUpperCase()
  const price = `£${(player.now_cost / 10).toFixed(1)}m`

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to={`/club/${slug}`}
          className="mb-6 inline-block text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← {team.team}
        </Link>

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
            <h1 className="text-3xl font-semibold">
              {player.first_name} {player.second_name}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {POSITION_LABELS[player.element_type]} · {team.team}
            </p>
          </div>
        </motion.header>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.06, 0.2)}
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Goals</p>
            <p className="text-2xl font-bold">{player.goals_scored}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Assists</p>
            <p className="text-2xl font-bold">{player.assists}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Minutes Played</p>
            <p className="text-2xl font-bold">{player.minutes}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
            <p className="text-2xl font-bold">{player.total_points}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Price</p>
            <p className="text-2xl font-bold">{price}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Form</p>
            <p className="text-2xl font-bold">{player.form}</p>
          </motion.div>
          <motion.div variants={fadeUp} {...cardHover} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">Ownership</p>
            <p className="text-2xl font-bold">{player.selected_by_percent}%</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default PlayerPage
