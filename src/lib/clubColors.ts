// Deterministic placeholder color for clubs whose real brand color isn't wired up yet.
function hashHue(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export function getBadgeColor(shortName: string): string {
  const normalized = shortName.toUpperCase()
  if (normalized === 'ARS') return '#EF0107'
  return `hsl(${hashHue(normalized)}, 60%, 38%)`
}

// Falls back to deriving a short badge label from the full club name when
// a real short_name isn't available yet (e.g. clubs not yet cached in Supabase).
export function getClubInitials(clubName: string, shortName?: string | null): string {
  if (shortName) return shortName.toUpperCase()

  const words = clubName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}
