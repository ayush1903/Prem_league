import { createClient } from '@supabase/supabase-js'
import { apiFootballRequest } from '../_lib/apiFootball.js'
import { API_FOOTBALL_TEAM_ID_BY_SHORT_NAME } from '../_lib/apiFootballTeamMap.js'
import { matchPlayer } from '../_lib/playerNameMatch.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const LEAGUE_ID = 39 // Premier League
const SEASON = 2026
const SQUAD_REQUEST_DELAY_MS = 300 // stay well under API-Football's rate limits across 20 sequential calls

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// One-time (re-runnable) admin route that populates player_external_ids by
// matching our FPL squad data to API-Football player IDs.
//
// Step 1 (club-level mapping): while API_FOOTBALL_TEAM_ID_BY_SHORT_NAME
// (api/_lib/apiFootballTeamMap.js) is empty, this route ONLY calls
// /teams?league=39&season=2026 and logs the raw result — no DB writes. A
// human eyeballs that list and hardcodes the map, club by club.
//
// Step 2 (player-level mapping): once the map is filled in and covers all
// 20 current PL clubs, this route fetches each club's API-Football squad,
// matches players against our FPL squad data, and upserts every attempt
// into player_external_ids (on fpl_element_id, so re-runs are safe).
export default async function handler(req, res) {
  if (!process.env.ADMIN_SECRET || req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const mappedShortNames = Object.keys(API_FOOTBALL_TEAM_ID_BY_SHORT_NAME)

  if (mappedShortNames.length === 0) {
    try {
      const teams = await apiFootballRequest('/teams', { league: LEAGUE_ID, season: SEASON })
      res.status(200).json({
        step: 'club-mapping',
        message:
          'API_FOOTBALL_TEAM_ID_BY_SHORT_NAME is empty. Eyeball-verify this list against the 20 current PL clubs, ' +
          'then hardcode short_name -> id entries in api/_lib/apiFootballTeamMap.js before re-running this route. ' +
          'No database writes have been made.',
        teams: teams.map(({ team }) => ({ apiFootballTeamId: team.id, name: team.name, code: team.code, country: team.country })),
      })
    } catch (error) {
      console.error('match-player-ids: club discovery failed', error)
      res.status(502).json({ error: 'Failed to fetch team list from API-Football' })
    }
    return
  }

  try {
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')
    if (!fplResponse.ok) {
      console.error('match-player-ids: FPL API request failed', fplResponse.status, fplResponse.statusText)
      res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
      return
    }
    const fplData = await fplResponse.json()

    const currentShortNames = fplData.teams.map((team) => team.short_name)
    const missingFromMap = currentShortNames.filter((shortName) => !(shortName in API_FOOTBALL_TEAM_ID_BY_SHORT_NAME))

    if (missingFromMap.length > 0) {
      res.status(400).json({
        error: 'API_FOOTBALL_TEAM_ID_BY_SHORT_NAME does not cover all 20 current PL clubs — refusing to run with a partial mapping.',
        missingClubs: missingFromMap,
      })
      return
    }

    const clubBreakdown = []
    const rows = []

    for (const [index, team] of fplData.teams.entries()) {
      const apiFootballTeamId = API_FOOTBALL_TEAM_ID_BY_SHORT_NAME[team.short_name]
      const fplSquad = fplData.elements
        .filter((element) => element.team === team.id)
        .map(({ id, first_name, second_name }) => ({ id, first_name, second_name }))

      let squads
      try {
        squads = await apiFootballRequest('/players/squads', { team: apiFootballTeamId })
      } catch (error) {
        console.error(`match-player-ids: squad fetch failed for ${team.short_name}`, error)
        res.status(502).json({ error: `Failed to fetch API-Football squad for ${team.short_name}`, club: team.short_name })
        return
      }

      const apiFootballSquad = squads[0]?.players ?? []

      let matched = 0
      let ambiguous = 0
      let unmatched = 0

      for (const fplPlayer of fplSquad) {
        const result = matchPlayer(fplPlayer, apiFootballSquad)

        if (result.status === 'matched') matched += 1
        else if (result.status === 'ambiguous') ambiguous += 1
        else unmatched += 1

        rows.push({
          fpl_element_id: fplPlayer.id,
          api_football_player_id: result.apiFootballPlayer?.id ?? null,
          player_name: `${fplPlayer.first_name} ${fplPlayer.second_name}`,
          club_short_name: team.short_name,
          match_status: result.status,
          candidates: result.status === 'matched' ? [] : result.candidates.map((c) => ({ id: c.id, name: c.name })),
        })
      }

      clubBreakdown.push({ club_short_name: team.short_name, total: fplSquad.length, matched, ambiguous, unmatched })

      if (index < fplData.teams.length - 1) {
        await sleep(SQUAD_REQUEST_DELAY_MS)
      }
    }

    const { error: upsertError } = await supabase
      .from('player_external_ids')
      .upsert(rows, { onConflict: 'fpl_element_id' })

    if (upsertError) {
      console.error('match-player-ids: Supabase upsert failed', upsertError)
      res.status(500).json({ error: 'Failed to save matches to Supabase' })
      return
    }

    const totals = clubBreakdown.reduce(
      (acc, club) => ({
        total: acc.total + club.total,
        matched: acc.matched + club.matched,
        ambiguous: acc.ambiguous + club.ambiguous,
        unmatched: acc.unmatched + club.unmatched,
      }),
      { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
    )

    res.status(200).json({ step: 'player-matching', totals, byClub: clubBreakdown })
  } catch (error) {
    console.error('match-player-ids: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
