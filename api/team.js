import { createClient } from '@supabase/supabase-js'
import { resolveClub } from './_lib/resolveClub.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    const club = (req.query?.club || 'ARS').toString()

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
      .map(({ first_name, second_name, element_type }) => ({
        first_name,
        second_name,
        element_type,
      }))

    const { error: upsertError } = await supabase
      .from('clubs')
      .upsert({ name: team.name, squad: players }, { onConflict: 'name' })

    if (upsertError) {
      res.status(500).json({ error: 'Failed to save to Supabase' })
      return
    }

    res.status(200).json({ team: team.name, players })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
