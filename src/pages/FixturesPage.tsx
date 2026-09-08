import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp, fadeUp, staggerContainer, cardHover } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'
import { normalizeTla } from '../lib/tla'

const MotionLink = motion.create(Link)

type Club = {
  id: number
  name: string
  short_name: string
}

type MatchTeam = {
  name: string
  tla: string
}

type Match = {
  id: number
  utcDate: string
  homeTeam: MatchTeam
  awayTeam: MatchTeam
}

type Competition = 'PL' | 'CL'

const COMPETITIONS: { code: Competition; label: string }[] = [
  { code: 'PL', label: 'Premier League' },
  { code: 'CL', label: 'Champions League' },
]

function formatMatchDate(utcDate: string): string {
  return new Date(utcDate).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function resolveClub(tla: string, clubsByShortName: Record<string, Club>): Club | null {
  return clubsByShortName[normalizeTla(tla)] ?? null
}

function TeamBadge({ team, club }: { team: MatchTeam; club: Club | null }) {
  const label = club?.short_name ?? team.tla
  const badgeClasses = club
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded font-bold text-white'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-400 font-bold text-white dark:bg-gray-600'

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={badgeClasses}
        style={{ backgroundColor: club ? getBadgeColor(club.short_name) : undefined, fontSize: '0.65rem' }}
      >
        {label}
      </div>
      <span className={`truncate ${club ? 'font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
        {club?.name ?? team.name}
      </span>
    </div>
  )
}

function FixturesPage() {
  const [competition, setCompetition] = useState<Competition>('PL')
  const [clubsByShortName, setClubsByShortName] = useState<Record<string, Club>>({})
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => {
        const clubs: Club[] = data.clubs ?? []
        setClubsByShortName(Object.fromEntries(clubs.map((club) => [club.short_name.toUpperCase(), club])))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setMatches([])

    fetch(`/api/fixtures?competition=${competition}`)
      .then((res) => res.json())
      .then((data) => setMatches(data.fixtures?.matches ?? []))
      .catch(() => setError('Failed to load fixtures'))
      .finally(() => setLoading(false))
  }, [competition])

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
            Fixtures
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
        <div className="mb-6 flex gap-2">
          {COMPETITIONS.map((tab) => (
            <button
              key={tab.code}
              type="button"
              onClick={() => setCompetition(tab.code)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                competition === tab.code
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500">{error}</p>}

        {!error && loading && <p className="text-gray-600 dark:text-gray-400">Loading fixtures...</p>}

        {!error && !loading && (
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {matches.length} upcoming {matches.length === 1 ? 'match' : 'matches'}
          </p>
        )}

        {!error && !loading && matches.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400">No upcoming fixtures found.</p>
        )}

        <motion.div
          key={competition}
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.04, 0.1)}
          className="flex flex-col gap-3"
        >
          {matches.map((match) => {
            const homeClub = resolveClub(match.homeTeam.tla, clubsByShortName)
            const awayClub = resolveClub(match.awayTeam.tla, clubsByShortName)

            return (
              <MotionLink
                key={match.id}
                to={`/match/${match.id}`}
                variants={fadeUp}
                {...cardHover}
                className="block rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
              >
                <p className="mb-3 text-xs text-gray-500">{formatMatchDate(match.utcDate)}</p>
                <div className="flex items-center justify-between gap-3">
                  <TeamBadge team={match.homeTeam} club={homeClub} />
                  <span className="shrink-0 text-xs font-medium text-gray-500">vs</span>
                  <TeamBadge team={match.awayTeam} club={awayClub} />
                </div>
              </MotionLink>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

export default FixturesPage
