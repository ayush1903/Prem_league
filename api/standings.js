import { getStandings } from './_lib/standings.js'

export default async function handler(req, res) {
  try {
    const standings = await getStandings()
    res.status(200).json({ standings })
  } catch (error) {
    console.error('standings: unhandled error', error)
    res.status(error.status ?? 500).json({ error: error.message ?? 'Internal server error' })
  }
}
