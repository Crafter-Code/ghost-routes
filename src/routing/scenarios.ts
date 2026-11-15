import { BOOKED_ROOM, LIFT_EDGES } from './hotel'
import type { FloorId } from './types'
import type { ScenarioState } from './plan'

/** The three organizer scenarios. Each has an event room and the controls that close transitions. */

export type ScenarioId = 'lift' | 'gallery' | 'entrance'

export interface ClosureControl {
  id: string
  label: string
  /** All of these edges open and close together. */
  edges: readonly string[]
}

export interface ScenarioDef {
  id: ScenarioId
  title: string
  /** One line for the scenario picker. */
  hint: string
  bookedRoom: string
  /** Floor the map opens on when the visitor picks this scenario. */
  focusFloor: FloorId
  controls: readonly ClosureControl[]
}

const LIFT_CONTROL: ClosureControl = { id: 'lift', label: 'Lift out of service', edges: LIFT_EDGES }

export const SCENARIOS: Readonly<Record<ScenarioId, ScenarioDef>> = {
  lift: {
    id: 'lift',
    title: 'Lift out, move to Room 104',
    hint: 'Workshop in Room 204. The lift fails.',
    bookedRoom: BOOKED_ROOM,
    focusFloor: 1,
    controls: [LIFT_CONTROL],
  },
  gallery: {
    id: 'gallery',
    title: 'Gallery door closed',
    hint: 'Exhibition in the Portrait Gallery, Room 206. A door closes.',
    bookedRoom: 'room-206',
    focusFloor: 2,
    controls: [
      { id: 'central-door', label: 'Close central door', edges: ['door-206-north'] },
      { id: 'walk-door', label: 'Close Gallery Walk door', edges: ['door-206-south'] },
      LIFT_CONTROL,
    ],
  },
  entrance: {
    id: 'entrance',
    title: 'Side Entrance closed',
    hint: 'Workshop in Room 204. The ramp door is locked.',
    bookedRoom: BOOKED_ROOM,
    focusFloor: 1,
    controls: [
      { id: 'side-entrance', label: 'Close Side Entrance', edges: ['side-door'] },
      { id: 'garden-entrance', label: 'Close Garden Entrance', edges: ['garden-door'] },
    ],
  },
}

export const SCENARIO_IDS: readonly ScenarioId[] = ['lift', 'gallery', 'entrance']

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && (SCENARIO_IDS as readonly string[]).includes(value)
}

/** The state a preset starts from: its room, nothing closed, Step-free, no move. */
export function initialStateFor(id: ScenarioId): ScenarioState {
  return { scenario: id, profile: 'step-free', closedEdges: [], eventRoom: SCENARIOS[id].bookedRoom, movedFrom: null }
}

/** Every edge any control of the scenario can close. */
export function controlEdges(id: ScenarioId): Set<string> {
  return new Set(SCENARIOS[id].controls.flatMap((control) => control.edges))
}
