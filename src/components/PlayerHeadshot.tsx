import { useEffect, useState } from 'react'

type Props = {
  // Also used to derive the fallback initials.
  name: string
  photoUrl?: string | null
  color: string
  className?: string
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

// Large cut-out headshot for the player hero, with the same graceful
// onError-to-initials fallback as ClubCrest/PersonPhoto. The fallback keeps
// the photo's footprint so the hero layout doesn't jump when a photo 404s.
function PlayerHeadshot({ name, photoUrl, color, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setFailed(false)
    setLoaded(false)
  }, [photoUrl])

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`object-contain object-bottom transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        style={{ maskImage: 'linear-gradient(to bottom, black 78%, transparent)' }}
      />
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="flex h-2/3 w-2/3 items-center justify-center rounded-full border-2 font-display text-6xl font-extrabold text-white"
        style={{ borderColor: `${color}99`, backgroundColor: `${color}33` }}
      >
        {getInitials(name)}
      </div>
    </div>
  )
}

export default PlayerHeadshot
