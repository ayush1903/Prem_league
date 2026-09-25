import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, clubCardHover } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'
import ClubCrest from '../components/ClubCrest'
import PlayerHeadshot from '../components/PlayerHeadshot'
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
  // Absent on squad rows cached before photos were added.
  photo?: string | null
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
  n: 'Not available',
}

// Two-beat reveal: the hero (photo, then name) lands first, and the stats
// only start once it has settled, rather than everything snapping in at once.
// Hero steps run back-to-back without overlapping, with a short hold after
// the photo so it reads on its own before the name arrives (~2s total).
const HERO_EASE = [0.22, 1, 0.36, 1] as const
const HERO_STEPS = {
  glow: { delay: 0, duration: 0.5 },
  photo: { delay: 0.5, duration: 0.7 },
  accentBar: { delay: 1.35, duration: 0.25 },
  name: { delay: 1.65, duration: 0.4 },
}
const STATS_DELAY = 2.1

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
  const fullName = `${player.first_name} ${player.second_name}`
  const price = `£${(player.now_cost / 10).toFixed(1)}m`
  const hasAvailabilityNote = player.status !== 'a' && Boolean(player.news || AVAILABILITY_LABELS[player.status])

  const headlineStats = [
    { label: 'Total Points', value: player.total_points },
    { label: 'Goals', value: player.goals_scored },
    { label: 'Assists', value: player.assists },
  ]
  const secondaryStats = [
    { label: 'Minutes', value: player.minutes.toLocaleString() },
    { label: 'Price', value: price },
    { label: 'Form', value: player.form },
    { label: 'Ownership', value: `${player.selected_by_percent}%` },
  ]

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          to={`/club/${slug}`}
          className="mb-6 inline-block text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← {team.team}
        </Link>

        {/* Beat one: photo-forward hero on the shared dark ground, lit by the club's color. */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl px-6 pb-8 pt-6"
          style={{ backgroundColor: '#0d0b10' }}
        >
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.45, scale: 1 }}
            transition={{ ...HERO_STEPS.glow, ease: HERO_EASE }}
            className="absolute left-1/2 top-6 -ml-32 h-64 w-64 rounded-full blur-3xl sm:-ml-40 sm:h-80 sm:w-80"
            style={{ backgroundColor: clubColor }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: `linear-gradient(to top, ${clubColor}26, transparent)` }}
          />

          <div className="relative flex items-center justify-between">
            <ClubCrest label={badgeLabel} crestUrl={crest} alt={team.team} size="sm" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              {POSITION_LABELS[player.element_type]}
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...HERO_STEPS.photo, ease: HERO_EASE }}
            className="relative -mt-2"
          >
            <PlayerHeadshot
              name={fullName}
              photoUrl={player.photo}
              color={clubColor}
              className="mx-auto h-60 w-60 sm:h-72 sm:w-72"
            />
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ ...HERO_STEPS.accentBar, ease: HERO_EASE }}
            className="relative mx-auto h-[3px] w-16 rounded-full"
            style={{ backgroundColor: clubColor }}
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...HERO_STEPS.name, ease: 'easeOut' }}
            className="relative mt-5 text-center"
          >
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">{player.first_name}</p>
            <h1 className="mt-1 break-words font-display text-5xl font-extrabold leading-none text-white sm:text-6xl">
              {player.second_name}
            </h1>
            <p className="mt-3 text-sm text-white/60">
              {POSITION_LABELS[player.element_type]} · {team.team}
            </p>
          </motion.div>
        </motion.section>

        {/* Beat two: availability + stats, held back until the hero has settled. */}
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, STATS_DELAY)}>
          {hasAvailabilityNote && (
            <motion.div
              variants={fadeUp}
              className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
            >
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {AVAILABILITY_LABELS[player.status] ?? 'Availability'}
              </p>
              {player.news && <p className="mt-1 text-sm text-red-800 dark:text-red-300">{player.news}</p>}
              {player.status === 'd' && player.chance_of_playing_this_round !== null && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {player.chance_of_playing_this_round}% chance of playing
                </p>
              )}
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="mt-8">
            <SectionHeading color={clubColor}>Season stats</SectionHeading>
          </motion.div>

          <motion.div variants={staggerContainer(0.06)} className="grid grid-cols-3 gap-3 sm:gap-4">
            {headlineStats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                {...clubCardHover(clubColor)}
                className="relative overflow-hidden rounded-xl p-4 text-white sm:p-5"
                style={{ backgroundColor: '#0d0b10' }}
              >
                <div
                  aria-hidden="true"
                  className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl"
                  style={{ backgroundColor: clubColor }}
                />
                <p className="relative text-xs text-white/60 sm:text-sm">{stat.label}</p>
                <p className="relative mt-1 font-display text-4xl font-extrabold leading-none sm:text-5xl">
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={staggerContainer(0.06)}
            className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:grid-cols-4 sm:gap-4"
          >
            {secondaryStats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                {...clubCardHover(clubColor)}
                className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                style={{ borderLeft: `3px solid ${clubColor}` }}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="font-display text-2xl font-extrabold">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default PlayerPage
