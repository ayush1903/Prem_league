// Shared by MatchHero-consuming pages (Home's next-match card, the match
// page's hero) so both render kickoff time/date identically.
export function formatKickoffTime(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatKickoffDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
