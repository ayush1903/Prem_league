import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const CACHE_TTL_MS = 30 * 60 * 1000

export default async function handler(req, res) {
  try {
    const { data: cached, error: selectError } = await supabase
      .from('standings_cache')
      .select('id, data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectError) {
      console.error('standings: Supabase query failed', selectError)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL_MS) {
      res.status(200).json({ standings: cached.data })
      return
    }

    const response = await fetch('https://api.football-data.org/v4/competitions/PL/standings', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
    })

    if (!response.ok) {
      console.error('standings: football-data.org request failed', response.status, response.statusText)
      res.status(502).json({ error: 'Failed to fetch data from football-data.org' })
      return
    }

    const standings = await response.json()

    const { error: saveError } = cached
      ? await supabase.from('standings_cache').update({ data: standings }).eq('id', cached.id)
      : await supabase.from('standings_cache').insert({ data: standings })

    if (saveError) {
      console.error('standings: Supabase save failed', saveError)
      res.status(500).json({ error: 'Failed to save to Supabase' })
      return
    }

    res.status(200).json({ standings })
  } catch (error) {
    console.error('standings: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
