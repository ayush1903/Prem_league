import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Club = {
  id: number
  name: string
  short_name: string
}

// Deterministic placeholder color for clubs whose real brand color isn't wired up yet.
function hashHue(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function getBadgeColor(shortName: string): string {
  if (shortName === 'ARS') return '#EF0107'
  return `hsl(${hashHue(shortName)}, 60%, 38%)`
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
    <div className="min-h-screen bg-gray-950 text-white">
      <header style={{ backgroundColor: '#38003C' }}>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="inline-block text-3xl font-bold">
            Premier League
            <span
              className="mt-2 block h-1 w-full rounded-full"
              style={{ backgroundColor: '#00FF85' }}
            />
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {error && <p className="text-red-500">{error}</p>}

        {!error && clubs.length === 0 && <p className="text-gray-400">Loading clubs...</p>}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {clubs.map((club) => (
            <Link
              key={club.id}
              to={`/club/${club.short_name.toLowerCase()}`}
              className="flex flex-col items-center gap-3 rounded-lg bg-gray-900 p-4 text-center transition-colors hover:bg-gray-800"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-lg font-bold"
                style={{ backgroundColor: getBadgeColor(club.short_name) }}
              >
                {club.short_name}
              </div>
              <p className="text-sm font-medium">{club.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
