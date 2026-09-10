import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, clubCardHover } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'
import ClubHero from '../components/ClubHero'
import SectionHeading from '../components/SectionHeading'
import SiteHeader from '../components/SiteHeader'

type Club = {
  id: number
  name: string
  short_name: string
  crest: string | null
}

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
  status: string
  news: string
  chance_of_playing_this_round: number | null
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

const AVAILABILITY_LABELS: Record<string, string> = {
  i: 'Injured',
  s: 'Suspended',
  d: 'Doubtful',
  u: 'Unavailable',
}

function PlayerNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <p className="text-gray-600 dark:text-gray-400">Player not found for this club.</p>
    </div>
  )
}

function PlayerPage() {
  const { slug, playerId } = useParams<{ slug: string; playerId: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [crest, setCrest] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !playerId) {
      setStatus('not-found')
      return
    }

    setStatus('loading')
    setTeam(null)
    setPlayer(null)
    setCrest(null)

    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => {
        const clubs: Club[] = data.clubs ?? []
        const club = clubs.find((c) => c.short_name.toUpperCase() === slug.toUpperCase())
        setCrest(club?.crest ?? null)
      })
      .catch(() => {})

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
      <div className="flex min-h-screen items-center justify-center bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
        <p className="text-red-500">Failed to load player data</p>
      </div>
    )
  }

  if (status === 'loading' || !team || !player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
        <p>Loading player...</p>
      </div>
    )
  }

  const badgeLabel = (slug ?? '').toUpperCase()
  const clubColor = getBadgeColor(badgeLabel)
  const price = `£${(player.now_cost / 10).toFixed(1)}m`

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to={`/club/${slug}`}
          className="mb-6 inline-block text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← {team.team}
        </Link>

        <ClubHero
          color={clubColor}
          label={badgeLabel}
          crestUrl={crest}
          alt={team.team}
          title={`${player.first_name} ${player.second_name}`}
          subtitle={`${POSITION_LABELS[player.element_type]} · ${team.team}`}
        />

        {player.status !== 'a' && player.news && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
          >
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {AVAILABILITY_LABELS[player.status] ?? 'Availability'}
            </p>
            <p className="mt-1 text-sm text-red-800 dark:text-red-300">{player.news}</p>
            {player.status === 'd' && player.chance_of_playing_this_round !== null && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {player.chance_of_playing_this_round}% chance of playing
              </p>
            )}
          </motion.div>
        )}

        <div className="mt-8">
          <SectionHeading color={clubColor}>Season stats</SectionHeading>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.06, 0.2)}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <motion.div
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Goals</p>
            <p className="font-display text-2xl font-extrabold">{player.goals_scored}</p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Assists</p>
            <p className="font-display text-2xl font-extrabold">{player.assists}</p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Minutes Played</p>
            <p className="font-display text-2xl font-extrabold">{player.minutes}</p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
            <p className="font-display text-2xl font-extrabold">{player.total_points}</p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Price</p>
            <p className="font-display text-2xl font-extrabold">{price}</p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Form</p>
            <p className="font-display text-2xl font-extrabold">{player.form}</p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Ownership</p>
            <p className="font-display text-2xl font-extrabold">{player.selected_by_percent}%</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default PlayerPage
