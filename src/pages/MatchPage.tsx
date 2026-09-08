import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp, fadeUp, staggerContainer, cardHover } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'
import { normalizeTla } from '../lib/tla'
import { POSITION_LABELS, isUnavailable, getStatusBadge, type Player } from '../lib/players'

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

type FormEntry = {
  name: string
  position: number
  points: number
  playedGames: number
  won: number
  draw: number
  lost: number
  goalDifference: number
}

type H2HMatch = {
  id: number
  utcDate: string
  competition?: { name: string }
  homeTeam: MatchTeam
  awayTeam: MatchTeam
  score?: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: { home: number | null; away: number | null }
  }
}

// football-data.org's own `aggregates` block on the free tier doesn't
// reliably reflect the `matches` array it ships alongside (numberOfMatches
// consistently equals the request's `limit` rather than the real meeting
// count, and wins/draws/losses don't match the actual results) — so the
// summary is computed here from `matches` instead of trusted from upstream.
type HeadToHeadResponse = {
  headToHead: {
    matches?: H2HMatch[]
  }
  form: {
    home: FormEntry | null
    away: FormEntry | null
  }
}

type H2HSummary = {
  numberOfMatches: number
  totalGoals: number
  home: { wins: number; draws: number; losses: number }
  away: { wins: number; draws: number; losses: number }
}

function summarizeH2H(matches: H2HMatch[], homeTla: string, awayTla: string): H2HSummary {
  const home = normalizeTla(homeTla)
  const away = normalizeTla(awayTla)

  let homeWins = 0
  let awayWins = 0
  let draws = 0
  let totalGoals = 0

  for (const meeting of matches) {
    const meetingHome = normalizeTla(meeting.homeTeam.tla)
    const meetingAway = normalizeTla(meeting.awayTeam.tla)
    const homeGoals = meeting.score?.fullTime.home
    const awayGoals = meeting.score?.fullTime.away

    if (typeof homeGoals === 'number' && typeof awayGoals === 'number') {
      totalGoals += homeGoals + awayGoals
    }

    if (meeting.score?.winner === 'DRAW') {
      draws += 1
    } else if (meeting.score?.winner === 'HOME_TEAM') {
      if (meetingHome === home) homeWins += 1
      else if (meetingHome === away) awayWins += 1
    } else if (meeting.score?.winner === 'AWAY_TEAM') {
      if (meetingAway === home) homeWins += 1
      else if (meetingAway === away) awayWins += 1
    }
  }

  return {
    numberOfMatches: matches.length,
    totalGoals,
    home: { wins: homeWins, draws, losses: awayWins },
    away: { wins: awayWins, draws, losses: homeWins },
  }
}

// /api/team returns richer per-player fields than the shared status-badge
// type carries — points are only needed here, for ranking key players.
type SquadPlayer = Player & { total_points: number }

type TeamResponse = {
  team: string
  players: SquadPlayer[]
}

type Status = 'loading' | 'ready' | 'not-found' | 'error'

const KEY_PLAYER_COUNT = 5
const RECENT_MEETINGS_COUNT = 5

function formatMatchDate(utcDate: string): string {
  return new Date(utcDate).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatMeetingDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function keyPlayers(players: SquadPlayer[]): SquadPlayer[] {
  return players
    .filter((player) => !isUnavailable(player))
    .slice()
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, KEY_PLAYER_COUNT)
}

function ClubBadge({ name, shortName, size = 'md' }: { name: string; shortName: string; size?: 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-xs'
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={`flex ${dimensions} shrink-0 items-center justify-center rounded-lg font-bold text-white`}
        style={{ backgroundColor: getBadgeColor(shortName) }}
      >
        {shortName}
      </div>
      <p className="max-w-[10rem] text-sm font-medium">{name}</p>
    </div>
  )
}

function FormCard({ label, form }: { label: string; form: FormEntry | null }) {
  return (
    <motion.div variants={fadeUp} className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      {form ? (
        <>
          <p className="mt-1 text-lg font-semibold">
            {form.position}
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400"> · {form.points} pts</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {form.won}W {form.draw}D {form.lost}L · GD {form.goalDifference > 0 ? '+' : ''}
            {form.goalDifference}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Form unavailable</p>
      )}
    </motion.div>
  )
}

function KeyPlayersColumn({ club, players }: { club: Club | null; players: SquadPlayer[] }) {
  if (!club) {
    return (
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Squad unavailable for this club.</p>
      </div>
    )
  }

  const top = keyPlayers(players)

  if (top.length === 0) {
    return (
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading squad...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.05, 0.1)}
      className="flex flex-col gap-2"
    >
      {top.map((player) => {
        const statusBadge = getStatusBadge(player)
        return (
          <MotionLink
            key={player.id}
            to={`/club/${club.short_name.toLowerCase()}/player/${player.id}`}
            variants={fadeUp}
            {...cardHover}
            className="block rounded-lg bg-gray-100 p-3 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {player.first_name} {player.second_name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{POSITION_LABELS[player.element_type]}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{player.total_points} pts</p>
            </div>
            {statusBadge && <span className={statusBadge.className}>{statusBadge.label}</span>}
          </MotionLink>
        )
      })}
    </motion.div>
  )
}

function MatchNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <p className="text-gray-600 dark:text-gray-400">
        Match not found — it may no longer be an upcoming fixture.
      </p>
    </div>
  )
}

