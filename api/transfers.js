import { createClient } from '@supabase/supabase-js'
import { resolveClub } from './_lib/resolveClub.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    const club = (req.query?.club || 'ARS').toString()
    const preview = req.query?.preview === '1' || req.query?.preview === 'true'

    let team
    try {
      ;({ team } = await resolveClub(club))
    } catch {
      res.status(502).json({ error: 'Failed to fetch data from Fantasy Premier League API' })
      return
    }

    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    let query = supabase
      .from('transfers')
      .select('club_name, player_name, type, fee, source_name, date_logged, status')
      .ilike('club_name', team.name)
      .order('date_logged', { ascending: false })

    if (!preview) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query

    if (error) {
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    res.status(200).json({ transfers: data ?? [] })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
