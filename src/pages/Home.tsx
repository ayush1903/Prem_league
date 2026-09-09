import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, cardHover } from '../lib/motion'
import ClubCrest from '../components/ClubCrest'
import SiteHeader from '../components/SiteHeader'

const MotionLink = motion.create(Link)

type Club = {
  id: number
  name: string
  short_name: string
  crest: string | null
}

function Home() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => setClubs(data.clubs ?? []))
      .catch(() => setError('Failed to load clubs'))
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {error && <p className="text-red-500">{error}</p>}

        {!error && clubs.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400">Loading clubs...</p>
        )}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.05, 0.15)}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {clubs.map((club) => (
            <MotionLink
              key={club.id}
              to={`/club/${club.short_name.toLowerCase()}`}
              variants={fadeUp}
              {...cardHover}
              className="flex flex-col items-center gap-3 rounded-lg bg-gray-100 p-4 text-center transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <ClubCrest label={club.short_name} crestUrl={club.crest} alt={club.name} size="lg" />
              <p className="text-sm font-medium">{club.name}</p>
            </MotionLink>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

export default Home
