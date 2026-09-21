import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, clubCardHover } from '../lib/motion'
import { normalizeTla } from '../lib/tla'
import { getBadgeColor } from '../lib/clubColors'
import { POSITION_LABELS, isUnavailable, getStatusBadge, type Player } from '../lib/players'
import ClubCrest from '../components/ClubCrest'
import ClubHero from '../components/ClubHero'
import CompetitionLogo from '../components/CompetitionLogo'
import { FormIcon, type FormResult } from '../components/FormStrip'
import SectionHeading from '../components/SectionHeading'
import SiteHeader from '../components/SiteHeader'
import SpendPerformanceChart, { type SpendPoint } from '../components/SpendPerformanceChart'
import AttackDefenseChart, { type AttackDefensePoint } from '../components/AttackDefenseChart'

const MotionLink = motion.create(Link)

type Club = {
  id: number
  name: string
  short_name: string
  crest: string | null
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
  crest: string | null
}

type Match = {
  id: number
  utcDate: string
  homeTeam: MatchTeam
  awayTeam: MatchTeam
  competition?: { name: string; emblem: string | null }
}

type NextMatch = {
  id: number
  utcDate: string
  competitionLabel: string
  competitionEmblem: string | null
  opponentName: string
  opponentShortName: string
  opponentCrest: string | null
  isHome: boolean
}

type SpendPointWithResidual = SpendPoint & { residual: number }
type AttackDefensePointWithBalance = AttackDefensePoint & { balanceScore: number }

type ClubsAnalytics = {
  spendVsPerformance: {
    points: SpendPointWithResidual[]
    correlation: number | null
    sampleSize: number
    slope: number
    intercept: number
  }
  attackVsDefense: {
    points: AttackDefensePointWithBalance[]
    avgGoalsFor: number
    avgGoalsAgainst: number
  }
}

// Same last-5 window as club-form's `form` letters, keeping full match
// details instead — index-aligned with `form` (same left-padding), so
// pairing formLetters[i] with results[i] gives the outcome for that match.
type MatchResultDetail = {
  opponent: string | null
  opponentTla: string | null
  score: string | null
  date: string | null
  competition: string | null
  isHome: boolean
}

type ClubFormResponse = {
  form: Record<string, FormResult[]>
  results: Record<string, (MatchResultDetail | null)[]>
}

type Status = 'loading' | 'ready' | 'not-found' | 'error'

const FIXTURE_COMPETITIONS: { code: string; label: string }[] = [
  { code: 'PL', label: 'Premier League' },
  { code: 'CL', label: 'Champions League' },
]

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'matches', label: 'Matches' },
  { id: 'squad', label: 'Squad' },
  { id: 'profile', label: 'Profile' },
] as const

type TabId = (typeof TABS)[number]['id']

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value)
}

function extractClubMatches(matches: Match[], competitionLabel: string, shortName: string): NextMatch[] {
  return matches.flatMap((match): NextMatch[] => {
    const homeShortName = normalizeTla(match.homeTeam.tla)
    const awayShortName = normalizeTla(match.awayTeam.tla)
    const competitionEmblem = match.competition?.emblem ?? null

    if (homeShortName === shortName) {
      return [
        {
          id: match.id,
          utcDate: match.utcDate,
          competitionLabel,
          competitionEmblem,
          opponentName: match.awayTeam.name,
          opponentShortName: normalizeTla(match.awayTeam.tla),
          opponentCrest: match.awayTeam.crest,
          isHome: true,
        },
      ]
    }
    if (awayShortName === shortName) {
      return [
        {
          id: match.id,
          utcDate: match.utcDate,
          competitionLabel,
          competitionEmblem,
          opponentName: match.homeTeam.name,
          opponentShortName: normalizeTla(match.homeTeam.tla),
          opponentCrest: match.homeTeam.crest,
          isHome: false,
        },
      ]
    }
    return []
  })
}

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
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

const FIXTURES_PREVIEW_COUNT = 5

const POSITION_GROUPS: { type: number; heading: string }[] = [
  { type: 1, heading: 'Goalkeepers' },
  { type: 2, heading: 'Defenders' },
  { type: 3, heading: 'Midfielders' },
  { type: 4, heading: 'Forwards' },
]

const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1'

function ClubNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <p className="text-gray-600 dark:text-gray-400">
        Club not found — this doesn't match a current Premier League club.
      </p>
    </div>
  )
}

function ClubPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [clubContent, setClubContent] = useState<ClubContent | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<NextMatch[]>([])
  const [showAllFixtures, setShowAllFixtures] = useState(false)
  const [clubsByShortName, setClubsByShortName] = useState<Record<string, Club>>({})
  const [analytics, setAnalytics] = useState<ClubsAnalytics | null>(null)
  const [clubForm, setClubForm] = useState<ClubFormResponse | null>(null)

  const tabParam = searchParams.get('tab')
  const activeTab: TabId = isTabId(tabParam) ? tabParam : 'overview'

  function handleTabChange(tab: TabId) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', tab)
        return next
      },
      { replace: true },
    )
  }

  // League-wide, not per-club — fetched once rather than inside the
  // per-slug effect below (its data doesn't change when slug changes).
  useEffect(() => {
    fetch('/api/clubs-analytics')
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch(() => {})

    fetch('/api/club-form')
      .then((res) => res.json())
      .then((data) => setClubForm({ form: data.form ?? {}, results: data.results ?? {} }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!slug) {
      setStatus('not-found')
      return
    }

    setStatus('loading')
    setTeam(null)
    setClubContent(null)
    setTransfers([])
    setUpcomingMatches([])
    setShowAllFixtures(false)

    const clubParam = `club=${encodeURIComponent(slug)}`
    const shortName = slug.toUpperCase()
    const previewParam = isPreview ? '&preview=1' : ''

    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => {
        const clubs: Club[] = data.clubs ?? []
        setClubsByShortName(Object.fromEntries(clubs.map((c) => [c.short_name.toUpperCase(), c])))
      })
      .catch(() => {})

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
      const sorted = matchGroups
        .flat()
        .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
      setUpcomingMatches(sorted)
    })
  }, [slug])

  if (status === 'not-found') {
    return <ClubNotFoundPage />
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
        <p className="text-red-500">Failed to load team data</p>
      </div>
    )
  }

  if (status === 'loading' || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
        <p>Loading squad — first visit for this club can take a moment...</p>
      </div>
    )
  }

  const badgeLabel = (slug ?? '').toUpperCase()
  const clubColor = getBadgeColor(badgeLabel)
  const crest = clubsByShortName[badgeLabel]?.crest ?? null
  const players = (team.players ?? []).filter((player) => !isUnavailable(player))
  const playersByType = players.reduce<Record<number, Player[]>>((acc, player) => {
    acc[player.element_type] = acc[player.element_type] ?? []
    acc[player.element_type].push(player)
    return acc
  }, {})

  const squadSize = players.length
  const goalkeeperCount = (playersByType[1] ?? []).length
  const defenderCount = (playersByType[2] ?? []).length
  const midfielderCount = (playersByType[3] ?? []).length
  const forwardCount = (playersByType[4] ?? []).length

  const nextMatch = upcomingMatches[0] ?? null

  const formLetters = clubForm?.form[badgeLabel] ?? []
  const matchDetails = clubForm?.results[badgeLabel] ?? []
  const recentResults = matchDetails
    .map((detail, index) => (detail ? { detail, outcome: formLetters[index] ?? null } : null))
    .filter((entry): entry is { detail: MatchResultDetail; outcome: FormResult } => entry !== null)
    .reverse()

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-10">
        {isPreview && (
          <div className="mb-6 rounded-lg border border-yellow-400 bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-300">
            Preview mode — showing draft content that isn't published yet.
          </div>
        )}

        <ClubHero
          color={clubColor}
          label={badgeLabel}
          crestUrl={crest}
          alt={team.team}
          title={team.team}
          subtitle={
            clubContent && (clubContent.manager || clubContent.formation)
              ? [clubContent.manager, clubContent.formation].filter(Boolean).join(' · ')
              : undefined
          }
        />

        {nextMatch && (
          <MotionLink
            to={`/match/${nextMatch.id}`}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            {...clubCardHover(clubColor)}
            className="mt-6 flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            style={{ borderLeft: `3px solid ${clubColor}` }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <ClubCrest label={nextMatch.opponentShortName} crestUrl={nextMatch.opponentCrest} alt={nextMatch.opponentName} size="xs" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next match</p>
                <p className="mt-1 truncate font-medium">
                  {nextMatch.isHome ? 'vs' : '@'} {nextMatch.opponentName}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <CompetitionLogo name={nextMatch.competitionLabel} emblemUrl={nextMatch.competitionEmblem} size="sm" />
                  · {nextMatch.isHome ? 'Home' : 'Away'}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-right text-sm text-gray-600 dark:text-gray-400">
              {formatMatchDate(nextMatch.utcDate)}
            </p>
          </MotionLink>
        )}

        <nav role="tablist" aria-label="Club sections" className="mt-8 flex gap-6 border-b border-gray-200 dark:border-gray-800">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`relative -mb-px pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.span
                    layoutId="club-tab-indicator"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: clubColor }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {clubContent && (clubContent.club_summary || clubContent.playstyle_summary) && (
                <motion.section
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-4 rounded-lg bg-gray-100 p-5 dark:bg-gray-900"
                >
                  {clubContent.club_summary && (
                    <p className="text-gray-800 dark:text-gray-200">{clubContent.club_summary}</p>
                  )}
                  {clubContent.playstyle_summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{clubContent.playstyle_summary}</p>
                  )}
                </motion.section>
              )}

              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer(0.06, 0.1)}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
              >
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Squad Size</p>
                  <p className="font-display text-2xl font-extrabold">{squadSize}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Goalkeepers</p>
                  <p className="font-display text-2xl font-extrabold">{goalkeeperCount}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Defenders</p>
                  <p className="font-display text-2xl font-extrabold">{defenderCount}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Midfielders</p>
                  <p className="font-display text-2xl font-extrabold">{midfielderCount}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Forwards</p>
                  <p className="font-display text-2xl font-extrabold">{forwardCount}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Spend</p>
                  <p className="text-lg font-bold">Net: {clubContent?.net_spend ?? '—'}</p>
                  {clubContent?.gross_spend && (
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gross: {clubContent.gross_spend}</p>
                  )}
                </motion.div>
              </motion.div>

              {analytics && (
                <section>
                  <SectionHeading color={clubColor}>{team.team} vs. the league</SectionHeading>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(() => {
                      const own = analytics.spendVsPerformance.points.find((p) => p.shortName.toUpperCase() === badgeLabel)
                      if (!own) return null

                      const rank =
                        [...analytics.spendVsPerformance.points]
                          .sort((a, b) => b.netSpendM - a.netSpendM)
                          .findIndex((p) => p.shortName === own.shortName) + 1

                      return (
                        <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900" style={{ borderLeft: `3px solid ${clubColor}` }}>
                          <p className="mb-2 text-sm font-semibold">Spend vs. performance</p>
                          <SpendPerformanceChart
                            points={analytics.spendVsPerformance.points}
                            slope={analytics.spendVsPerformance.slope}
                            intercept={analytics.spendVsPerformance.intercept}
                            highlightClub={badgeLabel}
                            height={200}
                          />
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: clubColor }} />
                              {team.team}
                            </span>
                            <span className="flex items-center gap-1">
                              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
                              other clubs
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                            <strong>{team.team}:</strong> {ordinal(rank)}-highest net spend (£{own.netSpendM.toFixed(1)}m),{' '}
                            {own.points} pts — {own.residual >= 0 ? `+${own.residual.toFixed(1)} above` : `${own.residual.toFixed(1)} below`}{' '}
                            what that spend predicts.
                          </p>
                        </div>
                      )
                    })()}

                    {(() => {
                      const own = analytics.attackVsDefense.points.find((p) => p.shortName.toUpperCase() === badgeLabel)
                      if (!own) return null

                      const rank =
                        [...analytics.attackVsDefense.points]
                          .sort((a, b) => b.balanceScore - a.balanceScore)
                          .findIndex((p) => p.shortName === own.shortName) + 1

                      return (
                        <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900" style={{ borderLeft: `3px solid ${clubColor}` }}>
                          <p className="mb-2 text-sm font-semibold">Attack vs. defense</p>
                          <AttackDefenseChart
                            points={analytics.attackVsDefense.points}
                            avgGoalsFor={analytics.attackVsDefense.avgGoalsFor}
                            avgGoalsAgainst={analytics.attackVsDefense.avgGoalsAgainst}
                            highlightClub={badgeLabel}
                            height={200}
                          />
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: clubColor }} />
                              {team.team}
                            </span>
                            <span className="flex items-center gap-1">
                              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
                              other clubs
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                            <strong>{team.team}:</strong> {own.balanceScore >= 0 ? '+' : ''}
                            {own.balanceScore.toFixed(0)} balance vs. league average — {ordinal(rank)}-furthest into the
                            strong-attack/strong-defense quadrant.
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-8">
              <section>
                <SectionHeading color={clubColor}>Recent results</SectionHeading>
                {recentResults.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No recent results yet.</p>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer(0.05, 0.1)}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {recentResults.map(({ detail, outcome }, index) => {
                      const opponentCrest = detail.opponentTla ? clubsByShortName[detail.opponentTla]?.crest ?? null : null

                      return (
                        <motion.div
                          key={`${detail.opponentTla ?? detail.opponent ?? 'unknown'}-${detail.date ?? index}`}
                          variants={fadeUp}
                          {...clubCardHover(clubColor)}
                          className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                          style={{ borderLeft: `3px solid ${clubColor}` }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <ClubCrest
                                label={detail.opponentTla ?? '??'}
                                crestUrl={opponentCrest}
                                alt={detail.opponent ?? undefined}
                                size="xs"
                              />
                              <p className="truncate text-sm font-medium">
                                {detail.isHome ? 'vs' : '@'} {detail.opponent ?? 'Unknown opponent'}
                              </p>
                            </div>
                            <FormIcon result={outcome} size="md" />
                          </div>
                          <p className="mt-2 font-display text-xl font-extrabold">{detail.score ?? '—'}</p>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {detail.competition ?? 'Premier League'} · {detail.isHome ? 'Home' : 'Away'}
                          </p>
                          {detail.date && <p className="mt-1 text-xs text-gray-500">{formatMatchDate(detail.date)}</p>}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </section>

              <section>
                <SectionHeading color={clubColor}>Upcoming fixtures</SectionHeading>
                {upcomingMatches.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No upcoming fixtures scheduled.</p>
                ) : (
                  <>
                    <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.05, 0.05)} className="space-y-3">
                      {(showAllFixtures ? upcomingMatches : upcomingMatches.slice(0, FIXTURES_PREVIEW_COUNT)).map((match) => (
                        <MotionLink
                          key={match.id}
                          to={`/match/${match.id}`}
                          variants={fadeUp}
                          {...clubCardHover(clubColor)}
                          className="flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                          style={{ borderLeft: `3px solid ${clubColor}` }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <ClubCrest label={match.opponentShortName} crestUrl={match.opponentCrest} alt={match.opponentName} size="xs" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {match.isHome ? 'vs' : '@'} {match.opponentName}
                              </p>
                              <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                <CompetitionLogo name={match.competitionLabel} emblemUrl={match.competitionEmblem} size="sm" />
                                · {match.isHome ? 'Home' : 'Away'}
                              </p>
                            </div>
                          </div>
                          <p className="shrink-0 text-right text-sm text-gray-600 dark:text-gray-400">
                            {formatMatchDate(match.utcDate)}
                          </p>
                        </MotionLink>
                      ))}
                    </motion.div>

                    {!showAllFixtures && upcomingMatches.length > FIXTURES_PREVIEW_COUNT && (
                      <button
                        type="button"
                        onClick={() => setShowAllFixtures(true)}
                        className="mt-3 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      >
                        Show all {upcomingMatches.length} fixtures
                      </button>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {activeTab === 'squad' && (
            <div className="space-y-8">
              {POSITION_GROUPS.map((group, groupIndex) => {
                const groupPlayers = playersByType[group.type] ?? []
                if (groupPlayers.length === 0) return null

                return (
                  <section key={group.type}>
                    <SectionHeading color={clubColor}>{group.heading}</SectionHeading>
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={staggerContainer(0.05, groupIndex * 0.1)}
                      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                    >
                      {groupPlayers.map((player, index) => {
                        const statusBadge = getStatusBadge(player)

                        return (
                          <MotionLink
                            key={`${player.first_name}-${player.second_name}-${index}`}
                            to={`/club/${slug}/player/${player.id}`}
                            variants={fadeUp}
                            {...clubCardHover(clubColor)}
                            className="block rounded-lg bg-gray-100 p-3 dark:bg-gray-900"
                            style={{ borderLeft: `3px solid ${clubColor}` }}
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
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer(0.06, 0)}
                className="grid grid-cols-2 gap-4 sm:grid-cols-4"
              >
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manager</p>
                  <p className="font-display text-lg font-extrabold">{clubContent?.manager ?? '—'}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Formation</p>
                  <p className="font-display text-lg font-extrabold">{clubContent?.formation ?? '—'}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Net spend</p>
                  <p className="font-display text-lg font-extrabold">{clubContent?.net_spend ?? '—'}</p>
                </motion.div>
                <motion.div
                  variants={fadeUp}
                  {...clubCardHover(clubColor)}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${clubColor}` }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gross spend</p>
                  <p className="font-display text-lg font-extrabold">{clubContent?.gross_spend ?? '—'}</p>
                </motion.div>
              </motion.div>

              {transfers.length > 0 && (
                <section>
                  <SectionHeading color={clubColor}>Transfers</SectionHeading>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer(0.06, 0.1)}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    {transfers.map((transfer, index) => (
                      <motion.div
                        key={`${transfer.player_name}-${index}`}
                        variants={fadeUp}
                        {...clubCardHover(clubColor)}
                        className="rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                        style={{ borderLeft: `3px solid ${clubColor}` }}
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClubPage
