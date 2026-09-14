import { useEffect, useState } from 'react'

type Size = 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<Size, string> = {
  md: 'h-16 w-16 text-sm',
  lg: 'h-20 w-20 text-base',
  xl: 'h-24 w-24 text-lg',
}

type Props = {
  // Also used to derive the fallback initials.
  name: string
  photoUrl?: string | null
  alt?: string
  size?: Size
  className?: string
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

// Circular person photo with the same graceful onError-to-initials fallback
// pattern as ClubCrest, for real hotlinked manager photos.
function PersonPhoto({ name, photoUrl, alt, size = 'lg', className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const dimensions = SIZE_CLASSES[size]

  useEffect(() => setFailed(false), [photoUrl])

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={alt ?? name}
        onError={() => setFailed(true)}
        className={`${dimensions} shrink-0 rounded-full border-2 border-white/10 object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-white/10 font-bold text-white ${className}`}
    >
      {getInitials(name)}
    </div>
  )
}

export default PersonPhoto
