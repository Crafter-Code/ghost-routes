import type { FloorId } from '../routing/types'

/** Static drawing of each floor. Units match node coordinates in src/routing/hotel.ts. */

export const VIEWBOX = { width: 700, height: 440 }

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
  variant?: 'room' | 'stairs' | 'lift' | 'service' | 'carpet'
}

export interface FloorLayout {
  floor: FloorId
  title: string
  rooms: RoomShape[]
  /** Door gaps in the outer wall: [x1, y1, x2, y2]. */
  doors: [number, number, number, number][]
  outdoor: boolean
}

const BUILDING = { x: 20, y: 20, width: 600, height: 320 }
export { BUILDING }

export const CORRIDOR = { x: 20, y: 180, width: 600, height: 40 }

export const FLOORS: FloorLayout[] = [
  {
    floor: 1,
    title: 'Floor 1',
    outdoor: true,
    doors: [
      [296, 340, 344, 340],
      [620, 186, 620, 214],
    ],
    rooms: [
      { id: 'room-101', x: 20, y: 20, width: 180, height: 160, number: '101', name: 'Ivy Room' },
      { id: 'stairs-1', x: 200, y: 20, width: 200, height: 160, name: 'Grand Staircase', variant: 'stairs' },
      { id: 'room-102', x: 400, y: 20, width: 110, height: 160, number: '102', name: 'Office', labelY: 85 },
      { id: 'staff-1', x: 510, y: 20, width: 110, height: 75, name: 'Staff', variant: 'service' },
      { id: 'lift-1', x: 515, y: 95, width: 90, height: 85, name: 'Lift', variant: 'lift' },
      { id: 'room-103', x: 20, y: 220, width: 180, height: 120, number: '103', name: 'Cloakroom' },
      { id: 'lobby', x: 200, y: 220, width: 220, height: 120, name: 'Lobby', variant: 'carpet', labelY: 300 },
      { id: 'room-104', x: 420, y: 220, width: 200, height: 120, number: '104', name: 'Garden Hall', labelX: 490 },
    ],
  },
  {
    floor: 2,
    title: 'Floor 2',
    outdoor: false,
    doors: [],
    rooms: [
      { id: 'room-201', x: 20, y: 20, width: 180, height: 160, number: '201', name: 'Reading Room' },
      { id: 'stairs-2', x: 200, y: 20, width: 200, height: 160, name: 'Grand Staircase', variant: 'stairs' },
      { id: 'room-202', x: 400, y: 20, width: 110, height: 160, number: '202', name: 'Linen Store', labelY: 85 },
      { id: 'staff-2', x: 510, y: 20, width: 110, height: 75, name: 'Staff', variant: 'service' },
      { id: 'lift-2', x: 515, y: 95, width: 90, height: 85, name: 'Lift', variant: 'lift' },
      { id: 'room-203', x: 20, y: 220, width: 180, height: 120, number: '203', name: 'Blue Room' },
      { id: 'room-205', x: 200, y: 220, width: 220, height: 120, number: '205', name: 'Card Room' },
      { id: 'room-204', x: 420, y: 220, width: 200, height: 120, number: '204', name: 'Gold Room', labelX: 490 },
    ],
  },
]
