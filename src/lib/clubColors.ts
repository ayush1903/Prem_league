// Real primary brand color per club, keyed by short_name. Sourced from each
// club's shirt/crest color; three needed a judgment call since their primary
// is white (FUL, LEE use their crest's secondary color instead) or their
// stripes read as black (NEW). Tuned for contrast against dark-mode card
// backgrounds, not just color-accuracy, since NEW/FUL are both near-black.
export const CLUB_COLORS: Record<string, string> = {
  ARS: '#EF0107',
  MCI: '#6CABDD',
  CHE: '#034694',
  TOT: '#132257',
  NEW: '#000000',
  AVL: '#670E36',
  BOU: '#B91813',
  BRE: '#E30613',
  BHA: '#0057B8',
  COV: '#78AEDB',
  CRY: '#1B458F',
  EVE: '#003399',
  FUL: '#3A3A3A',
  HUL: '#F18A00',
  IPS: '#0044A9',
  LEE: '#1D428A',
  LIV: '#C8102E',
  MUN: '#DA291C',
  NFO: '#DD0000',
  SUN: '#EB172B',
}

// Deterministic placeholder color for clubs without a real brand color wired
// up in CLUB_COLORS yet.
function hashHue(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export function getBadgeColor(shortName: string): string {
  const normalized = shortName.toUpperCase()
  const known = CLUB_COLORS[normalized]
  if (known) return known

  console.warn(`clubColors: no real brand color for "${normalized}", using a generated placeholder`)
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
