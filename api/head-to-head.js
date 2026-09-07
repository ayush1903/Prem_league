import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Reads season-to-date form for a team straight out of our own standings
// cache — no extra football-data.org call. Matches by team id, since that's
// consistent across football-data.org endpoints (aggregates in the
// head2head response don't carry a tla, only id/name).
async function getFormFor(teamId) {
  if (!teamId) return null

  const { data: cached, error } = await supabase
    .from('standings_cache')
    .select('data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('head-to-head: Supabase standings lookup failed', error)
    return null
  }

  const table = cached?.data?.standings?.find((group) => group.type === 'TOTAL')?.table ?? []
  const row = table.find((entry) => entry.team.id === teamId)

  if (!row) return null

  return {
    position: row.position,
    points: row.points,
    playedGames: row.playedGames,
    won: row.won,
    draw: row.draw,
    lost: row.lost,
    goalDifference: row.goalDifference,
  }
}

export default async function handler(req, res) {
  try {
    const matchId = Number(req.query?.matchId)

    if (!req.query?.matchId || !Number.isInteger(matchId) || matchId <= 0) {
      res.status(400).json({ error: 'matchId is required and must be a positive integer' })
      return
    }

    const { data: cached, error: selectError } = await supabase
      .from('head_to_head_cache')
      .select('data, updated_at')
      .eq('match_id', matchId)
      .maybeSingle()

    if (selectError) {
      console.error('head-to-head: Supabase query failed', selectError)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    let headToHead

    if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL_MS) {
      headToHead = cached.data
    } else {
      const response = await fetch(`https://api.football-data.org/v4/matches/${matchId}/head2head`, {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
      })

      if (!response.ok) {
        console.error('head-to-head: football-data.org request failed', response.status, response.statusText)
        res.status(502).json({ error: 'Failed to fetch data from football-data.org' })
        return
      }

      headToHead = await response.json()

      const { error: saveError } = await supabase
        .from('head_to_head_cache')
        .upsert({ match_id: matchId, data: headToHead }, { onConflict: 'match_id' })

      if (saveError) {
        console.error('head-to-head: Supabase save failed', saveError)
        res.status(500).json({ error: 'Failed to save to Supabase' })
        return
      }
    }

    const [home, away] = await Promise.all([
      getFormFor(headToHead.aggregates?.homeTeam?.id),
      getFormFor(headToHead.aggregates?.awayTeam?.id),
    ])

    res.status(200).json({ headToHead, form: { home, away } })
  } catch (error) {
    console.error('head-to-head: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
