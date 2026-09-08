import { useEffect, useState } from 'react'
import { getBadgeColor } from '../lib/clubColors'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'h-8 w-8 text-[0.65rem]',
  sm: 'h-10 w-10 text-xs',
  md: 'h-12 w-12 text-xs',
  lg: 'h-14 w-14 text-sm',
  xl: 'h-16 w-16 text-lg',
}

type Props = {
  // Also used as the fallback initials label and to derive the fallback color.
  label: string
  crestUrl?: string | null
  alt?: string
  size?: Size
  // false renders a neutral gray fallback instead of a club color — for a
  // club we couldn't resolve to one of our known 20 (e.g. a foreign CL side).
  known?: boolean
  className?: string
}

function ClubCrest({ label, crestUrl, alt, size = 'sm', known = true, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const dimensions = SIZE_CLASSES[size]

  useEffect(() => setFailed(false), [crestUrl])

  if (crestUrl && !failed) {
    return (
      <img
        src={crestUrl}
        alt={alt ?? label}
        onError={() => setFailed(true)}
        className={`${dimensions} shrink-0 rounded-lg bg-white object-contain p-1 ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-lg font-bold text-white ${
        known ? '' : 'bg-gray-400 dark:bg-gray-600'
      } ${className}`}
      style={known ? { backgroundColor: getBadgeColor(label) } : undefined}
    >
      {label}
    </div>
  )
}

export default ClubCrest
