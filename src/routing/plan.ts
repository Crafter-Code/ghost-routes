import { formatTime } from './format'
import { BOOKED_ROOM, ENTRANCE_GATES, RELOCATION_CANDIDATES, START } from './hotel'
import { routeSummary } from './directions'
import { checkCandidates, divergeIndex, drawnGhostLegs, findRoute, firstReachable, ghostTrail, STEP_KINDS, type CandidateCheck } from './route'
import { SCENARIOS, type ScenarioId } from './scenarios'
import type { GhostTrail, Graph, GraphEdge, Leg, Profile, RouteResult } from './types'

export const PROFILES: readonly Profile[] = ['steps-allowed', 'step-free']

export const PROFILE_LABELS: Readonly<Record<Profile, string>> = {
  'steps-allowed': 'Steps allowed',
  'step-free': 'Step-free',
}

export interface ScenarioState {
  scenario: ScenarioId
  profile: Profile
  closedEdges: string[]
  eventRoom: string
  movedFrom: string | null
}

export const INITIAL_STATE: ScenarioState = {
  scenario: 'lift',
  profile: 'step-free',
  closedEdges: [],
  eventRoom: BOOKED_ROOM,
  movedFrom: null,
}

export type StatusTone = 'ok' | 'warning' | 'blocked'

/** Why one entrance cannot be used for the event room. */
export type EntranceReason = 'closed' | 'front steps' | 'no route'

export interface EntranceCheck {
  entrance: string
  gate: string
  /** Route to the event room with the gates of the other entrances closed as well. */
  route: RouteResult
  reason: EntranceReason | null
}

/**
 * What the map draws for the ghost trail. When a detour exists, the part shared with the active
 * route is drawn as the solid route, so the trail starts where the two routes part. It can be empty
 * when they part at the closed door itself; the failure marker then shows where the route broke.
 */
export interface DrawnGhost {
  legs: Leg[]
  /** Node where the drawn trail starts (the point where the routes part). */
  startsAt: string
}

/** The place where the baseline route first meets a closed transition. */
export interface FailureMarker {
  /** Node just before the closed transition. */
  at: string
  edge: GraphEdge
  /** Short caption for the map, e.g. "Door closed". */
  label: string
}

export interface ScenarioPlan {
  state: ScenarioState
  closed: ReadonlySet<string>
  target: string
  /** The one route result shared by the map and the text directions. */
  route: RouteResult
  /** The same route rules applied to every profile, for the comparison. */
  comparison: Readonly<Record<Profile, RouteResult>>
  baseline: RouteResult
  /** Prefix of the baseline route up to the first closed transition (the data rule). */
  ghost: GhostTrail | null
  /** Index of the first leg where the active route leaves the baseline; null if none or no route. */
  divergeAt: number | null
  /** The part of the ghost trail that is drawn dashed. */
  ghostDrawn: DrawnGhost | null
  failure: FailureMarker | null
  /** Active route cost minus baseline cost; 0 when not longer. */
  addedSeconds: number
  /** One entry per entrance, in the order of ENTRANCE_GATES. */
  entranceChecks: EntranceCheck[]
  /** The message of every closed transition, each once, in the order of the preset's controls. */
  closedReasons: string[]
  /** Every candidate checked, in preference order. Empty unless the target is unreachable. */
  candidates: CandidateCheck[]
  proposal: CandidateCheck | null
  /** Target unreachable and every relocation candidate unreachable too. */
  noSuitableRoute: boolean
  /** "No step-free alternative found." for the "no suitable route" state. */
  noAlternativeText: string | null
  /** The other profile's route when this profile is blocked, as a sentence. */
  otherProfileHint: string | null
  status: { tone: StatusTone; text: string }
}

function closedMessage(edge: GraphEdge): string {
  return edge.closedMessage ?? `The ${edge.name ?? edge.id} is closed.`
}

/** Messages of the closed edges, deduplicated, in the order of the scenario's controls. */
function closedReasons(graph: Graph, scenario: ScenarioId, closed: ReadonlySet<string>): string[] {
  const ordered: string[] = []
  for (const control of SCENARIOS[scenario].controls) {
    for (const id of control.edges) if (closed.has(id)) ordered.push(id)
  }
  for (const edge of graph.edges) if (closed.has(edge.id) && !ordered.includes(edge.id)) ordered.push(edge.id)
  const byId = new Map(graph.edges.map((edge) => [edge.id, edge]))
  const messages: string[] = []
  for (const id of ordered) {
    const edge = byId.get(id)
    if (!edge) continue
    const message = closedMessage(edge)
    if (!messages.includes(message)) messages.push(message)
  }
  return messages
}

