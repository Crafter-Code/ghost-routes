import { describe, expect, it } from 'vitest'
import { buildDirections, buildGuestText, routeSummary } from './directions'
import { HOTEL, LIFT_EDGE, START } from './hotel'
import { INITIAL_STATE, planScenario, type ScenarioState } from './plan'
import { findRoute } from './route'
import { parseStoredState, scenarioReducer } from './scenario'

const liftOut: ScenarioState = { ...INITIAL_STATE, closedEdges: [LIFT_EDGE] }

describe('Requirement 1: two routes to Room 204 from one graph', () => {
  it('1.1 steps allowed: Main Entrance front steps and Grand Staircase', () => {
    const route = findRoute(HOTEL, START, 'room-204', 'steps-allowed')
    expect(route.found).toBe(true)
    expect(route.legs.map((l) => l.edge.id)).toContain('front-steps')
    expect(route.legs.map((l) => l.edge.id)).toContain('grand-staircase')
    expect(route.legs.map((l) => l.edge.id)).not.toContain(LIFT_EDGE)
    expect(routeSummary(HOTEL, route)).toBe('Main Entrance (front steps) → Grand Staircase')
    expect(route.cost).toBe(125)
  })

  it('1.2 step-free: Side Entrance ramp and lift', () => {
    const route = findRoute(HOTEL, START, 'room-204', 'step-free')
    expect(route.found).toBe(true)
    expect(route.legs.map((l) => l.edge.id)).toEqual(
      expect.arrayContaining(['side-ramp', LIFT_EDGE]),
    )
    expect(routeSummary(HOTEL, route)).toBe('Side Entrance (ramp) → Lift')
    expect(route.cost).toBe(140)
  })

  it('1.4 the plan compares both profiles and the active route is the same object', () => {
    const plan = planScenario(HOTEL, INITIAL_STATE)
    expect(plan.comparison['steps-allowed'].found).toBe(true)
    expect(plan.comparison['step-free'].found).toBe(true)
    expect(plan.route).toBe(plan.comparison['step-free'])
  })
})

describe('Requirement 2: lift out of service', () => {
  it('2.2 steps allowed keeps the Grand Staircase route', () => {
    const plan = planScenario(HOTEL, { ...liftOut, profile: 'steps-allowed' })
    expect(plan.route.found).toBe(true)
    expect(routeSummary(HOTEL, plan.route)).toBe('Main Entrance (front steps) → Grand Staircase')
    expect(plan.status.tone).toBe('warning')
    expect(plan.status.text).toContain('The lift is out of service.')
    expect(plan.proposal).toBeNull()
  })

  it('2.3 step-free shows the exact blocked message', () => {
    const plan = planScenario(HOTEL, liftOut)
    expect(plan.route.found).toBe(false)
    expect(plan.status).toEqual({
      tone: 'blocked',
      text: 'No step-free route to Room 204. The lift is out of service.',
    })
  })
})

describe('Requirement 3: ghost trail', () => {
  it('3.2 ends at the closed lift door on Floor 1, before the lift leg', () => {
    const plan = planScenario(HOTEL, liftOut)
    expect(plan.ghost).not.toBeNull()
    expect(plan.ghost!.endsAt).toBe('lift-1')
    expect(plan.ghost!.blockedBy.id).toBe(LIFT_EDGE)
    expect(plan.ghost!.legs.map((l) => l.edge.id)).not.toContain(LIFT_EDGE)
    expect(plan.ghost!.legs.at(-1)!.to).toBe('lift-1')
  })

  it('3.5 no ghost when the baseline uses no closed edge', () => {
    expect(planScenario(HOTEL, INITIAL_STATE).ghost).toBeNull()
    expect(planScenario(HOTEL, { ...liftOut, profile: 'steps-allowed' }).ghost).toBeNull()
  })
})

describe('Requirement 4: verified relocation proposal', () => {
  it('4.2 checks Room 203 first, rejects it, and proposes Room 104', () => {
    const plan = planScenario(HOTEL, liftOut)
    expect(plan.candidates.map((c) => [c.room, c.route.found])).toEqual([
      ['room-203', false],
      ['room-104', true],
    ])
    expect(plan.proposal?.room).toBe('room-104')
  })

  it('4.2 no proposal while the event room is reachable', () => {
    expect(planScenario(HOTEL, INITIAL_STATE).proposal).toBeNull()
  })
})

describe('Requirement 5: confirm the move to Room 104', () => {
  it('5.1 confirming the proposal moves the event and yields a step-free route', () => {
    const moved = scenarioReducer(liftOut, { type: 'confirm-move', room: 'room-104' })
    expect(moved.eventRoom).toBe('room-104')
    expect(moved.movedFrom).toBe('room-204')
    const plan = planScenario(HOTEL, moved)
    expect(plan.route.found).toBe(true)
    expect(plan.route.legs.map((l) => l.edge.kind)).not.toContain('stairs')
    expect(plan.ghost).toBeNull()
    expect(plan.status.text).toMatch(/^Event moved to Room 104\./)
  })

  it('5.1 a move to a room that is not the verified proposal is ignored', () => {
    expect(scenarioReducer(liftOut, { type: 'confirm-move', room: 'room-203' })).toBe(liftOut)
    expect(scenarioReducer(INITIAL_STATE, { type: 'confirm-move', room: 'room-104' })).toBe(INITIAL_STATE)
  })

  it('5.4 guest text has the entrance, floor and numbered steps', () => {
    const plan = planScenario(HOTEL, scenarioReducer(liftOut, { type: 'confirm-move', room: 'room-104' }))
    const text = buildGuestText(HOTEL, plan.route, 'Step-free')
    expect(text).toContain('Event: Room 104 (Garden Hall)')
    expect(text).toContain('Entrance: Side Entrance (ramp, step-free)')
    expect(text).toContain('Floor: 1')
    expect(text).toContain('1. Start at the hotel forecourt.')
    expect(text).toContain('Take the side ramp to the Side Entrance. No steps.')
  })
})

describe('Requirement 6: one route result for map and text', () => {
  it('6.2 directions cover every leg exactly once, in order', () => {
    for (const profile of ['steps-allowed', 'step-free'] as const) {
      const route = findRoute(HOTEL, START, 'room-204', profile)
      const covered = buildDirections(HOTEL, route).flatMap((s) => s.legs)
      expect(covered).toEqual(route.legs.map((_, i) => i))
    }
  })
})

describe('Requirement 7: reset and session state', () => {
  it('7.3 reset restores the initial state', () => {
    const moved = scenarioReducer(liftOut, { type: 'confirm-move', room: 'room-104' })
    expect(scenarioReducer(moved, { type: 'reset' })).toEqual(INITIAL_STATE)
  })

  it('7.4 invalid stored state falls back to the initial state', () => {
    expect(parseStoredState(null)).toEqual(INITIAL_STATE)
    expect(parseStoredState('not json')).toEqual(INITIAL_STATE)
    expect(parseStoredState(JSON.stringify({ profile: 'flying' }))).toEqual(INITIAL_STATE)
    expect(parseStoredState(JSON.stringify({ ...INITIAL_STATE, closedEdges: ['teleporter'] }))).toEqual(INITIAL_STATE)
    expect(parseStoredState(JSON.stringify({ ...INITIAL_STATE, eventRoom: 'lobby' }))).toEqual(INITIAL_STATE)
  })

  it('7.2 a valid stored state round-trips', () => {
    const moved = scenarioReducer(liftOut, { type: 'confirm-move', room: 'room-104' })
    expect(parseStoredState(JSON.stringify(moved))).toEqual(moved)
  })
})
