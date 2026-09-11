import { createClient } from '@supabase/supabase-js'
import { normalizeTla } from './_lib/tla.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const CACHE_TTL_MS = 60 * 60 * 1000
const LAST_N = 5

async function fetchFinished(season) {
  const url = season
    ? `https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED&season=${season}`
    : 'https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED'

  const response = await fetch(url, { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY } })

  if (!response.ok) {
    throw new Error(`football-data.org request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Pulls current-season finished matches plus the prior season's, so a
// club's last-5 strip stays filled with real results across the season
// boundary (matching how Google/ESPN-style form widgets behave) instead of
// showing mostly empty circles for the first ~5 gameweeks of every season.
// A club with no matches in either payload (e.g. just promoted) correctly
// falls back to "not yet played" padding, since there's nothing to reach
// back into.
async function fetchFinishedAcrossSeasons() {
  const current = await fetchFinished()
  const currentSeasonYear = Number(current.filters?.season)
  const previous = Number.isInteger(currentSeasonYear) ? await fetchFinished(currentSeasonYear - 1) : { matches: [] }

  return [...(previous.matches ?? []), ...(current.matches ?? [])]
}

function outcomeFor(match, normalizedTla) {
  const isHome = normalizeTla(match.homeTeam?.tla ?? '').toUpperCase() === normalizedTla
  const winner = match.score?.winner

  if (winner === 'DRAW') return 'D'
  if (winner === 'HOME_TEAM') return isHome ? 'W' : 'L'
  if (winner === 'AWAY_TEAM') return isHome ? 'L' : 'W'
  return null
}

// Returns the club's last N results in chronological order (oldest to
// newest, left to right), padded on the left with null ("not yet played")
// if fewer than N matches are available anywhere in the payload.
function computeLast5(matches, tla) {
  const normalized = normalizeTla(tla).toUpperCase()

  const recentFirst = matches
    .filter((match) => {
      const homeTla = normalizeTla(match.homeTeam?.tla ?? '').toUpperCase()
      const awayTla = normalizeTla(match.awayTeam?.tla ?? '').toUpperCase()
      return homeTla === normalized || awayTla === normalized
    })
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, LAST_N)

  const chronological = recentFirst.map((match) => outcomeFor(match, normalized)).reverse()
  const padCount = LAST_N - chronological.length

  return [...Array(padCount).fill(null), ...chronological]
}

export default async function handler(req, res) {
  try {
    const { data: cached, error: selectError } = await supabase
      .from('form_cache')
      .select('id, data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectError) {
      console.error('club-form: Supabase query failed', selectError)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    let matches

    if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL_MS) {
      matches = cached.data
    } else {
      matches = await fetchFinishedAcrossSeasons()

      const { error: saveError } = cached
        ? await supabase.from('form_cache').update({ data: matches }).eq('id', cached.id)
        : await supabase.from('form_cache').insert({ data: matches })

      if (saveError) {
        console.error('club-form: Supabase save failed', saveError)
        res.status(500).json({ error: 'Failed to save to Supabase' })
        return
      }
    }

    // Today's 20 PL clubs come from standings_cache, not from inferring
    // "current season" out of the matches list — that inference breaks if
    // the new season has zero finished matches yet (e.g. before matchday 1
    // concludes), since the merged list would then contain only last
    // season's clubs. Standings always lists all 20 current clubs, even at
    // 0 games played.
    const { data: standingsCached, error: standingsError } = await supabase
      .from('standings_cache')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (standingsError) {
      console.error('club-form: Supabase standings lookup failed', standingsError)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    const standingsTable = standingsCached?.data?.standings?.find((group) => group.type === 'TOTAL')?.table ?? []
    const currentSeasonTlas = new Set(
      standingsTable.map((entry) => normalizeTla(entry.team.tla).toUpperCase()).filter(Boolean),
    )

    const form = Object.fromEntries([...currentSeasonTlas].map((tla) => [tla, computeLast5(matches, tla)]))

    res.status(200).json({ form })
  } catch (error) {
    console.error('club-form: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
