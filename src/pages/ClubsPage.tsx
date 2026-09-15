import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer } from '../lib/motion'
import { getBadgeColor } from '../lib/clubColors'
import ClubCrest from '../components/ClubCrest'
import SiteHeader from '../components/SiteHeader'

const MotionLink = motion.create(Link)

type Club = {
  id: number
  name: string
  short_name: string
  crest: string | null
}

function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clubs')
      .then((res) => res.json())
      .then((data) => setClubs(data.clubs ?? []))
      .catch(() => setError('Failed to load clubs'))
  }, [])

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 dark:bg-gray-950 dark:text-white">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold">PL Clubs</h1>

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
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="club-card flex flex-col items-center gap-3 rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-900"
              style={{ '--club': getBadgeColor(club.short_name) } as CSSProperties}
            >
              <ClubCrest label={club.short_name} crestUrl={club.crest} alt={club.name} size="xl" />
              <p className="text-sm font-medium">{club.name}</p>
            </MotionLink>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

export default ClubsPage
