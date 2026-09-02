export default async function handler(req, res) {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')

    if (!response.ok) {
      res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
      return
    }

    const data = await response.json()

    const team = data.teams.find(
      (t) => t.name.toLowerCase() === 'arsenal',
    )

    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const players = data.elements
      .filter((element) => element.team === team.id)
      .map(({ first_name, second_name, element_type }) => ({
        first_name,
        second_name,
        element_type,
      }))

    res.status(200).json({ team: team.name, players })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
