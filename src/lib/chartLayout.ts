// Collision handling for the scatter charts, in normalized data-space (each
// axis divided by its own range) so it works the same regardless of actual
// pixel size. Used by both SpendPerformanceChart and AttackDefenseChart.

export type PlotPoint = { key: string; x: number; y: number }

// Nudges near-coincident points apart so two clubs that are genuinely close
// in the underlying data (e.g. two clubs £11m apart in net spend, tied on
// points) never render as a single indistinguishable dot. Single O(n^2)
// pass — fine at the ~20-point scale these charts run at.
export function nudgeCollisions(
  points: PlotPoint[],
  xRange: number,
  yRange: number,
  threshold = 0.045,
): Map<string, { x: number; y: number }> {
  const nudged = points.map((p) => ({ ...p }))

  for (let i = 0; i < nudged.length; i++) {
    for (let j = i + 1; j < nudged.length; j++) {
      const dx = (nudged[i].x - nudged[j].x) / xRange
      const dy = (nudged[i].y - nudged[j].y) / yRange
      const dist = Math.hypot(dx, dy)

      if (dist < threshold) {
        const angle = dist === 0 ? (i % 2 === 0 ? 0 : Math.PI) : Math.atan2(dy, dx)
        const push = (threshold - dist) / 2 + 0.002
        nudged[i].x += Math.cos(angle) * push * xRange
        nudged[i].y += Math.sin(angle) * push * yRange
        nudged[j].x -= Math.cos(angle) * push * xRange
        nudged[j].y -= Math.sin(angle) * push * yRange
      }
    }
  }

  return new Map(nudged.map((p) => [p.key, { x: p.x, y: p.y }]))
}

// Whether a label placed to the right of `key` would land on top of another
// point's dot — if so, the caller should flip that label to the left side
// instead. This is what actually matters for legibility (more than the
// nudge above): a label's background halo can cover a neighboring dot even
// when the dots themselves are clearly separate.
export function labelWouldCollideRight(
  key: string,
  positions: Map<string, { x: number; y: number }>,
  xRange: number,
  yRange: number,
): boolean {
  const p = positions.get(key)
  if (!p) return false

  for (const [otherKey, other] of positions) {
    if (otherKey === key) continue
    const dx = (other.x - p.x) / xRange
    const dy = (other.y - p.y) / yRange
    if (dx > 0 && dx < 0.09 && Math.abs(dy) < 0.06) return true
  }

  return false
}
