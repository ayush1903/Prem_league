import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const CACHE_TTL_MS = 30 * 60 * 1000

// Cache-then-fetch standings payload (same shape football-data.org
// returns), shared by api/standings.js and api/clubs-analytics.js so the
// TTL/refetch logic isn't duplicated. Throws on failure — callers log
// req-specific context and pick the response status; errors carry a
// `.status` (502 for the upstream fetch failing) so api/standings.js can
// keep returning its existing distinct status codes.
export async function getStandings() {
  const { data: cached, error: selectError } = await supabase
    .from('standings_cache')
    .select('id, data, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    console.error('getStandings: Supabase query failed', selectError)
    throw new Error('Failed to query Supabase')
  }

  if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL_MS) {
    return cached.data
  }

  const response = await fetch('https://api.football-data.org/v4/competitions/PL/standings', {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
  })

  if (!response.ok) {
    console.error('getStandings: football-data.org request failed', response.status, response.statusText)
    const error = new Error('Failed to fetch data from football-data.org')
    error.status = 502
    throw error
  }

  const standings = await response.json()

  const { error: saveError } = cached
    ? await supabase.from('standings_cache').update({ data: standings }).eq('id', cached.id)
    : await supabase.from('standings_cache').insert({ data: standings })

  if (saveError) {
    console.error('getStandings: Supabase save failed', saveError)
    throw new Error('Failed to save to Supabase')
  }

  return standings
}

// Convenience: just the TOTAL table rows.
export async function getStandingsTable() {
  const standings = await getStandings()
  return standings.standings?.find((group) => group.type === 'TOTAL')?.table ?? []
}
