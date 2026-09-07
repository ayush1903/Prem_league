// football-data.org uses 'NOT' for Nottingham Forest where our clubs use 'NFO'.
const TLA_OVERRIDES: Record<string, string> = {
  NOT: 'NFO',
}

// Normalizes an upstream football-data.org tla to our club short_name convention.
export function normalizeTla(tla: string): string {
  return TLA_OVERRIDES[tla] ?? tla
}
