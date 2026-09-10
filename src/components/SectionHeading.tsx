import type { ReactNode } from 'react'

type Props = {
  color: string
  children: ReactNode
}

// Section heading with a club-color accent dot, used wherever a page's
// content belongs to a single dominant club (club page, player page).
function SectionHeading({ color, children }: Props) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
      <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </h2>
  )
}

export default SectionHeading
