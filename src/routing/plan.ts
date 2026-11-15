import { BOOKED_ROOM, RELOCATION_CANDIDATES, START } from './hotel'
import { routeSummary } from './directions'
import { checkCandidates, findRoute, firstReachable, ghostTrail, type CandidateCheck } from './route'
import type { GhostTrail, Graph, Profile, RouteResult } from './types'

export const PROFILES: readonly Profile[] = ['steps-allowed', 'step-free']

export const PROFILE_LABELS: Readonly<Record<Profile, string>> = {
  'steps-allowed': 'Steps allowed',
  'step-free': 'Step-free',
}

export interface ScenarioState {
  profile: Profile
  closedEdges: string[]
  eventRoom: string
  movedFrom: string | null
}

export const INITIAL_STATE: ScenarioState = {
  profile: 'step-free',
  closedEdges: [],
  eventRoom: BOOKED_ROOM,
  movedFrom: null,
}

export type StatusTone = 'ok' | 'warning' | 'blocked'

export interface ScenarioPlan {
  state: ScenarioState
  closed: ReadonlySet<string>
  target: string
  /** The one route result shared by the map and the text directions. */
  route: RouteResult
  /** The same route rules applied to every profile, for the comparison. */
  comparison: Readonly<Record<Profile, RouteResult>>
  baseline: RouteResult
  ghost: GhostTrail | null
  /** Every candidate checked, in preference order. Empty unless the target is unreachable. */
  candidates: CandidateCheck[]
  proposal: CandidateCheck | null
  status: { tone: StatusTone; text: string }
}

function closedReason(plan: Pick<ScenarioPlan, 'ghost' | 'closed'>, graph: Graph): string {
  const edge = plan.ghost?.blockedBy ?? graph.edges.find((e) => plan.closed.has(e.id))
  if (!edge) return ''
  return edge.closedMessage ?? `The ${edge.name ?? edge.id} is closed.`
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

  const targetLabel = graph.nodes[target]?.label ?? target
  const reason = closedReason({ ghost, closed }, graph)
  let status: ScenarioPlan['status']

  if (!route.found) {
    const kind = state.profile === 'step-free' ? 'step-free route' : 'route'
    status = { tone: 'blocked', text: `No ${kind} to ${targetLabel}.${reason ? ` ${reason}` : ''}` }
  } else if (state.movedFrom) {
    status = {
      tone: 'ok',
      text: `Event moved to ${targetLabel}. ${PROFILE_LABELS[state.profile]} route ready via ${routeSummary(graph, route)}.`,
    }
  } else if (closed.size > 0) {
    status = { tone: 'warning', text: `${reason} Your route to ${targetLabel} is still open via ${routeSummary(graph, route)}.` }
  } else {
    status = { tone: 'ok', text: `${PROFILE_LABELS[state.profile]} route to ${targetLabel} ready via ${routeSummary(graph, route)}.` }
  }

  return { state, closed, target, route, comparison, baseline, ghost, candidates, proposal, status }
}
