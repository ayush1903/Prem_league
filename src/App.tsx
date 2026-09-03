import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ClubPage from './pages/ClubPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/club/:slug" element={<ClubPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
