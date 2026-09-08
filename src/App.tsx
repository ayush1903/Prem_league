import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Home from './pages/Home'
import ClubPage from './pages/ClubPage'
import PlayerPage from './pages/PlayerPage'
import TransfersPage from './pages/TransfersPage'
import TablePage from './pages/TablePage'
import FixturesPage from './pages/FixturesPage'
import MatchPage from './pages/MatchPage'
import ThemeToggle from './components/ThemeToggle'

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Home />
            </PageTransition>
          }
        />
        <Route
          path="/club/:slug"
          element={
            <PageTransition>
              <ClubPage />
            </PageTransition>
          }
        />
        <Route
          path="/club/:slug/player/:playerId"
          element={
            <PageTransition>
              <PlayerPage />
            </PageTransition>
          }
        />
        <Route
          path="/transfers"
          element={
            <PageTransition>
              <TransfersPage />
            </PageTransition>
          }
        />
        <Route
          path="/table"
          element={
            <PageTransition>
              <TablePage />
            </PageTransition>
          }
        />
        <Route
          path="/fixtures"
          element={
            <PageTransition>
              <FixturesPage />
            </PageTransition>
          }
        />
        <Route
          path="/match/:matchId"
          element={
            <PageTransition>
              <MatchPage />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeToggle />
      <AnimatedRoutes />
    </BrowserRouter>
  )
}

export default App
