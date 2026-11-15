import type { FloorId } from '../routing/types'

/**
 * Static drawing of each floor of The Hollowmere Hotel. Units are SVG viewBox units and match the
 * node coordinates in src/routing/hotel.ts: corridors run along y = 200 (and y = 360 on Floor 2),
 * and every door gap sits where a graph edge crosses a wall.
 */

export const VIEW_WIDTH = 700

export type RoomVariant = 'room' | 'stairs' | 'lift' | 'service' | 'carpet' | 'library' | 'hall' | 'gallery'

export interface RoomShape {
  id: string
  x: number
  y: number
  width: number
  height: number
  number?: string
  name: string
  /** Where the big number is drawn. Defaults to the centre. */
  labelX?: number
  labelY?: number
  variant?: RoomVariant
  /** Draw the name upright along the room (narrow rooms a route passes through). */
  verticalName?: boolean
  /** Stair label: which way the Grand Staircase goes from this floor. */
  stairNote?: string
}

export interface DoorShape {
  /** Gap in a wall: [x1, y1, x2, y2]. */
  gap: [number, number, number, number]
  /** Graph edge that passes this door. A closed edge draws its lock here. */
  edge?: string
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface FloorLayout {
  floor: FloorId
  title: string
  height: number
  building: Rect
  /** Carpeted circulation: corridors and passages. */
  corridors: Rect[]
  rooms: RoomShape[]
  doors: DoorShape[]
  outdoor: boolean
}

/** Door gap in a horizontal wall at height y, centred on x. */
const h = (x: number, y: number, edge?: string, half = 14): DoorShape => ({ gap: [x - half, y, x + half, y], edge })
/** Door gap in a vertical wall at x, centred on y. */
const v = (x: number, y: number, edge?: string, half = 14): DoorShape => ({ gap: [x, y - half, x, y + half], edge })

const CORRIDOR: Rect = { x: 20, y: 180, width: 600, height: 40 }

/** The top band is the same on every floor: the lift shaft and the Grand Staircase stack. */
function topBand(floor: FloorId, west: RoomShape, east: RoomShape, stairNote: string): RoomShape[] {
  return [
    west,
    { id: `stairs-${floor}`, x: 200, y: 20, width: 200, height: 160, name: 'Grand Staircase', variant: 'stairs', stairNote },
    east,
    { id: `staff-${floor}`, x: 510, y: 20, width: 110, height: 75, name: 'Staff', variant: 'service' },
    { id: `lift-${floor}`, x: 515, y: 95, width: 90, height: 85, name: 'Lift', variant: 'lift', labelX: 536 },
  ]
}

function topDoors(floor: FloorId, westEdge?: string, eastEdge?: string): DoorShape[] {
  return [h(120, 180, westEdge), h(320, 180, `c${floor}-stairs`), h(455, 180, eastEdge), h(560, 180, `lift-door-${floor}`)]
}

export const FLOORS: FloorLayout[] = [
  {
    floor: 1,
    title: 'Floor 1',
    height: 440,
    building: { x: 20, y: 20, width: 600, height: 320 },
    corridors: [CORRIDOR],
    outdoor: true,
    rooms: [
      ...topBand(
        1,
        { id: 'room-101', x: 20, y: 20, width: 180, height: 160, number: '101', name: 'Ivy Room', labelY: 84 },
        { id: 'room-102', x: 400, y: 20, width: 110, height: 160, number: '102', name: 'Office', labelY: 84 },
        '▲ up',
      ),
      { id: 'room-103', x: 20, y: 220, width: 180, height: 120, number: '103', name: 'Cloakroom', labelY: 292 },
      { id: 'lobby', x: 200, y: 220, width: 200, height: 120, name: 'Lobby', variant: 'carpet', labelX: 262, labelY: 286 },
      { id: 'garden-vestibule', x: 400, y: 220, width: 110, height: 120, name: 'Vestibule', variant: 'service', labelX: 424, labelY: 282, verticalName: true },
      { id: 'room-104', x: 510, y: 220, width: 110, height: 120, number: '104', name: 'Garden Hall', labelX: 572, labelY: 296 },
    ],
    doors: [
      ...topDoors(1, 'door-101', 'door-102'),
      h(120, 220, 'door-103'),
      h(320, 220, 'lobby-corridor', 24),
      h(455, 220, 'vestibule-corridor'),
      h(560, 220, 'door-104'),
      v(510, 248, 'vestibule-104'),
      h(320, 340, 'entrance-lobby', 24),
      h(455, 340, 'garden-door'),
      v(620, 200, 'side-door'),
    ],
  },
  {
    floor: 2,
    title: 'Floor 2',
    height: 480,
    building: { x: 20, y: 20, width: 600, height: 440 },
    corridors: [
      CORRIDOR,
      { x: 20, y: 220, width: 30, height: 120 },
      { x: 20, y: 340, width: 600, height: 40 },
    ],
    outdoor: false,
    rooms: [
      ...topBand(
        2,
        { id: 'room-201', x: 20, y: 20, width: 180, height: 160, number: '201', name: 'Reading Room', labelY: 84 },
        { id: 'room-202', x: 400, y: 20, width: 110, height: 160, number: '202', name: 'Linen Store', labelY: 84 },
        '▲ up · ▼ down',
      ),
      { id: 'room-203', x: 50, y: 220, width: 150, height: 120, number: '203', name: 'Blue Room', labelY: 292 },
      { id: 'room-206', x: 200, y: 220, width: 220, height: 120, number: '206', name: 'Portrait Gallery', labelX: 262, labelY: 278, variant: 'gallery' },
      { id: 'room-204', x: 420, y: 220, width: 200, height: 120, number: '204', name: 'Gold Room', labelX: 492, labelY: 292 },
      { id: 'storage-2', x: 20, y: 380, width: 400, height: 80, name: 'Storage', variant: 'service' },
      { id: 'room-205', x: 420, y: 380, width: 200, height: 80, number: '205', name: 'Card Room', labelX: 572, labelY: 418 },
    ],
    doors: [
      ...topDoors(2, 'door-201', 'door-202'),
      h(120, 220, 'door-203'),
      h(320, 220, 'door-206-north'),
      h(560, 220, 'door-204'),
      h(320, 340, 'door-206-south'),
      h(510, 380, 'door-205'),
    ],
  },
  {
    floor: 3,
    title: 'Floor 3',
    height: 360,
    building: { x: 20, y: 20, width: 600, height: 320 },
    corridors: [CORRIDOR],
    outdoor: false,
    rooms: [
      ...topBand(
        3,
        { id: 'archive-3', x: 20, y: 20, width: 180, height: 160, name: 'Archive', variant: 'service' },
        { id: 'linen-3', x: 400, y: 20, width: 110, height: 160, name: 'Linen', variant: 'service' },
        '▼ down',
      ),
      { id: 'room-301', x: 20, y: 220, width: 280, height: 120, number: '301', name: 'Library', labelX: 190, labelY: 282, variant: 'library' },
      { id: 'room-302', x: 300, y: 220, width: 320, height: 120, number: '302', name: 'Moonlight Hall', labelX: 540, labelY: 282, variant: 'hall' },
    ],
    doors: [...topDoors(3), h(120, 220, 'door-301'), h(455, 220, 'door-302')],
  },
]

export function layoutFor(floor: FloorId): FloorLayout {
  return FLOORS.find((f) => f.floor === floor)!
}

/** Centre of the door that a graph edge passes, on the given floor, if the plan draws one. */
export function doorFor(edgeId: string, floor: FloorId): { x: number; y: number; horizontal: boolean } | null {
  const door = layoutFor(floor).doors.find((d) => d.edge === edgeId)
  if (!door) return null
  const [x1, y1, x2, y2] = door.gap
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, horizontal: y1 === y2 }
}