function entranceChecks(
  graph: Graph,
  target: string,
  profile: Profile,
  closed: ReadonlySet<string>,
): EntranceCheck[] {
  return Object.entries(ENTRANCE_GATES).map(([entrance, gate]) => {
    const others = Object.entries(ENTRANCE_GATES)
      .filter(([id]) => id !== entrance)
      .map(([, otherGate]) => otherGate)
    const route = findRoute(graph, START, target, profile, new Set([...closed, ...others]))
    let reason: EntranceReason | null = null
    if (!route.found) {
      const steppedInto = graph.edges.some(
        (edge) => (edge.from === entrance || edge.to === entrance) && STEP_KINDS.has(edge.kind),
      )
      if (closed.has(gate)) reason = 'closed'
      else if (profile === 'step-free' && steppedInto) reason = 'front steps'
      else reason = 'no route'
    }
    return { entrance, gate, route, reason }
  })
}

export function planScenario(graph: Graph, state: ScenarioState): ScenarioPlan {
  const closed = new Set(state.closedEdges)
  const target = state.eventRoom
  const comparison = Object.fromEntries(
    PROFILES.map((profile) => [profile, findRoute(graph, START, target, profile, closed)]),
  ) as Record<Profile, RouteResult>
  const route = comparison[state.profile]
  const baseline = findRoute(graph, START, target, state.profile, new Set())
  const ghost = ghostTrail(baseline, closed)

  const candidates = route.found ? [] : checkCandidates(graph, START, RELOCATION_CANDIDATES[target] ?? [], state.profile, closed)
  const proposal = firstReachable(candidates)
  const noSuitableRoute = !route.found && proposal === null

  const divergeAt = ghost ? divergeIndex(route, baseline) : null
  let ghostDrawn: DrawnGhost | null = null
  if (ghost) {
    const legs = drawnGhostLegs(ghost, route, baseline)
    ghostDrawn = { legs, startsAt: legs.length > 0 ? legs[0].from : ghost.endsAt }
  }
  const failure: FailureMarker | null = ghost
    ? { at: ghost.endsAt, edge: ghost.blockedBy, label: ghost.blockedBy.closedLabel ?? 'Closed' }
    : null
  const addedSeconds = route.found && baseline.found ? Math.max(0, route.cost - baseline.cost) : 0

  const reasons = closedReasons(graph, state.scenario, closed)
  const reasonText = reasons.join(' ')
  const targetLabel = graph.nodes[target]?.label ?? target
  let status: ScenarioPlan['status']

  if (!route.found) {
    const kind = state.profile === 'step-free' ? 'step-free route' : 'route'
    status = { tone: 'blocked', text: `No ${kind} to ${targetLabel}.${reasonText ? ` ${reasonText}` : ''}` }
  } else if (state.movedFrom) {
    status = {
      tone: 'ok',
      text: `Event moved to ${targetLabel}. ${PROFILE_LABELS[state.profile]} route ready via ${routeSummary(graph, route)}.`,
    }
  } else if (closed.size > 0) {
    const added = addedSeconds > 0 ? ` It adds ${formatTime(addedSeconds)}.` : ''
    status = {
      tone: 'warning',
      text: `${reasonText} Your route to ${targetLabel} is still open via ${routeSummary(graph, route)}.${added}`,
    }
  } else {
    status = { tone: 'ok', text: `${PROFILE_LABELS[state.profile]} route to ${targetLabel} ready via ${routeSummary(graph, route)}.` }
  }

  const other: Profile = state.profile === 'step-free' ? 'steps-allowed' : 'step-free'
  const otherRoute = comparison[other]
  const otherProfileHint =
    !route.found && otherRoute.found
      ? `${PROFILE_LABELS[other]} still reaches ${targetLabel} via ${routeSummary(graph, otherRoute)}.`
      : null

  const noAlternativeText = noSuitableRoute
    ? state.profile === 'step-free'
      ? 'No step-free alternative found.'
      : 'No alternative found.'
    : null

  return {
    state,
    closed,
    target,
    route,
    comparison,
    baseline,
    ghost,
    divergeAt,
    ghostDrawn,
    failure,
    addedSeconds,
    entranceChecks: entranceChecks(graph, target, state.profile, closed),
    closedReasons: reasons,
    candidates,
    proposal,
    noSuitableRoute,
    noAlternativeText,
    otherProfileHint,
    status,
  }
}
