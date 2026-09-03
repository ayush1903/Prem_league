import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    const preview = req.query?.preview === '1' || req.query?.preview === 'true'

    let query = supabase
      .from('club_content')
      .select('club_name, manager, formation, club_summary, playstyle_summary, status, updated_at')
      .ilike('club_name', 'arsenal')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!preview) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    res.status(200).json({ clubContent: data })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
