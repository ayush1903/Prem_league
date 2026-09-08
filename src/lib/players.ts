export type Player = {
  id: number
  first_name: string
  second_name: string
  element_type: number
  status: string
  news: string
  chance_of_playing_this_round: number | null
}

export const POSITION_LABELS: Record<number, string> = {
  1: 'Goalkeeper',
  2: 'Defender',
  3: 'Midfielder',
  4: 'Forward',
}

// FPL's news field describes a permanent departure or loan move in prose
// (e.g. "Joined Fulham permanently", "Signed on loan for..."); those players
// are no longer really part of the club, so they're dropped from squad
// listings entirely rather than shown with a status badge.
export function isUnavailable(player: Player): boolean {
  const news = player.news.toLowerCase()
  return (
    news.includes('permanently') ||
    news.includes('loan') ||
    news.includes('departed') ||
    news.includes('returned to')
  )
}

export type StatusBadge = {
  label: string
  className: string
}

const BADGE_BASE_CLASSES = 'mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none'

export function getStatusBadge(player: Player): StatusBadge | null {
  if (player.status === 'i') {
    return { label: 'Injured', className: `${BADGE_BASE_CLASSES} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400` }
  }
  if (player.status === 's') {
    return { label: 'Suspended', className: `${BADGE_BASE_CLASSES} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400` }
  }
  if (player.status === 'd') {
    const chance = player.chance_of_playing_this_round
    return {
      label: chance !== null ? `${chance}% chance` : 'Doubtful',
      className: `${BADGE_BASE_CLASSES} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400`,
    }
  }
  return null
}
