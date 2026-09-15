// Arsenal's gross_spend was entered as "$262m" while every other club's
// spend fields use £ — a currency mismatch that would corrupt any chart
// ranking clubs by spend. Converts at a fixed USD→GBP approximation (no
// live FX call) and corrects the stored value. Run:
//   node --experimental-websocket --env-file=.env.local scripts/fix-arsenal-gross-spend.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const USD_TO_GBP = 0.79
const CORRECTED_GROSS_SPEND = `£${Math.round(262 * USD_TO_GBP)}m`

const { data: before, error: beforeError } = await supabase
  .from('club_content')
  .select('club_name, gross_spend')
  .eq('club_name', 'Arsenal')
  .maybeSingle()

if (beforeError) {
  console.error('Lookup failed:', beforeError)
  process.exit(1)
}

if (!before) {
  console.error('No club_content row found for club_name = "Arsenal"')
  process.exit(1)
}

console.log(`Before: gross_spend = ${before.gross_spend}`)

const { data: after, error: updateError } = await supabase
  .from('club_content')
  .update({ gross_spend: CORRECTED_GROSS_SPEND })
  .eq('club_name', 'Arsenal')
  .select('club_name, gross_spend')
  .maybeSingle()

if (updateError) {
  console.error('Update failed:', updateError)
  process.exit(1)
}

console.log(`After:  gross_spend = ${after.gross_spend}`)
