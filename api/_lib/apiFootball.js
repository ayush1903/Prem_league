const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'

// Thin wrapper around API-Football's v3 REST API (direct api-sports.io
// subscription — auth via the `x-apisports-key` header, not the RapidAPI
// gateway). Throws with the real status/body on failure so callers can log
// it, rather than returning a generic error.
export async function apiFootballRequest(path, params = {}) {
  const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))

  const response = await fetch(url, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '' },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`API-Football request to ${path} failed: ${response.status} ${response.statusText} — ${body}`)
  }

  const payload = await response.json()
  const errorCount = Array.isArray(payload.errors) ? payload.errors.length : Object.keys(payload.errors ?? {}).length

  if (errorCount > 0) {
    throw new Error(`API-Football request to ${path} returned errors: ${JSON.stringify(payload.errors)}`)
  }

  return payload.response
}
