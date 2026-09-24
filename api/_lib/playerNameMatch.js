// Matches one of our FPL squad players (`first_name` + `second_name`)
// against a club's API-Football squad list (single `name` field per
// player), tolerating accents and formatting differences without ever
// silently guessing between multiple plausible candidates — see
// matchPlayer()'s tiers below. Driven from the FPL side so every FPL player
// gets exactly one row (fpl_element_id is always known; api_football_player_id
// is only set when a single confident candidate is found).

// Letters that don't decompose under Unicode NFD (so the combining-mark
// strip below can't catch them) but still need to fold to ASCII for names
// like "Ødegaard" or "Guðmundsson" to compare equal to their ASCII spelling.
const NON_DECOMPOSING_LETTERS = {
  ø: 'o',
  æ: 'ae',
  å: 'a',
  ð: 'd',
  þ: 'th',
  œ: 'oe',
  ł: 'l',
  ı: 'i',
  ß: 'ss',
}

function normalizeName(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .toLowerCase()
    .replace(/[øæåðþœłıß]/g, (char) => NON_DECOMPOSING_LETTERS[char])
    .replace(/[.'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Whole-word containment check (space-padded so "de bruyne" doesn't match
// inside "davide bruynel").
function containsWord(haystack, needle) {
  if (!needle) return false
  return ` ${haystack} `.includes(` ${needle} `)
}

// apiFootballSquad: array of { id, name } from /players/squads.
// Returns { status: 'matched' | 'ambiguous' | 'unmatched', apiFootballPlayer: {id,name} | null, candidates: {id,name}[] }
export function matchPlayer(fplPlayer, apiFootballSquad) {
  const normalizedFullName = normalizeName(`${fplPlayer.first_name} ${fplPlayer.second_name}`)
  const normalizedSurname = normalizeName(fplPlayer.second_name)
  const normalizedFirstName = normalizeName(fplPlayer.first_name)

  const withNormalizedNames = apiFootballSquad.map((apiPlayer) => ({
    apiPlayer,
    normalizedName: normalizeName(apiPlayer.name),
  }))

  const exactMatches = withNormalizedNames.filter((entry) => entry.normalizedName === normalizedFullName)
  if (exactMatches.length === 1) {
    return { status: 'matched', apiFootballPlayer: exactMatches[0].apiPlayer, candidates: [exactMatches[0].apiPlayer] }
  }
  if (exactMatches.length > 1) {
    return { status: 'ambiguous', apiFootballPlayer: null, candidates: exactMatches.map((entry) => entry.apiPlayer) }
  }

  // Unique surname found as a whole word in the API-Football name — handles
  // API-Football including middle names/compound names differently, e.g.
  // API "Kevin De Bruyne" vs our first_name "Kevin", second_name "De Bruyne".
  const surnameMatches = withNormalizedNames.filter((entry) => containsWord(entry.normalizedName, normalizedSurname))
  if (surnameMatches.length === 1) {
    return { status: 'matched', apiFootballPlayer: surnameMatches[0].apiPlayer, candidates: [surnameMatches[0].apiPlayer] }
  }
  if (surnameMatches.length > 1) {
    return { status: 'ambiguous', apiFootballPlayer: null, candidates: surnameMatches.map((entry) => entry.apiPlayer) }
  }

  // First-name-only overlap is too weak a signal to auto-confirm (common
  // first names recur across a squad) — flag as ambiguous rather than guess.
  const firstNameMatches = withNormalizedNames.filter((entry) => containsWord(entry.normalizedName, normalizedFirstName))
  if (firstNameMatches.length > 0) {
    return { status: 'ambiguous', apiFootballPlayer: null, candidates: firstNameMatches.map((entry) => entry.apiPlayer) }
  }

  return { status: 'unmatched', apiFootballPlayer: null, candidates: [] }
}
