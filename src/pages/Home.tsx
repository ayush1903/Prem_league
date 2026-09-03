import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Premier League Dashboard</h1>
        <Link
          to="/club/arsenal"
          className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
        >
          View Arsenal
        </Link>
      </div>
    </div>
  )
}

export default Home
