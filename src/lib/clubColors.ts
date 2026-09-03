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