function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [match, setMatch] = useState<Match | null>(null)
  const [competitionLabel, setCompetitionLabel] = useState('')
  const [homeClub, setHomeClub] = useState<Club | null>(null)
  const [awayClub, setAwayClub] = useState<Club | null>(null)
  const [headToHead, setHeadToHead] = useState<HeadToHeadResponse | null>(null)
  const [homeSquad, setHomeSquad] = useState<SquadPlayer[]>([])
  const [awaySquad, setAwaySquad] = useState<SquadPlayer[]>([])

  useEffect(() => {
    const id = Number(matchId)

    if (!matchId || !Number.isInteger(id) || id <= 0) {
      setStatus('not-found')
      return
    }

    setStatus('loading')
    setMatch(null)
    setHomeClub(null)
    setAwayClub(null)
    setHeadToHead(null)
    setHomeSquad([])
    setAwaySquad([])

    Promise.all([
      fetch('/api/clubs')
        .then((res) => res.json())
        .catch(() => ({ clubs: [] })),
      ...COMPETITIONS.map(({ code, label }) =>
        fetch(`/api/fixtures?competition=${code}`)
          .then((res) => res.json())
          .then((data) => ({ label, matches: (data.fixtures?.matches ?? []) as Match[] }))
          .catch(() => ({ label, matches: [] as Match[] })),
      ),
    ]).then(([clubsData, ...fixtureGroups]) => {
      const clubs: Club[] = clubsData.clubs ?? []
      const clubsByShortName = Object.fromEntries(clubs.map((club) => [club.short_name.toUpperCase(), club]))

      const found = fixtureGroups
        .flatMap((group) => group.matches.map((m) => ({ match: m, label: group.label })))
        .find((entry) => entry.match.id === id)

      if (!found) {
        setStatus('not-found')
        return
      }

      setMatch(found.match)
      setCompetitionLabel(found.label)
      setStatus('ready')

      const home = clubsByShortName[normalizeTla(found.match.homeTeam.tla)] ?? null
      const away = clubsByShortName[normalizeTla(found.match.awayTeam.tla)] ?? null
      setHomeClub(home)
      setAwayClub(away)

      fetch(`/api/head-to-head?matchId=${id}`)
        .then((res) => res.json())
        .then((data: HeadToHeadResponse) => setHeadToHead(data))
        .catch(() => {})

      if (home) {
        fetch(`/api/team?club=${encodeURIComponent(home.short_name)}`)
          .then((res) => res.json())
          .then((data: TeamResponse) => setHomeSquad(data.players ?? []))
          .catch(() => {})
      }

      if (away) {
        fetch(`/api/team?club=${encodeURIComponent(away.short_name)}`)
          .then((res) => res.json())
          .then((data: TeamResponse) => setAwaySquad(data.players ?? []))
          .catch(() => {})
      }
    })
  }, [matchId])

  if (status === 'not-found') {
    return <MatchNotFoundPage />
  }

  if (status === 'loading' || !match) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
        <p>Loading match...</p>
      </div>
    )
  }

  const allMeetings = headToHead?.headToHead.matches ?? []
  const h2hSummary = allMeetings.length > 0 ? summarizeH2H(allMeetings, match.homeTeam.tla, match.awayTeam.tla) : null
  const recentMeetings = allMeetings.slice(0, RECENT_MEETINGS_COUNT)

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          to="/fixtures"
          className="mb-6 inline-block text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← Fixtures
        </Link>

        <motion.header initial="hidden" animate="visible" variants={fadeSlideUp}>
          <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
            {competitionLabel} · {formatMatchDate(match.utcDate)}
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 sm:gap-12">
            <ClubBadge name={homeClub?.name ?? match.homeTeam.name} shortName={homeClub?.short_name ?? match.homeTeam.tla} size="lg" />
            <span className="text-sm font-medium text-gray-500">vs</span>
            <ClubBadge name={awayClub?.name ?? match.awayTeam.name} shortName={awayClub?.short_name ?? match.awayTeam.tla} size="lg" />
          </div>
        </motion.header>

        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
          className="mt-10"
        >
          <h2 className="mb-3 text-xl font-semibold">Head-to-head</h2>
          {h2hSummary ? (
            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last {h2hSummary.numberOfMatches} {h2hSummary.numberOfMatches === 1 ? 'meeting' : 'meetings'} ·{' '}
                {h2hSummary.totalGoals} goals
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold">{h2hSummary.home.wins}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {homeClub?.name ?? match.homeTeam.name} wins
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{h2hSummary.home.draws}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Draws</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{h2hSummary.away.wins}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {awayClub?.name ?? match.awayTeam.name} wins
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No head-to-head history available.</p>
          )}

          {recentMeetings.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {recentMeetings.length < allMeetings.length ? 'Most recent results' : 'Results'}
              </p>
              {recentMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-2 text-sm dark:bg-gray-900"
                >
                  <span className="text-gray-600 dark:text-gray-400">{formatMeetingDate(meeting.utcDate)}</span>
                  <span className="font-medium">
                    {meeting.homeTeam.name} {meeting.score?.fullTime.home ?? '-'} – {meeting.score?.fullTime.away ?? '-'}{' '}
                    {meeting.awayTeam.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.06, 0.2)}
          className="mt-10"
        >
          <h2 className="mb-3 text-xl font-semibold">Season form</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormCard label={homeClub?.name ?? match.homeTeam.name} form={headToHead?.form.home ?? null} />
            <FormCard label={awayClub?.name ?? match.awayTeam.name} form={headToHead?.form.away ?? null} />
          </div>
        </motion.section>

        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Key players</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                {homeClub?.name ?? match.homeTeam.name}
              </p>
              <KeyPlayersColumn club={homeClub} players={homeSquad} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                {awayClub?.name ?? match.awayTeam.name}
              </p>
              <KeyPlayersColumn club={awayClub} players={awaySquad} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default MatchPage
