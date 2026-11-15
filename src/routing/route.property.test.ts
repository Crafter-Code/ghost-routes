import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkCandidates, divergeIndex, drawnGhostLegs, findRoute, firstReachable, ghostTrail, isTraversable, STEP_KINDS } from './route'
import type { EdgeKind, Graph, GraphEdge, GraphNode, Profile } from './types'

/**
 * Property tests for the routing core (design.md, "Correctness properties").
 * Each property names the requirement it checks.
 */

const KINDS: EdgeKind[] = ['walk', 'ramp', 'steps', 'stairs', 'lift']
const profileArb = fc.constantFrom<Profile>('steps-allowed', 'step-free')

interface Case {
  graph: Graph
  start: string
  target: string
  closed: Set<string>
  extra: string
}

const caseArb: fc.Arbitrary<Case> = fc.integer({ min: 2, max: 9 }).chain((size) => {
  const ids = Array.from({ length: size }, (_, i) => `n${i}`)
  const edgeArb = fc.record({
    from: fc.constantFrom(...ids),
    to: fc.constantFrom(...ids),
    kind: fc.constantFrom(...KINDS),
    cost: fc.integer({ min: 1, max: 50 }),
  })
  return fc.array(edgeArb, { minLength: 0, maxLength: size * 3 }).chain((raw) => {
    const edges: GraphEdge[] = raw.map((e, i) => ({ id: `e${i}`, ...e }))
    const edgeIds = edges.map((e) => e.id)
    const nodes: Record<string, GraphNode> = Object.fromEntries(
      ids.map((id, i) => [id, { id, label: id, phrase: id, floor: i % 2 === 0 ? 1 : 2, x: 0, y: 0, kind: 'corridor' } as GraphNode]),
    )
    return fc.record({
      graph: fc.constant<Graph>({ nodes, edges }),
      start: fc.constantFrom(...ids),
      target: fc.constantFrom(...ids),
      closed: fc.subarray(edgeIds).map((list) => new Set(list)),
      extra: edgeIds.length > 0 ? fc.constantFrom(...edgeIds) : fc.constant('none'),
    })
  })
})

describe('routing properties', () => {
  it('P1 (Req 2.6): a found route is a connected chain of open, traversable edges', () => {
    fc.assert(
      fc.property(caseArb, profileArb, ({ graph, start, target, closed }, profile) => {
        const route = findRoute(graph, start, target, profile, closed)
        if (!route.found) return
        expect(route.nodes[0]).toBe(start)
        expect(route.nodes.at(-1)).toBe(target)
        expect(route.nodes.length).toBe(route.legs.length + 1)
        route.legs.forEach((leg, i) => {
          expect(closed.has(leg.edge.id)).toBe(false)
          expect(isTraversable(leg.edge, profile, closed)).toBe(true)
          expect(leg.from).toBe(route.nodes[i])
          expect(leg.to).toBe(route.nodes[i + 1])
          expect([leg.edge.from, leg.edge.to].sort()).toEqual([leg.from, leg.to].sort())
        })
        expect(route.cost).toBe(route.legs.reduce((sum, leg) => sum + leg.edge.cost, 0))
      }),
    )
  })

  it('P2 (Req 1.5): a step-free route never contains steps or stairs', () => {
    fc.assert(
      fc.property(caseArb, ({ graph, start, target, closed }) => {
        const route = findRoute(graph, start, target, 'step-free', closed)
        for (const leg of route.legs) expect(STEP_KINDS.has(leg.edge.kind)).toBe(false)
      }),
    )
  })

  it('P3 (Req 2.7): closing one more edge never makes an unreachable target reachable', () => {
    fc.assert(
      fc.property(caseArb, profileArb, ({ graph, start, target, closed, extra }, profile) => {
        const before = findRoute(graph, start, target, profile, closed)
        const after = findRoute(graph, start, target, profile, new Set([...closed, extra]))
        if (!before.found) expect(after.found).toBe(false)
        if (after.found) expect(after.cost).toBeGreaterThanOrEqual(before.cost)
      }),
    )
  })

  it('P4 (Req 3.2, 3.3): the ghost trail is a prefix that ends before the first closed edge', () => {
    fc.assert(
      fc.property(caseArb, profileArb, ({ graph, start, target, closed }, profile) => {
        const baseline = findRoute(graph, start, target, profile)
        const ghost = ghostTrail(baseline, closed)
        const firstClosed = baseline.legs.findIndex((leg) => closed.has(leg.edge.id))
        if (!baseline.found || firstClosed === -1) {
          expect(ghost).toBeNull()
          return
        }
        expect(ghost).not.toBeNull()
        expect(ghost!.legs).toEqual(baseline.legs.slice(0, firstClosed))
        expect(ghost!.legs.some((leg) => closed.has(leg.edge.id))).toBe(false)
        expect(ghost!.endsAt).toBe(baseline.legs[firstClosed].from)
        expect(ghost!.blockedBy).toBe(baseline.legs[firstClosed].edge)
      }),
    )
  })

  it('P5 (Req 4.1, 4.2): the proposal is the first candidate with a route', () => {
    fc.assert(
      fc.property(caseArb, profileArb, ({ graph, start, closed }, profile) => {
        const candidates = Object.keys(graph.nodes)
        const checks = checkCandidates(graph, start, candidates, profile, closed)
        const proposal = firstReachable(checks)
        const firstFound = checks.findIndex((c) => c.route.found)
        if (firstFound === -1) expect(proposal).toBeNull()
        else expect(proposal!.room).toBe(candidates[firstFound])
        if (proposal) expect(proposal.route.found).toBe(true)
      }),
    )
  })
})

