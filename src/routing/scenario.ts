import { HOTEL, RELOCATION_CANDIDATES } from './hotel'
import { INITIAL_STATE, PROFILES, planScenario, type ScenarioState } from './plan'
import { controlEdges, initialStateFor, isScenarioId, SCENARIOS, type ScenarioId } from './scenarios'
import type { Graph, Profile } from './types'

export type ScenarioAction =
  | { type: 'set-scenario'; scenario: ScenarioId }
  | { type: 'set-profile'; profile: Profile }
  | { type: 'toggle-closure'; id: string }
  /** Kept from the first release: toggles the lift control of the current scenario, if it has one. */
  | { type: 'toggle-lift' }
  | { type: 'confirm-move'; room: string }
  | { type: 'reset' }

/** Opens every edge of the control if all are closed, otherwise closes all of them together. */
function toggleControl(state: ScenarioState, controlId: string): ScenarioState {
  const control = SCENARIOS[state.scenario].controls.find((c) => c.id === controlId)
  if (!control) return state
  const allClosed = control.edges.every((id) => state.closedEdges.includes(id))
  const closedEdges = allClosed
    ? state.closedEdges.filter((id) => !control.edges.includes(id))
    : [...new Set([...state.closedEdges, ...control.edges])]
  return { ...state, closedEdges }
}

export function scenarioReducer(state: ScenarioState, action: ScenarioAction, graph: Graph = HOTEL): ScenarioState {
  switch (action.type) {
    case 'set-scenario':
      return isScenarioId(action.scenario) ? initialStateFor(action.scenario) : state
    case 'set-profile':
      return { ...state, profile: action.profile }
    case 'toggle-closure':
      return toggleControl(state, action.id)
    case 'toggle-lift':
      return toggleControl(state, 'lift')
    case 'confirm-move': {
      // Only the verified proposal can be confirmed.
      const plan = planScenario(graph, state)
      if (plan.proposal?.room !== action.room) return state
      return { ...state, eventRoom: action.room, movedFrom: state.eventRoom }
    }
    case 'reset':
      return INITIAL_STATE
  }
}

export const STORAGE_KEY = 'ghost-routes:v1'

/**
 * Accepts only a well-formed state that refers to real nodes and edges of its scenario.
 * A state saved by the first release has no `scenario`; it reads as the lift scenario.
 */
export function parseStoredState(raw: string | null, graph: Graph = HOTEL): ScenarioState {
  if (!raw) return INITIAL_STATE
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return INITIAL_STATE
    const v = value as Record<string, unknown>
    const scenario: unknown = v.scenario === undefined ? 'lift' : v.scenario
    if (!isScenarioId(scenario)) return INITIAL_STATE
    const def = SCENARIOS[scenario]
    const edgeIds = new Set(graph.edges.map((e) => e.id))
    const allowedEdges = controlEdges(scenario)
    const rooms = new Set([def.bookedRoom, ...(RELOCATION_CANDIDATES[def.bookedRoom] ?? [])])
    const isRoom = (id: unknown): id is string => typeof id === 'string' && graph.nodes[id]?.kind === 'room' && rooms.has(id)
    if (!PROFILES.includes(v.profile as Profile)) return INITIAL_STATE
    if (
      !Array.isArray(v.closedEdges) ||
      !v.closedEdges.every((id) => typeof id === 'string' && edgeIds.has(id) && allowedEdges.has(id))
    ) {
      return INITIAL_STATE
    }
    if (!isRoom(v.eventRoom)) return INITIAL_STATE
    if (v.movedFrom !== null && v.movedFrom !== def.bookedRoom) return INITIAL_STATE
    if ((v.movedFrom === null) !== (v.eventRoom === def.bookedRoom)) return INITIAL_STATE
    return {
      scenario,
      profile: v.profile as Profile,
      closedEdges: [...new Set(v.closedEdges as string[])],
      eventRoom: v.eventRoom,
      movedFrom: v.movedFrom as string | null,
    }
  } catch {
    return INITIAL_STATE
  }
}
