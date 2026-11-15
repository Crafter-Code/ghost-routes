import type { FloorId, Graph, GraphEdge, GraphNode, NodeKind } from './types'

/** The Hollowmere Hotel: a fictional two-floor hotel. Coordinates match src/map/layout.ts. */

export const START = 'forecourt'
export const LIFT_EDGE = 'lift'
export const BOOKED_ROOM = 'room-204'

/** Alternatives the hotel offers for each event room, in preference order. */
export const RELOCATION_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  'room-204': ['room-203', 'room-104'],
}

function node(
  id: string,
  label: string,
  floor: FloorId,
  x: number,
  y: number,
  kind: NodeKind,
  extra: Partial<Pick<GraphNode, 'phrase' | 'landmark'>> = {},
): GraphNode {
  return { id, label, phrase: extra.phrase ?? label, floor, x, y, kind, landmark: extra.landmark }
}

function room(id: string, number: string, name: string, floor: FloorId, x: number, y: number): GraphNode {
  return node(id, `Room ${number}`, floor, x, y, 'room', { phrase: `Room ${number} (${name})` })
}

const nodes: GraphNode[] = [
  // Floor 1, outdoors
  node('forecourt', 'Hotel forecourt', 1, 420, 410, 'outdoor', { phrase: 'the hotel forecourt' }),
  node('ramp-base', 'Side ramp', 1, 660, 410, 'outdoor', { phrase: 'the foot of the side ramp' }),
  // Floor 1, entrances and corridors
  node('main-entrance', 'Main Entrance', 1, 320, 345, 'entrance', { phrase: 'the Main Entrance' }),
  node('side-entrance', 'Side Entrance', 1, 660, 200, 'entrance', { phrase: 'the Side Entrance' }),
  node('lobby', 'Lobby', 1, 320, 280, 'corridor', { phrase: 'the lobby', landmark: true }),
  node('corridor-1-west', 'West corridor', 1, 120, 200, 'corridor', { phrase: 'the west corridor' }),
  node('corridor-1-mid', 'Central corridor', 1, 320, 200, 'corridor', { phrase: 'the central corridor' }),
  node('corridor-1-east', 'East corridor', 1, 455, 200, 'corridor', { phrase: 'the east corridor' }),
  node('lift-lobby-1', 'Lift lobby', 1, 560, 200, 'corridor', { phrase: 'the lift lobby' }),
  node('stairs-1', 'Grand Staircase', 1, 300, 120, 'stairs', { phrase: 'the foot of the Grand Staircase' }),
  node('lift-1', 'Lift, Floor 1', 1, 560, 140, 'lift', { phrase: 'the lift door on Floor 1' }),
  room('room-101', '101', 'Ivy Room', 1, 120, 120),
  room('room-102', '102', 'Office', 1, 455, 140),
  room('room-103', '103', 'Cloakroom', 1, 120, 270),
  room('room-104', '104', 'Garden Hall', 1, 560, 270),
  // Floor 2
  node('stairs-2', 'Grand Staircase landing', 2, 300, 120, 'stairs', { phrase: 'the top of the Grand Staircase' }),
  node('lift-2', 'Lift, Floor 2', 2, 560, 140, 'lift', { phrase: 'the lift door on Floor 2' }),
  node('corridor-2-west', 'West corridor', 2, 120, 200, 'corridor', { phrase: 'the west corridor' }),
  node('corridor-2-mid', 'Central corridor', 2, 320, 200, 'corridor', { phrase: 'the central corridor' }),
  node('corridor-2-east', 'East corridor', 2, 455, 200, 'corridor', { phrase: 'the east corridor' }),
  node('lift-lobby-2', 'Lift lobby', 2, 560, 200, 'corridor', { phrase: 'the lift lobby' }),
  room('room-201', '201', 'Reading Room', 2, 120, 120),
  room('room-202', '202', 'Linen Store', 2, 455, 140),
  room('room-203', '203', 'Blue Room', 2, 120, 270),
  room('room-204', '204', 'Gold Room', 2, 560, 270),
  room('room-205', '205', 'Card Room', 2, 320, 270),
]

function edge(id: string, from: string, to: string, kind: GraphEdge['kind'], cost: number, extra: Partial<GraphEdge> = {}): GraphEdge {
  return { id, from, to, kind, cost, ...extra }
}

const edges: GraphEdge[] = [
  // Approach
  edge('front-steps', 'forecourt', 'main-entrance', 'steps', 20, { name: 'front steps' }),
  edge('forecourt-path', 'forecourt', 'ramp-base', 'walk', 15),
  edge('side-ramp', 'ramp-base', 'side-entrance', 'ramp', 25, { name: 'side ramp' }),
  // Floor 1
  edge('entrance-lobby', 'main-entrance', 'lobby', 'walk', 10),
  edge('lobby-corridor', 'lobby', 'corridor-1-mid', 'walk', 10),
  edge('c1-west-mid', 'corridor-1-west', 'corridor-1-mid', 'walk', 20),
  edge('c1-mid-east', 'corridor-1-mid', 'corridor-1-east', 'walk', 15),
  edge('c1-east-lift-lobby', 'corridor-1-east', 'lift-lobby-1', 'walk', 10),
  edge('side-door', 'side-entrance', 'lift-lobby-1', 'walk', 10),
  edge('c1-stairs', 'corridor-1-mid', 'stairs-1', 'walk', 10),
  edge('lift-door-1', 'lift-lobby-1', 'lift-1', 'walk', 5),
  edge('door-101', 'corridor-1-west', 'room-101', 'walk', 10),
  edge('door-102', 'corridor-1-east', 'room-102', 'walk', 10),
  edge('door-103', 'corridor-1-west', 'room-103', 'walk', 10),
  edge('door-104', 'lift-lobby-1', 'room-104', 'walk', 10),
  // Between floors
  edge('grand-staircase', 'stairs-1', 'stairs-2', 'stairs', 30, { name: 'Grand Staircase' }),
  edge(LIFT_EDGE, 'lift-1', 'lift-2', 'lift', 70, { name: 'lift', closedMessage: 'The lift is out of service.' }),
  // Floor 2
  edge('c2-stairs', 'stairs-2', 'corridor-2-mid', 'walk', 10),
  edge('c2-west-mid', 'corridor-2-west', 'corridor-2-mid', 'walk', 20),
  edge('c2-mid-east', 'corridor-2-mid', 'corridor-2-east', 'walk', 15),
  edge('c2-east-lift-lobby', 'corridor-2-east', 'lift-lobby-2', 'walk', 10),
  edge('lift-door-2', 'lift-2', 'lift-lobby-2', 'walk', 5),
  edge('door-201', 'corridor-2-west', 'room-201', 'walk', 10),
  edge('door-202', 'corridor-2-east', 'room-202', 'walk', 10),
  edge('door-203', 'corridor-2-west', 'room-203', 'walk', 10),
  edge('door-204', 'lift-lobby-2', 'room-204', 'walk', 10),
  edge('door-205', 'corridor-2-mid', 'room-205', 'walk', 10),
]

export const HOTEL: Graph = {
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  edges,
}
