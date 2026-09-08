import { createClient } from '@supabase/supabase-js'
import { normalizeTla } from './_lib/tla.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

// Reads real club crests out of our own standings cache (already fetched
// from football-data.org for /table) rather than calling out again here —
// /api/clubs is on the hot path for nearly every page.
async function getCrestByShortName() {
  const { data: cached, error } = await supabase
    .from('standings_cache')
    .select('data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('clubs: Supabase standings lookup failed', error)
    return {}
  }

  const table = cached?.data?.standings?.find((group) => group.type === 'TOTAL')?.table ?? []

  return Object.fromEntries(
    table
      .map((row) => [normalizeTla(row.team.tla).toUpperCase(), row.team.crest])
      .filter(([, crest]) => Boolean(crest)),
  )
}

export default async function handler(req, res) {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')

    if (!response.ok) {
      console.error('clubs: FPL API request failed', response.status, response.statusText)
      res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
      return
    }

    const data = await response.json()
    const crestByShortName = await getCrestByShortName()

    const clubs = data.teams.map(({ id, name, short_name }) => ({
      id,
      name,
      short_name,
      crest: crestByShortName[short_name.toUpperCase()] ?? null,
    }))

    res.status(200).json({ clubs })
  } catch (error) {
    console.error('clubs: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
