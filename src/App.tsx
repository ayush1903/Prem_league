import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ClubPage from './pages/ClubPage'
import ThemeToggle from './components/ThemeToggle'

function App() {
  return (
    <BrowserRouter>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/club/:slug" element={<ClubPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
