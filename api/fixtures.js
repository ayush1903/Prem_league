import { createClient } from '@supabase/supabase-js'
import { normalizeTla } from './_lib/tla.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const CACHE_TTL_MS = 20 * 60 * 1000
const ALLOWED_COMPETITIONS = ['PL', 'CL']

async function fetchKnownShortNames() {
  const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')

  if (!response.ok) {
    throw new Error('Failed to fetch data from Fantasy Premier League API')
  }

  const data = await response.json()
  return new Set(data.teams.map((team) => team.short_name.toUpperCase()))
}

function isKnownClub(tla, knownShortNames) {
  if (!tla) return false
  return knownShortNames.has(normalizeTla(tla))
}

async function filterToKnownClubs(payload) {
  const knownShortNames = await fetchKnownShortNames()

  const matches = (payload.matches ?? []).filter(
    (match) =>
      isKnownClub(match.homeTeam?.tla, knownShortNames) || isKnownClub(match.awayTeam?.tla, knownShortNames),
  )

  return { ...payload, matches }
}

export default async function handler(req, res) {
  try {
    const competition = (req.query?.competition || '').toString().toUpperCase()

    if (!ALLOWED_COMPETITIONS.includes(competition)) {
      res.status(400).json({ error: `competition must be one of: ${ALLOWED_COMPETITIONS.join(', ')}` })
      return
    }

    const { data: cached, error: selectError } = await supabase
      .from('fixtures_cache')
      .select('data, updated_at')
      .eq('competition_code', competition)
      .maybeSingle()

    if (selectError) {
      console.error('fixtures: Supabase query failed', selectError)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL_MS) {
      res.status(200).json({ fixtures: cached.data })
      return
    }

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${competition}/matches?status=SCHEDULED`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY } },
    )

    if (!response.ok) {
      console.error('fixtures: football-data.org request failed', response.status, response.statusText)
      res.status(502).json({ error: 'Failed to fetch data from football-data.org' })
      return
    }

    let fixtures = await response.json()

    if (competition === 'CL') {
      try {
        fixtures = await filterToKnownClubs(fixtures)
      } catch (error) {
        console.error('fixtures: failed to filter CL matches to known clubs', error)
        res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
        return
      }
    }

    const { error: saveError } = await supabase
      .from('fixtures_cache')
      .upsert({ competition_code: competition, data: fixtures }, { onConflict: 'competition_code' })

    if (saveError) {
      console.error('fixtures: Supabase save failed', saveError)
      res.status(500).json({ error: 'Failed to save to Supabase' })
      return
    }

    res.status(200).json({ fixtures })
  } catch (error) {
    console.error('fixtures: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
