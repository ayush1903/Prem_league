import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { normalizeTla } from '../lib/tla'
import { getClubColor } from '../lib/clubColors'
import { formatKickoffTime, formatKickoffDate } from '../lib/dates'
import MatchHero from '../components/MatchHero'
import SiteHeader from '../components/SiteHeader'
import HistorySection from '../components/HistorySection'

const MotionLink = motion.create(Link)

type Club = {
  id: number
  name: string
  short_name: string
  crest: string | null
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
}

function NextMatchHero({ match, clubsByShortName }: { match: Match; clubsByShortName: Record<string, Club> }) {
  const homeClub = clubsByShortName[normalizeTla(match.homeTeam.tla)] ?? null
  const awayClub = clubsByShortName[normalizeTla(match.awayTeam.tla)] ?? null

  return (
    <MotionLink to={`/match/${match.id}`} className="block transition-opacity hover:opacity-95">
      <MatchHero
        eyebrow="Next match"
        time={formatKickoffTime(match.utcDate)}
        date={formatKickoffDate(match.utcDate)}
        home={{
          label: homeClub?.short_name ?? match.homeTeam.tla,
          name: homeClub?.name ?? match.homeTeam.name,
          crestUrl: homeClub?.crest ?? match.homeTeam.crest,
          known: Boolean(homeClub),
          color: getClubColor(homeClub?.short_name ?? match.homeTeam.tla, Boolean(homeClub)),
        }}
        away={{
          label: awayClub?.short_name ?? match.awayTeam.tla,
          name: awayClub?.name ?? match.awayTeam.name,
          crestUrl: awayClub?.crest ?? match.awayTeam.crest,
          known: Boolean(awayClub),
          color: getClubColor(awayClub?.short_name ?? match.awayTeam.tla, Boolean(awayClub)),
        }}
      />
    </MotionLink>
  )
}

function Home() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nextMatch, setNextMatch] = useState<Match | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => setClubs(data.clubs ?? []))
      .catch(() => setError('Failed to load clubs'))

    fetch('/api/fixtures?competition=PL')
      .then((res) => res.json())
      .then((data) => {
        const matches: Match[] = data.fixtures?.matches ?? []
        const soonest = [...matches].sort(
          (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
        )[0]
        setNextMatch(soonest ?? null)
      })
      .catch(() => setNextMatch(null))
  }, [])

  const clubsByShortName = Object.fromEntries(clubs.map((club) => [club.short_name.toUpperCase(), club]))

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />

      <HistorySection />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {error && <p className="text-red-500">{error}</p>}

        {!error && clubs.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400">Loading clubs...</p>
        )}

        {nextMatch === undefined || (nextMatch && clubs.length === 0) ? (
          <div className="mb-8 h-[164px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-900" />
        ) : (
          nextMatch && (
            <div className="mb-8">
              <NextMatchHero match={nextMatch} clubsByShortName={clubsByShortName} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Home
