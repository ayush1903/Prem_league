// Parsing and stats shared by api/clubs-analytics.js and
// api/transfers-analytics.js. club_content.net_spend/gross_spend and
// transfers.fee are free-text editorial fields (e.g. "£136.6m", "£40m
// profit", "€70m", "Free", "Loan", "undisclosed fee"), not numbers — every
// consumer of that data goes through parseMoneyString first.

// No live FX call (keeps this a static, no-new-external-API conversion) —
// fixed approximation, same rate used to correct the one $-denominated
// club_content row (see scripts/fix-arsenal-gross-spend.mjs).
const EUR_TO_GBP = 0.86

// Returns a signed £m number, or null when the amount can't be determined
// (a Loan or an undisclosed fee — zero would understate spend, so these are
// excluded rather than zeroed).
export function parseMoneyString(raw) {
  if (!raw) return null

  const text = raw.toLowerCase().trim()

  if (text.includes('free')) return 0
  if ((text.includes('loan') || text.includes('undisclosed')) && !/\d/.test(text)) return null

  const match = text.match(/([\d,.]+)/)
  if (!match) return null

  let value = parseFloat(match[1].replace(/,/g, ''))
  if (Number.isNaN(value)) return null

  if (text.includes('€')) value *= EUR_TO_GBP
  if (text.includes('$')) {
    console.warn(`parseMoneyString: unexpected "$" in "${raw}" — using the numeric value unconverted`)
  }

  if (text.includes('profit') || text.includes('-')) value = -Math.abs(value)

  return value
}

function pearsonR(xs, ys) {
  const n = xs.length
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0)
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0)
  const sumY2 = ys.reduce((sum, y) => sum + y * y, 0)

  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))
  return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
}

function olsFit(xs, ys) {
  const n = xs.length
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0)
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0)

  const denominator = n * sumX2 - sumX ** 2
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

// points: {shortName, name, netSpendM, points}[] — caller has already
// filtered to entries where both values are known.
export function computeSpendCorrelation(points) {
  if (points.length < 3) {
    return {
      points,
      correlation: null,
      sampleSize: points.length,
      slope: 0,
      intercept: points[0]?.points ?? 0,
      overperformer: null,
      underperformer: null,
    }
  }

  const xs = points.map((p) => p.netSpendM)
  const ys = points.map((p) => p.points)
  const correlation = pearsonR(xs, ys)
  const { slope, intercept } = olsFit(xs, ys)

  const withResidual = points.map((p) => ({ ...p, residual: p.points - (intercept + slope * p.netSpendM) }))

  let overperformer = null
  let underperformer = null
  for (const p of withResidual) {
    if (!overperformer || p.residual > overperformer.residual) overperformer = p
    if (!underperformer || p.residual < underperformer.residual) underperformer = p
  }

  return {
    points: withResidual,
    correlation,
    sampleSize: points.length,
    slope,
    intercept,
    overperformer,
    underperformer,
  }
}

// rows: {shortName, name, goalsFor, goalsAgainst}[] — expected to cover all
// 20 clubs (standings data has no gaps, unlike spend/transfers).
export function computeAttackDefense(rows) {
  const n = rows.length || 1
  const avgGoalsFor = rows.reduce((sum, r) => sum + r.goalsFor, 0) / n
  const avgGoalsAgainst = rows.reduce((sum, r) => sum + r.goalsAgainst, 0) / n

  const points = rows.map((r) => ({
    ...r,
    balanceScore: r.goalsFor - avgGoalsFor - (r.goalsAgainst - avgGoalsAgainst),
  }))

  let bestBalanced = null
  let worstBalanced = null
  for (const r of points) {
    if (!bestBalanced || r.balanceScore > bestBalanced.balanceScore) bestBalanced = r
    if (!worstBalanced || r.balanceScore < worstBalanced.balanceScore) worstBalanced = r
  }

  return { points, avgGoalsFor, avgGoalsAgainst, bestBalanced, worstBalanced }
}

// transfers: {club_name, short_name, type, fee}[] — caller has already
// filtered to status='published'.
export function computeTransferMarket(transfers) {
  const byClub = new Map()
  let excludedDealCount = 0

  for (const t of transfers) {
    if (t.type !== 'in' && t.type !== 'out') continue

    const amount = parseMoneyString(t.fee)
    if (amount === null) {
      excludedDealCount += 1
      continue
    }

    const key = t.short_name ?? t.club_name
    if (!byClub.has(key)) {
      byClub.set(key, { shortName: t.short_name, name: t.club_name, totalIn: 0, totalOut: 0 })
    }
    const entry = byClub.get(key)
    if (t.type === 'in') entry.totalIn += amount
    else entry.totalOut += amount
  }

  const byClubList = [...byClub.values()]
  const leagueTotalIn = byClubList.reduce((sum, c) => sum + c.totalIn, 0)
  const leagueTotalOut = byClubList.reduce((sum, c) => sum + c.totalOut, 0)

  let biggestSpender = null
  let biggestSeller = null
  for (const c of byClubList) {
    if (c.totalIn > 0 && (!biggestSpender || c.totalIn > biggestSpender.totalIn)) biggestSpender = c
    if (c.totalOut > 0 && (!biggestSeller || c.totalOut > biggestSeller.totalOut)) biggestSeller = c
  }

  return { byClub: byClubList, leagueTotalIn, leagueTotalOut, biggestSpender, biggestSeller, excludedDealCount }
}
