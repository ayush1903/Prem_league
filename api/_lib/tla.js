// football-data.org uses 'NOT' for Nottingham Forest where our clubs use 'NFO'.
const TLA_OVERRIDES = {
  NOT: 'NFO',
}

// Normalizes an upstream football-data.org tla to our club short_name convention.
export function normalizeTla(tla) {
  return TLA_OVERRIDES[tla] ?? tla
}
