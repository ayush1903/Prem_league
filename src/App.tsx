import { useEffect } from 'react'

function App() {
  useEffect(() => {
    fetch('/api/team')
      .then((res) => res.json())
      .then((data) => console.log(data))
      .catch((error) => console.error(error))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <h1 className="text-3xl font-semibold">Premier League Dashboard — coming soon</h1>
    </div>
  )
}

export default App
