import { createClient } from '@supabase/supabase-js'
import { resolveClub } from './_lib/resolveClub.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const TRANSFER_COLUMNS = 'club_name, player_name, type, fee, source_name, date_logged, status'

async function fetchAllTransfers(preview) {
  let query = supabase
    .from('transfers')
    .select(TRANSFER_COLUMNS)
    .order('date_logged', { ascending: false })

  if (!preview) {
    query = query.eq('status', 'published')
  }

  const { data: transfers, error } = await query

  if (error) {
    return { error }
  }

  const clubNames = [...new Set((transfers ?? []).map((t) => t.club_name))]
  let shortNameByClub = {}

  if (clubNames.length > 0) {
    const { data: clubs, error: clubsError } = await supabase
      .from('clubs')
      .select('name, short_name')
      .in('name', clubNames)

    if (clubsError) {
      console.error('transfers: Supabase clubs lookup failed', clubsError)
    } else {
      shortNameByClub = Object.fromEntries((clubs ?? []).map((c) => [c.name, c.short_name]))
    }
  }

  const enriched = (transfers ?? []).map((t) => ({
    ...t,
    short_name: shortNameByClub[t.club_name] ?? null,
  }))

  return { data: enriched }
}

export default async function handler(req, res) {
  try {
    const club = req.query?.club ? req.query.club.toString() : null
    const preview = req.query?.preview === '1' || req.query?.preview === 'true'

    if (!club) {
      const { data, error } = await fetchAllTransfers(preview)

      if (error) {
        console.error('transfers: Supabase query failed', error)
        res.status(500).json({ error: 'Failed to query Supabase' })
        return
      }

      res.status(200).json({ transfers: data })
      return
    }

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
      .select(TRANSFER_COLUMNS)
      .ilike('club_name', team.name)
      .order('date_logged', { ascending: false })

    if (!preview) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query

    if (error) {
      console.error('transfers: Supabase query failed', error)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    res.status(200).json({ transfers: data ?? [] })
  } catch (error) {
    console.error('transfers: unhandled error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
