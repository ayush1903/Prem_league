// Fetches FPL's bootstrap-static payload and returns the team record
// (id, name, short_name, ...) matching the given short_name (e.g. "MCI").
export async function resolveClub(shortName) {
  const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')

  if (!response.ok) {
    throw new Error('Failed to fetch data from Fantasy Premier League API')
  }

  const data = await response.json()
  const team = data.teams.find((t) => t.short_name.toLowerCase() === shortName.toLowerCase())

  return { data, team: team ?? null }
}
