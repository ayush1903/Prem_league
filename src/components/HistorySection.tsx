import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, clubCardHover } from '../lib/motion'
import { getClubColor, CLUB_COLORS } from '../lib/clubColors'
import PersonPhoto from './PersonPhoto'
import SectionHeading from './SectionHeading'

type EraCard = {
  manager_name: string
  club_name: string
  era_label: string | null
  photo_url: string | null
  headline_stat: string
  headline_stat_label: string
  summary: string | null
}

// Historical clubs referenced by these era cards, mapped to the short codes
// getClubColor expects. Leicester isn't one of the current 20 tracked clubs,
// so it deliberately falls through to the neutral fallback color.
const CLUB_SHORT_NAMES: Record<string, string> = {
  'Manchester United': 'MUN',
  Arsenal: 'ARS',
  Chelsea: 'CHE',
  'Leicester City': 'LEI',
  Liverpool: 'LIV',
  'Manchester City': 'MCI',
}

const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1'

function EraCard({ card }: { card: EraCard }) {
  const shortName = CLUB_SHORT_NAMES[card.club_name] ?? card.club_name
  const known = shortName.toUpperCase() in CLUB_COLORS
  const color = getClubColor(shortName, known)

  return (
    <motion.div
      variants={fadeUp}
      {...clubCardHover(color)}
      className="relative overflow-hidden rounded-xl"
      style={{ backgroundColor: '#0d0b10' }}
    >
      <div
        aria-hidden="true"
        className="absolute -left-10 -top-10 h-40 w-40 opacity-30 blur-3xl"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex flex-col gap-4 p-6">
        <div className="flex items-start gap-4">
          <PersonPhoto name={card.manager_name} photoUrl={card.photo_url} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-body text-base font-semibold text-white">{card.manager_name}</p>
            <p className="text-sm text-white/50">
              {card.club_name}
              {card.era_label ? ` · ${card.era_label}` : ''}
            </p>
          </div>
        </div>

        <div>
          <p className="font-display text-4xl font-extrabold leading-none text-white">{card.headline_stat}</p>
          <p className="mt-1 text-xs text-white/50">{card.headline_stat_label}</p>
        </div>

        {card.summary && <p className="text-sm text-white/70">{card.summary}</p>}
      </div>
    </motion.div>
  )
}

// Homepage storytelling section: six manager-era cards sitting between the
// header and the existing next-match/club-grid dashboard. Curated content
// (draft/published via history_content), same pattern as club_content.
function HistorySection() {
  const [cards, setCards] = useState<EraCard[] | null>(null)

  useEffect(() => {
    const previewParam = isPreview ? '?preview=1' : ''

    fetch(`/api/history-content${previewParam}`)
      .then((res) => res.json())
      .then((data) => setCards(data.historyContent ?? []))
      .catch(() => setCards([]))
  }, [])

  if (cards === null || cards.length === 0) return null

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <SectionHeading color="#00FF85">Premier League Icons</SectionHeading>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.05, 0.15)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card) => (
          <EraCard key={card.manager_name} card={card} />
        ))}
      </motion.div>
    </div>
  )
}

export default HistorySection
