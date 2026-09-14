// Flips the six seeded "Premier League Icons" era cards from draft to
// published, after review at /?preview=1. Run:
//   node --experimental-websocket --env-file=.env.local scripts/publish-history-content.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const MANAGER_NAMES = [
  'Sir Alex Ferguson',
  'Arsène Wenger',
  'José Mourinho',
  'Claudio Ranieri',
  'Jürgen Klopp',
  'Pep Guardiola',
]

const { data, error } = await supabase
  .from('history_content')
  .update({ status: 'published' })
  .in('manager_name', MANAGER_NAMES)
  .select('manager_name')

if (error) {
  console.error('Publish failed:', error)
  process.exit(1)
}

console.log(`Published ${data.length} history_content rows:`, data.map((r) => r.manager_name).join(', '))
