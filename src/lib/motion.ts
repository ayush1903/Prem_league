import type { Variants } from 'framer-motion'

export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

export function staggerContainer(staggerChildren = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren, delayChildren } },
  }
}

// Same hover-lift effect shared by every card across the app.
export const cardHover = {
  whileHover: { scale: 1.04, y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.25)' },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2 },
}

// Same lift, but the hover glow tints toward a club's color instead of
// plain black — used on club/player/match pages where a club color is the
// dominant accent. `color` must be a 6-digit hex (all CLUB_COLORS values
// are), since the alpha is appended as two hex digits.
export function clubCardHover(color: string) {
  return {
    whileHover: { scale: 1.04, y: -4, boxShadow: `0 12px 24px ${color}55` },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2 },
  }
}
