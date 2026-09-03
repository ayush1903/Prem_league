export default async function handler(req, res) {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')

    if (!response.ok) {
      res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
      return
    }

    const data = await response.json()

    const clubs = data.teams.map(({ id, name, short_name }) => ({
      id,
      name,
      short_name,
    }))

    res.status(200).json({ clubs })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
