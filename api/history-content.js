import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const COLUMNS = 'manager_name, club_name, era_label, photo_url, headline_stat, headline_stat_label, summary, sort_order, status, updated_at'

export default async function handler(req, res) {
  try {
    const preview = req.query?.preview === '1' || req.query?.preview === 'true'

    let query = supabase.from('history_content').select(COLUMNS).order('sort_order', { ascending: true })

    if (!preview) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query

    if (error) {
      console.error('history-content: Supabase query failed', error)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    res.status(200).json({ historyContent: data ?? [] })
  } catch (error) {
    console.error('history-content: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
