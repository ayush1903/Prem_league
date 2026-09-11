import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fadeSlideUp } from '../lib/motion'
import ClubCrest from './ClubCrest'

type TeamSide = {
  label: string
  name: string
  crestUrl?: string | null
  alt?: string
  known?: boolean
  color: string
}

type Props = {
  home: TeamSide
  away: TeamSide
  time: string
  date: string
  eyebrow?: ReactNode
}

// Dual-club version of the dark-ground/glow hero: home color on the left,
// away color on the right. Originally built as Home's NextMatchHero;
// promoted here so the match page can reuse the exact same treatment.
function MatchHero({ home, away, time, date, eyebrow }: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeSlideUp}
      className="relative overflow-hidden rounded-xl"
      style={{ backgroundColor: '#0d0b10' }}
    >
      <div
        aria-hidden="true"
        className="absolute -left-10 top-[-20%] h-[140%] w-[45%] opacity-30 blur-3xl"
        style={{ backgroundColor: home.color }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-10 top-[-20%] h-[140%] w-[45%] opacity-30 blur-3xl"
        style={{ backgroundColor: away.color }}
      />
      {/* Legibility floor for the score/time: pulls the strip under it back
          toward the base color regardless of which two club colors are
          glowing on either side, instead of relying on every color pair
          blending safely on its own. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[36%] -translate-x-1/2"
        style={{ background: 'linear-gradient(to right, transparent, #0d0b10 30%, #0d0b10 70%, transparent)' }}
      />

      <div className="relative px-6 py-7 sm:px-8 sm:py-8">
        {eyebrow && <div className="mb-5 flex items-center gap-1.5 text-xs font-medium text-white/50">{eyebrow}</div>}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <ClubCrest label={home.label} crestUrl={home.crestUrl} alt={home.alt} known={home.known} size="xl" />
            <p className="truncate font-body text-base font-semibold text-white sm:text-lg">{home.name}</p>
          </div>

          <div className="text-center text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            <p className="font-display text-4xl font-extrabold leading-none sm:text-5xl">{time}</p>
            <p className="mt-2 text-xs text-white/50">{date}</p>
          </div>

          <div className="flex min-w-0 flex-row-reverse items-center gap-3 text-right sm:gap-4">
            <ClubCrest label={away.label} crestUrl={away.crestUrl} alt={away.alt} known={away.known} size="xl" />
            <p className="truncate font-body text-base font-semibold text-white sm:text-lg">{away.name}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default MatchHero
