import type { EdgeKind, GhostTrail, Graph, GraphEdge, Leg, Profile, RouteResult } from './types'

/** Transitions a step-free visitor can never use. */
export const STEP_KINDS: ReadonlySet<EdgeKind> = new Set<EdgeKind>(['steps', 'stairs'])

/** The single rule that decides whether a profile may use an edge. */
export function isTraversable(edge: GraphEdge, profile: Profile, closed: ReadonlySet<string>): boolean {
  if (closed.has(edge.id)) return false
  if (profile === 'step-free' && STEP_KINDS.has(edge.kind)) return false
  return true
}

function notFound(from: string, to: string, profile: Profile): RouteResult {
  return { found: false, from, to, profile, nodes: [], legs: [], cost: Infinity }
}

/**
 * Cheapest route from `from` to `to` (Dijkstra over an undirected graph).
 * Every leg of a found route satisfies `isTraversable`.
 */
export function findRoute(
  graph: Graph,
  from: string,
  to: string,
  profile: Profile,
  closed: ReadonlySet<string> = new Set(),
): RouteResult {
  if (!(from in graph.nodes) || !(to in graph.nodes)) return notFound(from, to, profile)

  const adjacency = new Map<string, Leg[]>()
  for (const id of Object.keys(graph.nodes)) adjacency.set(id, [])
  for (const edge of graph.edges) {
    if (!isTraversable(edge, profile, closed)) continue
    if (!adjacency.has(edge.from) || !adjacency.has(edge.to)) continue
    adjacency.get(edge.from)!.push({ edge, from: edge.from, to: edge.to })
    if (edge.from !== edge.to) adjacency.get(edge.to)!.push({ edge, from: edge.to, to: edge.from })
  }

  const dist = new Map<string, number>([[from, 0]])
  const via = new Map<string, Leg>()
  const done = new Set<string>()

  while (true) {
    let current: string | null = null
    let best = Infinity
    for (const [id, d] of dist) {
      if (!done.has(id) && d < best) {
        best = d
        current = id
      }
    }
    if (current === null) break
    if (current === to) break
    done.add(current)
    for (const leg of adjacency.get(current)!) {
      const next = best + leg.edge.cost
      if (next < (dist.get(leg.to) ?? Infinity)) {
        dist.set(leg.to, next)
        via.set(leg.to, leg)
      }
    }
  }

  if (!dist.has(to)) return notFound(from, to, profile)

  const legs: Leg[] = []
  let cursor = to
  while (cursor !== from) {
    const leg = via.get(cursor)!
    legs.unshift(leg)
    cursor = leg.from
  }
  const nodes = [from, ...legs.map((leg) => leg.to)]
  return { found: true, from, to, profile, nodes, legs, cost: dist.get(to)! }
}

/**
 * The still-walkable part of a baseline route: every leg before the first
 * closed leg. Returns null when the baseline uses no closed edge.
 */
export function ghostTrail(baseline: RouteResult, closed: ReadonlySet<string>): GhostTrail | null {
  if (!baseline.found) return null
  const index = baseline.legs.findIndex((leg) => closed.has(leg.edge.id))
  if (index === -1) return null
  const blocked = baseline.legs[index]
  return { legs: baseline.legs.slice(0, index), endsAt: blocked.from, blockedBy: blocked.edge }
}

export interface CandidateCheck {
  room: string
  route: RouteResult
}

/** Route to every candidate with the same rules; order is preserved. */
export function checkCandidates(
  graph: Graph,
  start: string,
  candidates: readonly string[],
  profile: Profile,
  closed: ReadonlySet<string>,
): CandidateCheck[] {
  return candidates.map((room) => ({ room, route: findRoute(graph, start, room, profile, closed) }))
}

/** The first candidate that has a route, or null. */
export function firstReachable(checks: readonly CandidateCheck[]): CandidateCheck | null {
  return checks.find((check) => check.route.found) ?? null
}
