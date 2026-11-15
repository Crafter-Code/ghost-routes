import { HOTEL } from '../routing/hotel'
import type { ScenarioPlan } from '../routing/plan'
import type { FloorId, GraphEdge, Leg, RouteResult } from '../routing/types'
import { doorFor } from './layout'

/** Reads what the map needs from the plan. It never routes. */

export const FLOOR_IDS: readonly FloorId[] = [1, 2, 3]

const nodeAt = (id: string) => HOTEL.nodes[id]

/** Legs drawn on this floor: both ends on the floor (floor changes are shown as badges). */
export function legsOnFloor(legs: readonly Leg[], floor: FloorId): Leg[] {
  return legs.filter((leg) => nodeAt(leg.from).floor === floor && nodeAt(leg.to).floor === floor)
}

export interface Ride {
  /** Node where the visitor gets on the lift or starts up the stairs. */
  from: string
  /** Node where the visitor gets off. */
  to: string
  name: string
}

/** Consecutive legs of the same lift or staircase in one direction form one ride (Floor 1 → 3 is one ride). */
export function floorRides(route: RouteResult): Ride[] {
  const rides: Ride[] = []
  let current: (Ride & { kind: string; up: boolean }) | null = null
  for (const leg of route.legs) {
    const from = nodeAt(leg.from)
    const to = nodeAt(leg.to)
    if (from.floor === to.floor) {
      current = null
      continue
    }
    const name = leg.edge.name ?? leg.edge.kind
    const up = to.floor > from.floor
    if (current && current.kind === leg.edge.kind && current.name === name && current.up === up && current.to === leg.from) {
      current.to = leg.to
    } else {
      current = { from: leg.from, to: leg.to, name, kind: leg.edge.kind, up }
      rides.push(current)
    }
  }
  return rides.map(({ from, to, name }) => ({ from, to, name }))
}

export interface LockSpot {
  /** Edge id for a door lock, node id for a lock at a lift or stair door. Used for test ids. */
  key: string
  x: number
  y: number
  edge: GraphEdge
  /** True for a door in a horizontal wall; false for a vertical wall or a lift. */
  horizontal: boolean
}

/**
 * Where to draw a lock for each closed edge on this floor: at its door when the plan draws one,
 * otherwise at each end node on this floor (the lift). One lock per spot.
 */
export function lockSpots(closed: ReadonlySet<string>, floor: FloorId): LockSpot[] {
  const spots = new Map<string, LockSpot>()
  for (const edge of HOTEL.edges) {
    if (!closed.has(edge.id)) continue
    const door = doorFor(edge.id, floor)
    if (door) {
      spots.set(edge.id, { key: edge.id, ...door, edge })
      continue
    }
    for (const id of [edge.from, edge.to]) {
      const n = nodeAt(id)
      if (n.floor === floor && !spots.has(id)) spots.set(id, { key: id, x: n.x, y: n.y, edge, horizontal: false })
    }
  }
  return [...spots.values()]
}

/** Short words for the floor switcher: what this floor shows right now. */
export function floorSummary(plan: ScenarioPlan, floor: FloorId): string[] {
  const words: string[] = []
  const onFloor = (id: string) => nodeAt(id).floor === floor
  const routeHere = plan.route.found && plan.route.nodes.some(onFloor)
  if (routeHere) words.push('Route')
  if (plan.ghostDrawn && legsOnFloor(plan.ghostDrawn.legs, floor).length > 0) words.push('Ghost trail')
  if (lockSpots(plan.closed, floor).length > 0) words.push('Closed')
  if (onFloor(plan.target)) words.push('Event room')
  return words
}
