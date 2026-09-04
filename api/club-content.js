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
      .from('club_content')
      .select('club_name, manager, formation, club_summary, playstyle_summary, net_spend, status, updated_at')
      .ilike('club_name', team.name)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!preview) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('club-content: Supabase query failed', error)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    res.status(200).json({ clubContent: data })
  } catch (error) {
    console.error('club-content: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
