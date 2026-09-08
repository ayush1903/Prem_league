import { useEffect, useState } from 'react'

type Size = 'sm' | 'md'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
}

type Props = {
  name: string
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
        className={`${SIZE_CLASSES[size]} shrink-0 object-contain ${className}`}
      />
    )
  }

  return <span className={className}>{name}</span>
}

export default CompetitionLogo
