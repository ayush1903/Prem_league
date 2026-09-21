import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fadeSlideUp } from '../lib/motion'
import CompetitionLogo from './CompetitionLogo'

const NAV_LINKS = [
  { to: '/clubs', label: 'Clubs' },
  { to: '/table', label: 'Table' },
  { to: '/fixtures', label: 'Fixtures' },
  { to: '/transfers', label: 'Transfers' },
]

function SiteHeader() {
  const [emblem, setEmblem] = useState<string | null | undefined>(undefined)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/api/fixtures?competition=PL')
      .then((res) => res.json())
      .then((data) => setEmblem(data.fixtures?.competition?.emblem ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <motion.header
      ref={headerRef}
      initial="hidden"
      animate="visible"
      variants={fadeSlideUp}
      style={{ backgroundColor: '#38003C' }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 pr-16 sm:px-6 sm:py-8 md:pr-6">
        <h1 className="inline-block text-2xl font-bold text-white sm:text-3xl">
          <Link
            to="/"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80 sm:gap-2"
            onClick={() => setMenuOpen(false)}
          >
            <CompetitionLogo name="Premier League" emblemUrl={emblem} size="md" />
            Premier League
          </Link>
          <span
            className="mt-2 block h-1 w-full rounded-full"
            style={{ backgroundColor: '#00FF85' }}
          />
        </h1>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            {menuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden md:hidden"
            style={{ backgroundColor: '#2b0030' }}
          >
            <div className="flex flex-col gap-1 px-4 pb-4 pt-2 sm:px-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

export default SiteHeader
