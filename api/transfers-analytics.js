import { createClient } from '@supabase/supabase-js'
import { computeTransferMarket } from './_lib/analytics.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    const { data: transfers, error: transfersError } = await supabase
      .from('transfers')
      .select('club_name, type, fee')
      .eq('status', 'published')

    if (transfersError) {
      console.error('transfers-analytics: Supabase query failed', transfersError)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    const clubNames = [...new Set((transfers ?? []).map((t) => t.club_name))]
    let shortNameByClub = {}

    if (clubNames.length > 0) {
      const { data: clubs, error: clubsError } = await supabase
        .from('clubs')
        .select('name, short_name')
        .in('name', clubNames)

      if (clubsError) {
        console.error('transfers-analytics: Supabase clubs lookup failed', clubsError)
      } else {
        shortNameByClub = Object.fromEntries((clubs ?? []).map((c) => [c.name, c.short_name]))
      }
    }

    const enriched = (transfers ?? []).map((t) => ({ ...t, short_name: shortNameByClub[t.club_name] ?? null }))

    res.status(200).json({ transferMarket: computeTransferMarket(enriched) })
  } catch (error) {
    console.error('transfers-analytics: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
