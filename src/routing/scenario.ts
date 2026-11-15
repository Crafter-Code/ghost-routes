import { HOTEL, LIFT_EDGE } from './hotel'
import { INITIAL_STATE, PROFILES, planScenario, type ScenarioState } from './plan'
import type { Graph, Profile } from './types'

export type ScenarioAction =
  | { type: 'set-profile'; profile: Profile }
  | { type: 'toggle-lift' }
  | { type: 'confirm-move'; room: string }
  | { type: 'reset' }

export function scenarioReducer(state: ScenarioState, action: ScenarioAction, graph: Graph = HOTEL): ScenarioState {
  switch (action.type) {
    case 'set-profile':
      return { ...state, profile: action.profile }
    case 'toggle-lift': {
      const closed = state.closedEdges.includes(LIFT_EDGE)
      return {
        ...state,
        closedEdges: closed ? state.closedEdges.filter((id) => id !== LIFT_EDGE) : [...state.closedEdges, LIFT_EDGE],
      }
    }
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

/** Accepts only a well-formed state that refers to real nodes and edges. */
export function parseStoredState(raw: string | null, graph: Graph = HOTEL): ScenarioState {
  if (!raw) return INITIAL_STATE
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return INITIAL_STATE
    const v = value as Record<string, unknown>
    const edgeIds = new Set(graph.edges.map((e) => e.id))
    const isRoom = (id: unknown): id is string => typeof id === 'string' && graph.nodes[id]?.kind === 'room'
    if (!PROFILES.includes(v.profile as Profile)) return INITIAL_STATE
    if (!Array.isArray(v.closedEdges) || !v.closedEdges.every((id) => typeof id === 'string' && edgeIds.has(id))) {
      return INITIAL_STATE
    }
    if (!isRoom(v.eventRoom)) return INITIAL_STATE
    if (v.movedFrom !== null && !isRoom(v.movedFrom)) return INITIAL_STATE
    return {
      profile: v.profile as Profile,
      closedEdges: [...new Set(v.closedEdges as string[])],
      eventRoom: v.eventRoom,
      movedFrom: v.movedFrom as string | null,
    }
  } catch {
    return INITIAL_STATE
  }
}