/**
 * Properties for the Haunted Hotel Expansion (.kiro/specs/haunted-hotel-expansion/).
 * P8 to P10 of the spec depend on hotel data (entrance gates, presets, directions) and are checked
 * over every preset in src/routing/expansion.test.ts instead.
 */
describe('expansion properties', () => {
  it('P6 (Req 3.6, 7.8): closing a whole group of edges keeps them out of every route and never reopens a target', () => {
    fc.assert(
      fc.property(caseArb, profileArb, fc.array(fc.nat(), { maxLength: 4 }), ({ graph, start, target, closed }, profile, picks) => {
        if (graph.edges.length === 0) return
        const group = picks.map((n) => graph.edges[n % graph.edges.length].id)
        const before = findRoute(graph, start, target, profile, closed)
        const after = findRoute(graph, start, target, profile, new Set([...closed, ...group]))
        for (const leg of after.legs) expect(group).not.toContain(leg.edge.id)
        if (!before.found) expect(after.found).toBe(false)
        if (after.found) expect(after.cost).toBeGreaterThanOrEqual(before.cost)
      }),
    )
  })

  it('P7 (Req 13.1, 13.2, 13.3): the drawn ghost trail starts where the routes part and ends at the first closed edge', () => {
    fc.assert(
      fc.property(caseArb, profileArb, ({ graph, start, target, closed }, profile) => {
        const baseline = findRoute(graph, start, target, profile)
        const route = findRoute(graph, start, target, profile, closed)
        const ghost = ghostTrail(baseline, closed)
        if (!ghost) return
        const drawn = drawnGhostLegs(ghost, route, baseline)
        const d = route.found ? (divergeIndex(route, baseline) ?? 0) : 0
        // The drawn trail is the end of the ghost trail, so it still ends before the closed edge.
        expect(drawn).toEqual(ghost.legs.slice(d))
        expect(drawn.some((leg) => closed.has(leg.edge.id))).toBe(false)
        if (!route.found) {
          expect(drawn).toEqual(ghost.legs)
          return
        }
        // The routes share exactly the first d legs, and they part no later than the closed edge.
        expect(d).toBeLessThanOrEqual(ghost.legs.length)
        expect(route.legs.slice(0, d).map((l) => l.edge.id)).toEqual(baseline.legs.slice(0, d).map((l) => l.edge.id))
        // The trail starts at the node where they part, or is empty when they part at the closed edge.
        if (drawn.length > 0) expect(drawn[0].from).toBe(route.nodes[d])
        else expect(ghost.endsAt).toBe(route.nodes[d])
        if (drawn.length > 0) expect(drawn[drawn.length - 1].to).toBe(ghost.endsAt)
      }),
    )
  })
})
