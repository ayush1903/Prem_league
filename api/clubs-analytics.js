import { createClient } from '@supabase/supabase-js'
import { getStandings } from './_lib/standings.js'
import { normalizeTla } from './_lib/tla.js'
import { parseMoneyString, computeSpendCorrelation, computeAttackDefense } from './_lib/analytics.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    const standings = await getStandings()
    const table = standings.standings?.find((group) => group.type === 'TOTAL')?.table ?? []

    const [{ data: content, error: contentError }, { data: clubs, error: clubsError }] = await Promise.all([
      supabase.from('club_content').select('club_name, net_spend').eq('status', 'published'),
      supabase.from('clubs').select('name, short_name'),
    ])

    if (contentError || clubsError) {
      console.error('clubs-analytics: Supabase query failed', contentError ?? clubsError)
      res.status(500).json({ error: 'Failed to query Supabase' })
      return
    }

    const shortNameByClubName = Object.fromEntries((clubs ?? []).map((c) => [c.name, c.short_name]))
    const standingsByShortName = Object.fromEntries(
      table.map((row) => [normalizeTla(row.team.tla).toUpperCase(), row]),
    )

    const spendPoints = []
    const excludedClubs = []

    for (const row of content ?? []) {
      const shortName = shortNameByClubName[row.club_name]
      if (!shortName) {
        console.warn(`clubs-analytics: club_content.club_name "${row.club_name}" did not match any known club`)
        continue
      }

      const netSpendM = parseMoneyString(row.net_spend)
      const standingsRow = standingsByShortName[shortName.toUpperCase()]

      if (netSpendM === null || !standingsRow) {
        excludedClubs.push(shortName)
        continue
      }

      spendPoints.push({
        shortName,
        name: row.club_name,
        netSpendM,
        points: standingsRow.points,
        position: standingsRow.position,
      })
    }

    const attackDefenseRows = table.map((row) => ({
      shortName: normalizeTla(row.team.tla),
      name: row.team.name,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
    }))

    res.status(200).json({
      spendVsPerformance: { ...computeSpendCorrelation(spendPoints), excludedClubs },
      attackVsDefense: computeAttackDefense(attackDefenseRows),
    })
  } catch (error) {
    console.error('clubs-analytics: unhandled error', error)
    res.status(error.status ?? 500).json({ error: error.message ?? 'Internal server error' })
  }
}
