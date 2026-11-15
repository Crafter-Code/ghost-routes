import { describe, expect, it } from 'vitest'
import { HOTEL } from '../routing/hotel'
import type { FloorId, GraphNode } from '../routing/types'
import { FLOORS, layoutFor, type Rect } from './layout'

/**
 * The drawn route is a straight line between graph nodes. These tests check that every such line
 * stays inside the building's corridors and rooms and crosses a wall only through a door gap.
 * Requirement 1 (the plan matches the graph) and 8.1 (map and text draw the same route).
 */

const inside = (r: Rect, x: number, y: number, pad = 0) =>
  x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad

function wallsOf(floor: FloorId): [number, number, number, number][] {
  const layout = layoutFor(floor)
  const rects = [...layout.rooms, layout.building]
  return rects.flatMap((r) => [
    [r.x, r.y, r.x + r.width, r.y],
    [r.x, r.y + r.height, r.x + r.width, r.y + r.height],
    [r.x, r.y, r.x, r.y + r.height],
    [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
  ] as [number, number, number, number][])
}

const onSegment = ([x1, y1, x2, y2]: number[], x: number, y: number, tol: number) =>
  x >= Math.min(x1, x2) - tol && x <= Math.max(x1, x2) + tol && y >= Math.min(y1, y2) - tol && y <= Math.max(y1, y2) + tol

const sameFloorEdges = HOTEL.edges.filter((e) => HOTEL.nodes[e.from].floor === HOTEL.nodes[e.to].floor)

describe('floor plans match the graph', () => {
  it('there is one layout per floor and every floor of the graph is drawn', () => {
    expect(FLOORS.map((f) => f.floor)).toEqual([1, 2, 3])
  })

  it('every door in the plans names a real edge on that floor', () => {
    for (const layout of FLOORS) {
      for (const door of layout.doors.filter((d) => d.edge)) {
        const edge = HOTEL.edges.find((e) => e.id === door.edge)
        expect(edge, `${layout.floor}: ${door.edge}`).toBeDefined()
        expect(HOTEL.nodes[edge!.from].floor).toBe(layout.floor)
        expect(HOTEL.nodes[edge!.to].floor).toBe(layout.floor)
      }
    }
  })

  it('every room node sits inside its own room drawing, near the door', () => {
    for (const node of Object.values(HOTEL.nodes).filter((n) => n.kind === 'room')) {
      const shape = layoutFor(node.floor).rooms.find((r) => r.id === node.id)
      expect(shape, node.id).toBeDefined()
      expect(inside(shape!, node.x, node.y), node.id).toBe(true)
    }
  })

  it('every corridor node sits on a carpeted corridor', () => {
    for (const node of Object.values(HOTEL.nodes).filter((n) => n.kind === 'corridor' && n.id.includes('corridor'))) {
      const ok = layoutFor(node.floor).corridors.some((c) => inside(c, node.x, node.y))
      expect(ok, node.id).toBe(true)
    }
  })

  it('each walking line crosses walls only through a door gap of its own edge', () => {
    for (const edge of sameFloorEdges) {
      const a: GraphNode = HOTEL.nodes[edge.from]
      const b: GraphNode = HOTEL.nodes[edge.to]
      const layout = layoutFor(a.floor)
      const walls = wallsOf(a.floor)
      const doors = layout.doors.filter((d) => d.edge === edge.id)
      for (let i = 0; i <= 200; i++) {
        const x = a.x + ((b.x - a.x) * i) / 200
        const y = a.y + ((b.y - a.y) * i) / 200
        // Outside the building (forecourt, ramp, garden path) there are no walls to cross.
        if (!inside(layout.building, x, y, 0.5)) continue
        const onWall = walls.some((w) => onSegment(w, x, y, 1))
        if (!onWall) continue
        const throughDoor = doors.some((d) => onSegment(d.gap, x, y, 1.5))
        expect(throughDoor, `${edge.id} hits a wall at (${x.toFixed(1)}, ${y.toFixed(1)}) on Floor ${a.floor}`).toBe(true)
      }
    }
  })

  it('every edge that passes from one space to another has a door drawn for it', () => {
    for (const edge of sameFloorEdges) {
      const a = HOTEL.nodes[edge.from]
      const b = HOTEL.nodes[edge.to]
      const walls = wallsOf(a.floor)
      const layout = layoutFor(a.floor)
      let crosses = false
      for (let i = 1; i < 200 && !crosses; i++) {
        const x = a.x + ((b.x - a.x) * i) / 200
        const y = a.y + ((b.y - a.y) * i) / 200
        if (inside(layout.building, x, y, 0.5) && walls.some((w) => onSegment(w, x, y, 0.5))) crosses = true
      }
      const entersBuilding = inside(layout.building, a.x, a.y) !== inside(layout.building, b.x, b.y)
      if (crosses || entersBuilding) {
        expect(layout.doors.some((d) => d.edge === edge.id), `${edge.id} needs a door`).toBe(true)
      }
    }
  })

  it('the garden vestibule has its own door into Room 104 and an exit to the corridor', () => {
    const doors = layoutFor(1).doors.map((d) => d.edge)
    expect(doors).toEqual(expect.arrayContaining(['vestibule-104', 'vestibule-corridor', 'garden-door', 'side-door', 'door-104']))
  })

  it('the Portrait Gallery has its north and south doors on Floor 2', () => {
    const doors = layoutFor(2).doors.map((d) => d.edge)
    expect(doors).toEqual(expect.arrayContaining(['door-206-north', 'door-206-south']))
    expect(layoutFor(2).corridors).toHaveLength(3)
  })

  it('Floor 3 draws the Library and the Moonlight Hall with their doors', () => {
    const rooms = layoutFor(3).rooms
    expect(rooms.find((r) => r.id === 'room-301')).toMatchObject({ name: 'Library', variant: 'library' })
    expect(rooms.find((r) => r.id === 'room-302')).toMatchObject({ name: 'Moonlight Hall', variant: 'hall' })
    expect(layoutFor(3).doors.map((d) => d.edge)).toEqual(expect.arrayContaining(['door-301', 'door-302']))
  })
})
