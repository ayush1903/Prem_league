import { useEffect, useState } from 'react'

type Player = {
  first_name: string
  second_name: string
  element_type: number
}

type TeamResponse = {
  team: string
  players: Player[]
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

function App() {
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/team')
      .then((res) => res.json())
      .then((data) => setTeam(data))
      .catch(() => setError('Failed to load team data'))
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p>Loading...</p>
      </div>
    )
  }

  const players = team.players ?? []
  const playersByType = players.reduce<Record<number, Player[]>>((acc, player) => {
    acc[player.element_type] = acc[player.element_type] ?? []
    acc[player.element_type].push(player)
    return acc
  }, {})

  const squadSize = players.length
  const defenderCount = (playersByType[2] ?? []).length
  const forwardCount = (playersByType[4] ?? []).length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg font-bold"
            style={{ backgroundColor: '#EF0107' }}
          >
            ARS
          </div>
          <h1 className="text-3xl font-semibold">{team.team}</h1>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-900 p-4">
            <p className="text-sm text-gray-400">Squad Size</p>
            <p className="text-2xl font-bold">{squadSize}</p>
          </div>
          <div className="rounded-lg bg-gray-900 p-4">
            <p className="text-sm text-gray-400">Defenders</p>
            <p className="text-2xl font-bold">{defenderCount}</p>
          </div>
          <div className="rounded-lg bg-gray-900 p-4">
            <p className="text-sm text-gray-400">Forwards</p>
            <p className="text-2xl font-bold">{forwardCount}</p>
          </div>
        </div>

        <div className="mt-10 space-y-8">
          {POSITION_GROUPS.map((group) => {
            const groupPlayers = playersByType[group.type] ?? []
            if (groupPlayers.length === 0) return null

            return (
              <section key={group.type}>
                <h2 className="mb-3 text-xl font-semibold">{group.heading}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {groupPlayers.map((player, index) => (
                    <div
                      key={`${player.first_name}-${player.second_name}-${index}`}
                      className="rounded-lg bg-gray-900 p-3"
                    >
                      <p className="font-medium">
                        {player.first_name} {player.second_name}
                      </p>
                      <p className="text-sm text-gray-400">{POSITION_LABELS[player.element_type]}</p>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default App
