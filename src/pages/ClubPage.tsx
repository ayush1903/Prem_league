import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp, fadeUp, staggerContainer, cardHover } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'
import { normalizeTla } from '../lib/tla'

const MotionLink = motion.create(Link)

type Player = {
  id: number
  first_name: string
  second_name: string
  element_type: number
  status: string
  news: string
  chance_of_playing_this_round: number | null
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
  gross_spend: string | null
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

type NextMatch = {
  id: number
  utcDate: string
  competitionLabel: string
  opponentName: string
  isHome: boolean
}

type Status = 'loading' | 'ready' | 'not-found' | 'error'

const FIXTURE_COMPETITIONS: { code: string; label: string }[] = [
  { code: 'PL', label: 'Premier League' },
  { code: 'CL', label: 'Champions League' },
]

function extractClubMatches(matches: Match[], competitionLabel: string, shortName: string): NextMatch[] {
  return matches.flatMap((match): NextMatch[] => {
    const homeShortName = normalizeTla(match.homeTeam.tla)
    const awayShortName = normalizeTla(match.awayTeam.tla)

    if (homeShortName === shortName) {
      return [{ id: match.id, utcDate: match.utcDate, competitionLabel, opponentName: match.awayTeam.name, isHome: true }]
    }
    if (awayShortName === shortName) {
      return [{ id: match.id, utcDate: match.utcDate, competitionLabel, opponentName: match.homeTeam.name, isHome: false }]
    }
    return []
  })
}

function formatMatchDate(utcDate: string): string {
  return new Date(utcDate).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

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

// FPL's news field describes a permanent departure or loan move in prose
// (e.g. "Joined Fulham permanently", "Signed on loan for..."); those players
// are no longer really part of the club, so they're dropped from the squad
// list entirely rather than shown with a status badge.
function isUnavailable(player: Player): boolean {
  const news = player.news.toLowerCase()
  return (
    news.includes('permanently') ||
    news.includes('loan') ||
    news.includes('departed') ||
    news.includes('returned to')
  )
}

type StatusBadge = {
  label: string
  className: string
}

const BADGE_BASE_CLASSES = 'mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none'

function getStatusBadge(player: Player): StatusBadge | null {
  if (player.status === 'i') {
    return { label: 'Injured', className: `${BADGE_BASE_CLASSES} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400` }
  }
  if (player.status === 's') {
    return { label: 'Suspended', className: `${BADGE_BASE_CLASSES} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400` }
  }
  if (player.status === 'd') {
    const chance = player.chance_of_playing_this_round
    return {
      label: chance !== null ? `${chance}% chance` : 'Doubtful',
      className: `${BADGE_BASE_CLASSES} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400`,
    }
  }
  return null
}

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
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null)

  useEffect(() => {
    if (!slug) {
      setStatus('not-found')
      return
    }

    setStatus('loading')
    setTeam(null)
    setClubContent(null)
    setTransfers([])
    setNextMatch(null)

    const clubParam = `club=${encodeURIComponent(slug)}`
    const shortName = slug.toUpperCase()
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

    Promise.all(
      FIXTURE_COMPETITIONS.map(({ code, label }) =>
        fetch(`/api/fixtures?competition=${code}`)
          .then((res) => res.json())
          .then((data) => extractClubMatches(data.fixtures?.matches ?? [], label, shortName))
          .catch(() => []),
      ),
    ).then((matchGroups) => {
      const soonest = matchGroups
        .flat()
        .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0]
      setNextMatch(soonest ?? null)
    })
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
  const players = (team.players ?? []).filter((player) => !isUnavailable(player))
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

        {nextMatch && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
            className="mt-6 flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next match</p>
              <p className="mt-1 font-medium">
                {nextMatch.isHome ? 'vs' : '@'} {nextMatch.opponentName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {nextMatch.competitionLabel} · {nextMatch.isHome ? 'Home' : 'Away'}
              </p>
            </div>
            <p className="shrink-0 text-right text-sm text-gray-600 dark:text-gray-400">
              {formatMatchDate(nextMatch.utcDate)}
            </p>
          </motion.div>
        )}

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
            <p className="text-sm text-gray-600 dark:text-gray-400">Spend</p>
            <p className="text-lg font-bold">Net: {clubContent?.net_spend ?? '—'}</p>
            {clubContent?.gross_spend && (
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gross: {clubContent.gross_spend}</p>
            )}
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
                  {groupPlayers.map((player, index) => {
                    const statusBadge = getStatusBadge(player)

                    return (
                      <MotionLink
                        key={`${player.first_name}-${player.second_name}-${index}`}
                        to={`/club/${slug}/player/${player.id}`}
                        variants={fadeUp}
                        {...cardHover}
                        className="block rounded-lg bg-gray-100 p-3 dark:bg-gray-900"
                      >
                        <p className="font-medium">
                          {player.first_name} {player.second_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{POSITION_LABELS[player.element_type]}</p>
                        {statusBadge && <span className={statusBadge.className}>{statusBadge.label}</span>}
                      </MotionLink>
                    )
                  })}
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
