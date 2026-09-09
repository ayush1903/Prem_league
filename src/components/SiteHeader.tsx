import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeSlideUp } from '../lib/motion'
import CompetitionLogo from './CompetitionLogo'

function SiteHeader() {
  const [emblem, setEmblem] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/fixtures?competition=PL')
      .then((res) => res.json())
      .then((data) => setEmblem(data.fixtures?.competition?.emblem ?? null))
      .catch(() => {})
  }, [])

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={fadeSlideUp}
      style={{ backgroundColor: '#38003C' }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <h1 className="inline-block text-3xl font-bold text-white">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <CompetitionLogo name="Premier League" emblemUrl={emblem} size="md" />
            Premier League
          </Link>
          <span
            className="mt-2 block h-1 w-full rounded-full"
            style={{ backgroundColor: '#00FF85' }}
          />
        </h1>
        <div className="flex items-center gap-6">
          <Link
            to="/table"
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Table
          </Link>
          <Link
            to="/fixtures"
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Fixtures
          </Link>
          <Link
            to="/transfers"
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Transfers
          </Link>
        </div>
      </div>
    </motion.header>
  )
}

export default SiteHeader
