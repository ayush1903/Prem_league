import { createClient } from '@supabase/supabase-js'
import { resolveClub } from './_lib/resolveClub.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    const club = (req.query?.club || 'ARS').toString()

    const { data: existing, error: selectError } = await supabase
      .from('clubs')
      .select('name, squad')
      .ilike('short_name', club)
      .maybeSingle()

    if (selectError) {
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    if (existing) {
      res.status(200).json({ team: existing.name, players: existing.squad })
      return
    }

    let data, team
    try {
      ;({ data, team } = await resolveClub(club))
    } catch {
      res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
      return
    }

    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const players = data.elements
      .filter((element) => element.team === team.id)
      .map(({ id, first_name, second_name, element_type, goals_scored, assists, minutes, total_points, now_cost, form, selected_by_percent }) => ({
        id,
        first_name,
        second_name,
        element_type,
        goals_scored,
        assists,
        minutes,
        total_points,
        now_cost,
        form,
        selected_by_percent,
      }))

    const { error: upsertError } = await supabase
      .from('clubs')
      .upsert({ name: team.name, short_name: team.short_name, squad: players }, { onConflict: 'name' })

    if (upsertError) {
      res.status(500).json({ error: 'Failed to save to Supabase' })
      return
    }

    res.status(200).json({ team: team.name, players })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
