import { useEffect, useState } from 'react'

type Size = 'sm' | 'md'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
}

type Props = {
  name: string
  // undefined = still loading (not yet known), null = confirmed no emblem for
  // this competition. Only null/failed shows the text fallback.
  emblemUrl?: string | null
  size?: Size
  className?: string
}

function CompetitionLogo({ name, emblemUrl, size = 'sm', className = '' }: Props) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [emblemUrl])

  if (emblemUrl && !failed) {
    return (
      <img
        src={emblemUrl}
        alt={name}
        title={name}
        onError={() => setFailed(true)}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-lg bg-white object-contain p-1 ${className}`}
      />
    )
  }

  if (emblemUrl === undefined) {
    return (
      <span
        aria-hidden="true"
        className={`${SIZE_CLASSES[size]} inline-block shrink-0 animate-pulse rounded-lg bg-white/20 ${className}`}
      />
    )
  }

  return <span className={className}>{name}</span>
}

export default CompetitionLogo
