// One-off seed for the six "Premier League Icons" era cards. Idempotent via
// upsert on manager_name (unique constraint added in 0009_create_history_content.sql).
// Run after that migration has been applied in Supabase:
//   node --env-file=.env.local scripts/seed-history-content.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const rows = [
  {
    manager_name: 'Sir Alex Ferguson',
    club_name: 'Manchester United',
    era_label: '1986–2013',
    photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Alex_Ferguson_2012.jpg/330px-Alex_Ferguson_2012.jpg',
    headline_stat: '13',
    headline_stat_label: 'Premier League titles — the most of any manager',
    summary:
      "Built and rebuilt Manchester United into the Premier League's dominant force across three separate great teams, capped by an emotional farewell title in 2012–13.",
    sort_order: 1,
    status: 'draft',
  },
  {
    manager_name: 'Arsène Wenger',
    club_name: 'Arsenal',
    era_label: '1996–2018',
    photo_url:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/25th_Laureus_World_Sports_Awards_-_Red_Carpet_-_Ars%C3%A8ne_Wenger_-_240422_192850_%28cropped%29.jpg/330px-25th_Laureus_World_Sports_Awards_-_Red_Carpet_-_Ars%C3%A8ne_Wenger_-_240422_192850_%28cropped%29.jpg',
    headline_stat: '49',
    headline_stat_label: "consecutive unbeaten league matches, spanning the 2003–04 'Invincibles' season",
    summary:
      'The only manager to take a Premier League team through an entire 38-game season unbeaten, and a pioneer of the continental approach to fitness and diet in English football.',
    sort_order: 2,
    status: 'draft',
  },
  {
    manager_name: 'José Mourinho',
    club_name: 'Chelsea',
    era_label: '2004–2007',
    photo_url:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Jos%C3%A9_Mourinho_20250206_%281%29.jpg/330px-Jos%C3%A9_Mourinho_20250206_%281%29.jpg',
    headline_stat: '15',
    headline_stat_label: 'goals conceded in 2004–05 — still a Premier League record',
    summary:
      "Arrived declaring himself \"a special one\" and backed it up immediately, winning the title in his debut season behind the meanest defence English football has seen.",
    sort_order: 3,
    status: 'draft',
  },
  {
    manager_name: 'Claudio Ranieri',
    club_name: 'Leicester City',
    era_label: '2015–16',
    photo_url:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Ranieri2023_%28cropped%29.png/330px-Ranieri2023_%28cropped%29.png',
    headline_stat: '5000/1',
    headline_stat_label: "starting odds to win the title — the longest shot in the competition's history",
    summary:
      'Guided a team that had only just avoided relegation the year before to the most improbable title win the Premier League has ever seen.',
    sort_order: 4,
    status: 'draft',
  },
  {
    manager_name: 'Jürgen Klopp',
    club_name: 'Liverpool',
    era_label: '2015–2024',
    photo_url:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/2022-07-21_Fu%C3%9Fball%2C_M%C3%A4nner%2CFreundschaftsspiel%2C_RB_Leipzig_-_FC_Liverpool_1DX_2243_by_Stepro_%28cropped%29_%28cropped%29.jpg/330px-2022-07-21_Fu%C3%9Fball%2C_M%C3%A4nner%2CFreundschaftsspiel%2C_RB_Leipzig_-_FC_Liverpool_1DX_2243_by_Stepro_%28cropped%29_%28cropped%29.jpg',
    headline_stat: '99',
    headline_stat_label: "points in 2019–20 — Liverpool's first title in 30 years",
    summary:
      'Turned Liverpool from perennial nearly-men into serial winners, built on relentless high-energy football and an unmatched bond with the Anfield crowd.',
    sort_order: 5,
    status: 'draft',
  },
  {
    manager_name: 'Pep Guardiola',
    club_name: 'Manchester City',
    era_label: '2016–2025',
    photo_url:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Josep_Guardiola_2023-10-04_Fu%C3%9Fball%2C_M%C3%A4nner%2C_UEFA_Champions_League%2C_RB_Leipzig_-_Manchester_City_FC_1DX_2797_%28cropped%29.jpg/330px-Josep_Guardiola_2023-10-04_Fu%C3%9Fball%2C_M%C3%A4nner%2C_UEFA_Champions_League%2C_RB_Leipzig_-_Manchester_City_FC_1DX_2797_%28cropped%29.jpg',
    headline_stat: '4',
    headline_stat_label: 'consecutive Premier League titles (2021–2024) — an English top-flight record',
    summary:
      "Redefined what a Premier League team could look like technically and tactically, turning Manchester City into the division's most relentless winning machine.",
    sort_order: 6,
    status: 'draft',
  },
]

const { data, error } = await supabase.from('history_content').upsert(rows, { onConflict: 'manager_name' }).select('manager_name')

if (error) {
  console.error('Seed failed:', error)
  process.exit(1)
}

console.log(`Seeded ${data.length} history_content rows (status=draft):`, data.map((r) => r.manager_name).join(', '))
