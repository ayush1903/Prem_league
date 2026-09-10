import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fadeSlideUp } from '../lib/motion'
import ClubCrest from './ClubCrest'

type Props = {
  color: string
  label: string
  crestUrl?: string | null
  alt?: string
  known?: boolean
  title: string
  subtitle?: ReactNode
}

// Single-club version of the dark-ground/glow hero pattern introduced by
// Home's NextMatchHero — used wherever one club is the whole context
// (club page, player page), so that club's color reads as dominant.
function ClubHero({ color, label, crestUrl, alt, known = true, title, subtitle }: Props) {
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
        className="absolute -left-16 top-[-30%] h-[160%] w-[45%] opacity-30 blur-3xl"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-center gap-5 px-7 py-8 sm:px-9">
        <ClubCrest label={label} crestUrl={crestUrl} alt={alt} known={known} size="xl" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-4xl font-extrabold leading-none text-white sm:text-[2.75rem]">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  )
}

export default ClubHero
