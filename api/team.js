import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    const { data: existing, error: selectError } = await supabase
      .from('clubs')
      .select('name, squad')
      .ilike('name', 'arsenal')
      .maybeSingle()

    if (selectError) {
      // TODO: remove verbose error details before shipping to production
      res.status(500).json({ error: 'Failed to query Supabase', message: selectError.message, details: selectError })
      return
    }

    if (existing) {
      res.status(200).json({ team: existing.name, players: existing.squad })
      return
    }

    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')

    if (!response.ok) {
      res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
      return
    }

    const data = await response.json()

    const team = data.teams.find(
      (t) => t.name.toLowerCase() === 'arsenal',
    )

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

    const { error: insertError } = await supabase
      .from('clubs')
      .insert({ name: team.name, squad: players })

    if (insertError) {
      // TODO: remove verbose error details before shipping to production
      res.status(500).json({ error: 'Failed to save to Supabase', message: insertError.message, details: insertError })
      return
    }

    res.status(200).json({ team: team.name, players })
  } catch (error) {
    // TODO: remove verbose error details before shipping to production
    res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack })
  }
}
