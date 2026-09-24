// Hardcoded short_name -> API-Football team ID map for the current 20 PL
// clubs. Deliberately NOT auto-matched by name string similarity — filled in
// by hand after a human eyeballs the raw /teams?league=39&season=2026
// response (returned by GET /api/admin/match-player-ids while this map is
// empty). Do not guess entries here; leave it empty until every club below
// has been checked against that response.
//
// Example, once verified:
// ARS: 42,
export const API_FOOTBALL_TEAM_ID_BY_SHORT_NAME = {}
