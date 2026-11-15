import { describe, expect, it } from 'vitest'
import { buildDirections, buildGuestText, routeSummary } from './directions'
import { formatTime } from './format'
import { ENTRANCE_GATES, HOTEL, LIFT_EDGE, LIFT_EDGES, RELOCATION_CANDIDATES, START } from './hotel'
import { INITIAL_STATE, planScenario, PROFILE_LABELS, PROFILES, type ScenarioPlan, type ScenarioState } from './plan'
import { findRoute, STEP_KINDS } from './route'
import { parseStoredState, scenarioReducer, type ScenarioAction } from './scenario'
import { initialStateFor, SCENARIO_IDS, SCENARIOS, type ScenarioId } from './scenarios'
import type { Profile } from './types'

/**
 * Tests for the Haunted Hotel Expansion (.kiro/specs/haunted-hotel-expansion/).
 * Names start with H<requirement>.<criterion>. src/routing/hotel.test.ts is not edited.
 */

function apply(state: ScenarioState, ...actions: ScenarioAction[]): ScenarioState {
  return actions.reduce((s, a) => scenarioReducer(s, a), state)
}

function scene(scenario: ScenarioId, controls: string[] = [], profile: Profile = 'step-free'): ScenarioPlan {
  let state = initialStateFor(scenario)
  for (const id of controls) state = scenarioReducer(state, { type: 'toggle-closure', id })
  return planScenario(HOTEL, { ...state, profile })
}

const edgeIds = (plan: ScenarioPlan) => plan.route.legs.map((l) => l.edge.id)

describe('Requirement 1: one graph for three floors', () => {
  it('H1.1 the graph spans Floors 1 to 3', () => {
    const floors = new Set(Object.values(HOTEL.nodes).map((n) => n.floor))
    expect([...floors].sort()).toEqual([1, 2, 3])
  })

  it('H1.3 the Garden Entrance has its own vestibule with an exit to the corridor and a separate door to Room 104', () => {
    expect(HOTEL.nodes['garden-vestibule'].kind).toBe('corridor')
    const touching = (id: string) => HOTEL.edges.filter((e) => e.from === id || e.to === id)
    const ends = touching('garden-vestibule').map((e) => (e.from === 'garden-vestibule' ? e.to : e.from)).sort()
    expect(ends).toEqual(['corridor-1-east', 'garden-entrance', 'room-104'])
    expect(HOTEL.edges.find((e) => e.id === 'vestibule-104')).toMatchObject({ from: 'garden-vestibule', to: 'room-104' })
    expect(HOTEL.edges.find((e) => e.id === 'vestibule-corridor')).toMatchObject({ from: 'garden-vestibule', to: 'corridor-1-east' })
    expect(ENTRANCE_GATES['garden-entrance']).toBe('garden-door')
  })

  it('H1.4 the Portrait Gallery has two doors onto two different corridors', () => {
    const doors = HOTEL.edges.filter((e) => e.from === 'room-206' || e.to === 'room-206')
    const sides = doors.map((e) => (e.from === 'room-206' ? e.to : e.from)).sort()
    expect(sides).toEqual(['corridor-2-mid', 'south-walk-mid'])
    expect(HOTEL.nodes['south-walk-mid'].phrase).toBe('the Gallery Walk')
  })

  it('H1.5 Floor 3 holds the Library and the Moonlight Hall, reached only by lift or stairs', () => {
    expect(HOTEL.nodes['room-301'].phrase).toBe('Room 301 (Library)')
    expect(HOTEL.nodes['room-302'].phrase).toBe('Room 302 (Moonlight Hall)')
    const upper = new Set(Object.values(HOTEL.nodes).filter((n) => n.floor === 3).map((n) => n.id))
    const crossing = HOTEL.edges.filter((e) => upper.has(e.from) !== upper.has(e.to))
    expect(crossing.map((e) => e.id).sort()).toEqual(['grand-staircase-upper', 'lift-upper'])
  })

  it('H1.6 with nothing closed every room has a route for both profiles', () => {
    for (const node of Object.values(HOTEL.nodes).filter((n) => n.kind === 'room')) {
      for (const profile of PROFILES) {
        expect(findRoute(HOTEL, START, node.id, profile).found, `${node.id} ${profile}`).toBe(true)
      }
    }
  })

  it('H1.7 Step-free routes to every room use no steps or stairs', () => {
    for (const node of Object.values(HOTEL.nodes).filter((n) => n.kind === 'room')) {
      const route = findRoute(HOTEL, START, node.id, 'step-free')
      expect(route.legs.some((l) => STEP_KINDS.has(l.edge.kind)), node.id).toBe(false)
    }
  })

  it('H1.8 the original routes keep their cost and path', () => {
    expect(findRoute(HOTEL, START, 'room-204', 'steps-allowed').cost).toBe(125)
    expect(findRoute(HOTEL, START, 'room-204', 'step-free').cost).toBe(140)
    const withLiftOut = findRoute(HOTEL, START, 'room-104', 'step-free', new Set(LIFT_EDGES))
    expect(withLiftOut.cost).toBe(60)
    expect(withLiftOut.nodes).toEqual(['forecourt', 'ramp-base', 'side-entrance', 'lift-lobby-1', 'room-104'])
  })

  it('H1.8b the Garden Entrance is no shortcut to Room 104: it is 67 s against 60 s by the side ramp', () => {
    const viaGarden = findRoute(HOTEL, START, 'room-104', 'step-free', new Set(['side-door']))
    expect(viaGarden.nodes).toEqual(['forecourt', 'garden-entrance', 'garden-vestibule', 'room-104'])
    expect(viaGarden.cost).toBe(67)
    expect(viaGarden.cost).toBeGreaterThan(60)
  })

  it('H1.3b no route cuts through an event room, except the Portrait Gallery when both its doors are open', () => {
    const rooms = Object.values(HOTEL.nodes).filter((n) => n.kind === 'room').map((n) => n.id)
    const closures: string[][] = [[], ...HOTEL.edges.map((e) => [e.id])]
    for (const id of SCENARIO_IDS) {
      const controls = SCENARIOS[id].controls
      for (let mask = 0; mask < 2 ** controls.length; mask++) {
        closures.push(controls.filter((_, i) => mask & (1 << i)).flatMap((c) => c.edges))
      }
    }
    for (const to of rooms) {
      for (const profile of PROFILES) {
        for (const closed of closures) {
          const route = findRoute(HOTEL, START, to, profile, new Set(closed))
          const through = route.nodes.slice(1, -1).filter((n) => HOTEL.nodes[n].kind === 'room')
          expect(through.filter((n) => n !== 'room-206'), `${to} ${profile} [${closed}]`).toEqual([])
        }
      }
    }
  })

  it('H1.9 with both gallery doors open the route to Room 205 may pass through the gallery', () => {
    const open = findRoute(HOTEL, START, 'room-205', 'step-free')
    expect(open.nodes).toContain('room-206')
    expect(open.cost).toBe(204)
    const centralClosed = findRoute(HOTEL, START, 'room-205', 'step-free', new Set(['door-206-north']))
    expect(centralClosed.nodes).not.toContain('room-206')
    expect(centralClosed.cost).toBe(255)
  })
})

describe('Requirement 2: the original scenario still works on the new graph', () => {
  const liftOut = scene('lift', ['lift'])

  it('H2.1 the default state is the lift scenario for Room 204, Step-free, nothing closed', () => {
    expect(INITIAL_STATE).toEqual({ scenario: 'lift', profile: 'step-free', closedEdges: [], eventRoom: 'room-204', movedFrom: null })
    expect(parseStoredState(null)).toEqual(INITIAL_STATE)
  })

  it('H2.2 route summaries and costs for Room 204', () => {
    const plan = planScenario(HOTEL, INITIAL_STATE)
    expect(routeSummary(HOTEL, plan.comparison['steps-allowed'])).toBe('Main Entrance (front steps) → Grand Staircase')
    expect(routeSummary(HOTEL, plan.comparison['step-free'])).toBe('Side Entrance (ramp) → Lift')
    expect(formatTime(plan.comparison['steps-allowed'].cost)).toBe('2 min 05 s')
    expect(formatTime(plan.comparison['step-free'].cost)).toBe('2 min 20 s')
  })

  it('H2.3 the blocked message is exact', () => {
    expect(liftOut.route.found).toBe(false)
    expect(liftOut.status).toEqual({ tone: 'blocked', text: 'No step-free route to Room 204. The lift is out of service.' })
    expect(liftOut.closedReasons).toEqual(['The lift is out of service.'])
  })

  it('H2.4 the ghost trail ends at the lift door on Floor 1, Room 203 is rejected and Room 104 proposed', () => {
    expect(liftOut.ghost?.endsAt).toBe('lift-1')
    expect(liftOut.ghost?.legs.map((l) => l.edge.id)).toEqual(['forecourt-path', 'side-ramp', 'side-door', 'lift-door-1'])
    expect(liftOut.candidates.map((c) => [c.room, c.route.found])).toEqual([['room-203', false], ['room-104', true]])
    expect(liftOut.proposal?.room).toBe('room-104')
    expect(liftOut.noSuitableRoute).toBe(false)
  })

  it('H2.4b the ghost trail of the lift outage is drawn from the start, with a failure marker at the lift', () => {
    expect(liftOut.ghostDrawn?.startsAt).toBe('forecourt')
    expect(liftOut.ghostDrawn?.legs).toEqual(liftOut.ghost?.legs)
    expect(liftOut.failure).toMatchObject({ at: 'lift-1', label: 'Lift out of service' })
  })

  it('H2.5 after the move the status and the route are the first release\'s', () => {
    const moved = apply(scene('lift', ['lift']).state, { type: 'confirm-move', room: 'room-104' })
    const plan = planScenario(HOTEL, moved)
    expect(plan.status.text).toBe('Event moved to Room 104. Step-free route ready via Side Entrance (ramp).')
    expect(plan.route.cost).toBe(60)
    expect(buildGuestText(HOTEL, plan.route, PROFILE_LABELS['step-free'])).toContain('Entrance: Side Entrance (ramp, step-free)')
  })

  it('H2.5b Steps allowed keeps the Grand Staircase route with the lift out', () => {
    const plan = scene('lift', ['lift'], 'steps-allowed')
    expect(routeSummary(HOTEL, plan.route)).toBe('Main Entrance (front steps) → Grand Staircase')
    expect(plan.status.text).toBe(
      'The lift is out of service. Your route to Room 204 is still open via Main Entrance (front steps) → Grand Staircase.',
    )
    expect(plan.ghost).toBeNull()
  })
})

describe('Requirement 3: scenario presets and organizer actions', () => {
  it('H3.1 there are three presets and the default is the lift scenario', () => {
    expect(SCENARIO_IDS).toEqual(['lift', 'gallery', 'entrance'])
    expect(INITIAL_STATE.scenario).toBe('lift')
  })

  it('H3.2 picking a preset sets its room and clears closures, profile and move', () => {
    const dirty = apply(scene('lift', ['lift']).state, { type: 'confirm-move', room: 'room-104' }, { type: 'set-profile', profile: 'steps-allowed' })
    const next = scenarioReducer(dirty, { type: 'set-scenario', scenario: 'gallery' })
    expect(next).toEqual({ scenario: 'gallery', profile: 'step-free', closedEdges: [], eventRoom: 'room-206', movedFrom: null })
    expect(scenarioReducer(dirty, { type: 'set-scenario', scenario: 'entrance' }).eventRoom).toBe('room-204')
  })

  it('H3.3 the lift control closes both lift segments together', () => {
    const closed = apply(INITIAL_STATE, { type: 'toggle-closure', id: 'lift' })
    expect([...closed.closedEdges].sort()).toEqual([...LIFT_EDGES].sort())
    expect(apply(closed, { type: 'toggle-closure', id: 'lift' }).closedEdges).toEqual([])
  })

  it('H3.4 and H3.5 the presets offer the specified controls', () => {
    expect(SCENARIOS.gallery.controls.map((c) => c.label)).toEqual(['Close central door', 'Close Gallery Walk door', 'Lift out of service'])
    expect(SCENARIOS.entrance.controls.map((c) => c.label)).toEqual(['Close Side Entrance', 'Close Garden Entrance'])
    expect(SCENARIOS.lift.controls.map((c) => c.label)).toEqual(['Lift out of service'])
    expect(SCENARIOS.gallery.bookedRoom).toBe('room-206')
    expect(SCENARIOS.entrance.bookedRoom).toBe('room-204')
  })

  it('H3.6 a control that is half closed closes the rest, and an unknown control changes nothing', () => {
    const half: ScenarioState = { ...INITIAL_STATE, closedEdges: [LIFT_EDGE] }
    expect([...apply(half, { type: 'toggle-closure', id: 'lift' }).closedEdges].sort()).toEqual([...LIFT_EDGES].sort())
    expect(apply(INITIAL_STATE, { type: 'toggle-closure', id: 'teleporter' })).toBe(INITIAL_STATE)
  })

  it('H3.6b toggle-lift from the first release only acts where the scenario has a lift control', () => {
    expect(apply(INITIAL_STATE, { type: 'toggle-lift' }).closedEdges.sort()).toEqual([...LIFT_EDGES].sort())
    const entrance = initialStateFor('entrance')
    expect(apply(entrance, { type: 'toggle-lift' })).toBe(entrance)
  })

  it('H3.7 a state saved by the first release loads as the lift scenario', () => {
    const saved = JSON.stringify({ profile: 'step-free', closedEdges: ['lift'], eventRoom: 'room-104', movedFrom: 'room-204' })
    expect(parseStoredState(saved)).toEqual({ scenario: 'lift', profile: 'step-free', closedEdges: ['lift'], eventRoom: 'room-104', movedFrom: 'room-204' })
  })

  it('H3.7b a state with a foreign scenario, edge or room falls back to the initial state', () => {
    const lift = initialStateFor('lift')
    expect(parseStoredState(JSON.stringify({ ...lift, scenario: 'party' }))).toEqual(INITIAL_STATE)
    expect(parseStoredState(JSON.stringify({ ...lift, closedEdges: ['door-206-north'] }))).toEqual(INITIAL_STATE)
    expect(parseStoredState(JSON.stringify({ ...lift, eventRoom: 'room-302' }))).toEqual(INITIAL_STATE)
    expect(parseStoredState(JSON.stringify({ ...lift, movedFrom: 'room-204' }))).toEqual(INITIAL_STATE)
  })

  it('H3.7c a valid state of every preset round-trips', () => {
    for (const id of SCENARIO_IDS) {
      const state = apply(initialStateFor(id), ...SCENARIOS[id].controls.map((c) => ({ type: 'toggle-closure', id: c.id }) as const))
      expect(parseStoredState(JSON.stringify(state))).toEqual(state)
    }
  })

  it('H3.8 reset restores the default scenario with nothing closed', () => {
    const moved = apply(initialStateFor('gallery'), { type: 'toggle-closure', id: 'central-door' }, { type: 'toggle-closure', id: 'walk-door' }, { type: 'confirm-move', room: 'room-302' })
    expect(scenarioReducer(moved, { type: 'reset' })).toEqual(INITIAL_STATE)
  })
})

describe('Requirement 4: a closed door with a detour to the same room', () => {
  const central = scene('gallery', ['central-door'])

  it('H4.1 closing the central door recomputes the route to Room 206', () => {
    expect(scene('gallery').route.cost).toBe(165)
    expect(central.route.found).toBe(true)
    expect(central.route.to).toBe('room-206')
  })

  it('H4.2 the detour leaves the central corridor, passes the Gallery Walk and uses the other door', () => {
    expect(edgeIds(central)).not.toContain('door-206-north')
    expect(edgeIds(central)).toEqual(expect.arrayContaining(['c2-west-mid', 'c2-west-end', 'west-passage', 'south-walk-1', 'door-206-south']))
    expect(central.route.nodes.slice(-6)).toEqual(['corridor-2-mid', 'corridor-2-west', 'west-end-2', 'south-walk-west', 'south-walk-mid', 'room-206'])
    expect(central.route.cost).toBe(236)
    const steps = scene('gallery', ['central-door'], 'steps-allowed')
    expect(steps.route.cost).toBe(171)
    expect(edgeIds(steps)).toContain('door-206-south')
  })

  it('H4.3 the ghost trail is the baseline up to the central corridor and ends before the closed door', () => {
    expect(central.ghost?.endsAt).toBe('corridor-2-mid')
    expect(central.ghost?.blockedBy.id).toBe('door-206-north')
    expect(central.ghost?.legs).toHaveLength(8)
    expect(central.ghost?.legs.map((l) => l.edge.id)).not.toContain('door-206-north')
  })

  it('H4.4 the status names the detour and the added time', () => {
    expect(central.addedSeconds).toBe(71)
    expect(central.status).toEqual({
      tone: 'warning',
      text:
        'The central door to the Portrait Gallery is closed. Your route to Room 206 is still open via Side Entrance (ramp) → Lift → Gallery Walk. It adds 1 min 11 s.',
    })
  })

  it('H4.5 no added-time sentence when the cost is unchanged', () => {
    const walkOnly = scene('gallery', ['walk-door'])
    expect(walkOnly.addedSeconds).toBe(0)
    expect(walkOnly.status.text).toBe(
      'The Gallery Walk door is closed. Your route to Room 206 is still open via Side Entrance (ramp) → Lift.',
    )
    expect(walkOnly.ghost).toBeNull()
  })

  it('H4.6 the text directions list the detour legs and not the closed door', () => {
    const steps = buildDirections(HOTEL, central.route)
    expect(steps.flatMap((s) => s.legs)).toEqual(central.route.legs.map((_, i) => i))
    const text = steps.map((s) => s.text).join('\n')
    expect(text).toContain('Walk to the lift door on Floor 1.')
    expect(text).toContain('Walk to Room 206 (Portrait Gallery).')
    expect(central.closed.has('door-206-north')).toBe(true)
    expect(central.route.legs.every((l) => l.edge.id !== 'door-206-north')).toBe(true)
  })

  it('H4.7 reopening the door returns the direct route and removes the ghost trail', () => {
    const reopened = apply(central.state, { type: 'toggle-closure', id: 'central-door' })
    const plan = planScenario(HOTEL, reopened)
    expect(plan.route.cost).toBe(165)
    expect(plan.ghost).toBeNull()
    expect(plan.ghostDrawn).toBeNull()
    expect(plan.failure).toBeNull()
  })
})

describe('Requirement 5: lift failure and the move from Room 204 to Room 104', () => {
  it('H5.1 the lift control shows locks through both segments', () => {
    const plan = scene('lift', ['lift'])
    expect(plan.closed.has('lift') && plan.closed.has('lift-upper')).toBe(true)
  })

  it('H5.1b closing only the lower lift segment behaves as in the first release', () => {
    const plan = planScenario(HOTEL, { ...INITIAL_STATE, closedEdges: [LIFT_EDGE] })
    expect(plan.status.text).toBe('No step-free route to Room 204. The lift is out of service.')
    expect(plan.proposal?.room).toBe('room-104')
  })

  it('H5.2 Steps allowed still reaches Room 204 and Floor 3 by the Grand Staircase', () => {
    const closed = new Set(LIFT_EDGES)
    for (const room of ['room-204', 'room-301', 'room-302']) {
      const route = findRoute(HOTEL, START, room, 'steps-allowed', closed)
      expect(route.found, room).toBe(true)
      expect(route.legs.map((l) => l.edge.id)).toContain('front-steps')
    }
    expect(findRoute(HOTEL, START, 'room-302', 'steps-allowed', closed).legs.map((l) => l.edge.id)).toContain('grand-staircase-upper')
  })

  it('H5.3 Step-free reaches nothing above Floor 1 with the lift out', () => {
    const closed = new Set(LIFT_EDGES)
    for (const node of Object.values(HOTEL.nodes).filter((n) => n.kind === 'room')) {
      expect(findRoute(HOTEL, START, node.id, 'step-free', closed).found, node.id).toBe(node.floor === 1)
    }
  })

  it('H5.4 and H5.5 the candidates are fixed and checked in order', () => {
    expect(RELOCATION_CANDIDATES['room-204']).toEqual(['room-203', 'room-104'])
    expect(RELOCATION_CANDIDATES['room-206']).toEqual(['room-302', 'room-301'])
    expect(scene('lift', ['lift']).candidates.map((c) => c.room)).toEqual(['room-203', 'room-104'])
    expect(scene('gallery', ['central-door', 'walk-door']).candidates.map((c) => c.room)).toEqual(['room-302', 'room-301'])
  })

  it('H5.6 the proposal is the first candidate with a route in the selected profile', () => {
    const plan = scene('gallery', ['central-door', 'walk-door', 'lift'], 'steps-allowed')
    expect(plan.route.found).toBe(false)
    expect(plan.proposal?.room).toBe('room-302')
    expect(plan.proposal?.route.found).toBe(true)
  })

  it('H5.7 only the verified proposal can be confirmed', () => {
    const state = scene('gallery', ['central-door', 'walk-door']).state
    expect(scenarioReducer(state, { type: 'confirm-move', room: 'room-301' })).toBe(state)
    expect(scenarioReducer(state, { type: 'confirm-move', room: 'room-205' })).toBe(state)
    expect(scenarioReducer(state, { type: 'confirm-move', room: 'room-302' }).eventRoom).toBe('room-302')
  })

  it('H5.8 the Moonlight Hall appears among the proposals in a valid state, and the move reaches Floor 3', () => {
    const blocked = scene('gallery', ['central-door', 'walk-door'])
    expect(blocked.route.found).toBe(false)
    expect(blocked.candidates.find((c) => c.room === 'room-302')?.route.cost).toBe(220)
    expect(blocked.proposal?.room).toBe('room-302')
    expect(blocked.noSuitableRoute).toBe(false)

    const moved = planScenario(HOTEL, scenarioReducer(blocked.state, { type: 'confirm-move', room: 'room-302' }))
    expect(moved.route.found).toBe(true)
    expect(moved.status.text).toBe('Event moved to Room 302. Step-free route ready via Side Entrance (ramp) → Lift.')
    const steps = buildDirections(HOTEL, moved.route)
    expect(steps.map((s) => s.text)).toContain('Take the lift up to Floor 3.')
    expect(steps[steps.length - 1]).toMatchObject({ text: 'Walk to Room 302 (Moonlight Hall).', floor: 3 })
  })
})

describe('Requirement 6: the Side Entrance closes and an alternative entrance is verified', () => {
  const side = scene('entrance', ['side-entrance'])

  it('H6.1 closing the Side Entrance closes its gate', () => {
    expect(side.state.closedEdges).toEqual(['side-door'])
    expect(ENTRANCE_GATES['side-entrance']).toBe('side-door')
  })

  it('H6.2 the ghost trail follows the ramp and ends at the Side Entrance', () => {
    expect(side.ghost?.endsAt).toBe('side-entrance')
    expect(side.ghost?.legs.map((l) => l.edge.id)).toEqual(['forecourt-path', 'side-ramp'])
  })

  it('H6.3 the entrance check lists the three entrances', () => {
    expect(side.entranceChecks.map((c) => c.entrance)).toEqual(['main-entrance', 'side-entrance', 'garden-entrance'])
  })

  it('H6.4 each check is one route with the other gates closed', () => {
    for (const check of side.entranceChecks.filter((c) => c.route.found)) {
      expect(check.route.nodes).toContain(check.entrance)
      for (const [entrance, gate] of Object.entries(ENTRANCE_GATES)) {
        if (entrance !== check.entrance) expect(check.route.legs.map((l) => l.edge.id)).not.toContain(gate)
      }
    }
  })

  it('H6.5 reasons are closed and front steps', () => {
    const byEntrance = Object.fromEntries(side.entranceChecks.map((c) => [c.entrance, c]))
    expect(byEntrance['main-entrance'].reason).toBe('front steps')
    expect(byEntrance['side-entrance'].reason).toBe('closed')
    expect(byEntrance['garden-entrance'].reason).toBeNull()
    expect(byEntrance['garden-entrance'].route.cost).toBe(165)
  })

  it('H6.6 the Step-free route goes through the Garden Entrance and adds 25 s', () => {
    expect(side.route.nodes).toEqual([
      'forecourt', 'garden-entrance', 'garden-vestibule', 'corridor-1-east', 'lift-lobby-1', 'lift-1', 'lift-2', 'lift-lobby-2', 'room-204',
    ])
    expect(routeSummary(HOTEL, side.route)).toBe('Garden Entrance (level) → Lift')
    expect(side.addedSeconds).toBe(25)
    expect(side.status.text).toBe(
      'The Side Entrance is closed. Your route to Room 204 is still open via Garden Entrance (level) → Lift. It adds 25 s.',
    )
  })

  it('H6.6b the Steps allowed route is unchanged', () => {
    const plan = scene('entrance', ['side-entrance'], 'steps-allowed')
    expect(plan.route.cost).toBe(125)
    expect(plan.addedSeconds).toBe(0)
  })

  it('H6.7 the directions and the guest text name the Garden Entrance', () => {
    const steps = buildDirections(HOTEL, side.route).map((s) => s.text)
    expect(steps[0]).toBe('Start at the hotel forecourt.')
    expect(steps[1]).toBe('Walk to the Garden Entrance. Level entrance, no steps.')
    expect(steps[2]).toBe('Walk through the garden vestibule to the lift door on Floor 1.')
    expect(steps).toContain('Take the lift up to Floor 2.')
    const text = buildGuestText(HOTEL, side.route, 'Step-free')
    expect(text).toContain('Entrance: Garden Entrance (level, step-free)')
  })

  it('H6.8 the Room 104 move route also works through the Garden Entrance', () => {
    const route = findRoute(HOTEL, START, 'room-104', 'step-free', new Set(['side-door']))
    expect(routeSummary(HOTEL, route)).toBe('Garden Entrance (level)')
  })
})

describe('Requirement 7: no suitable route', () => {
  const noEntrance = scene('entrance', ['side-entrance', 'garden-entrance'])
  const noGallery = scene('gallery', ['central-door', 'walk-door', 'lift'])

  it('H7.1 the room and every candidate are unreachable', () => {
    for (const plan of [noEntrance, noGallery]) {
      expect(plan.route.found).toBe(false)
      expect(plan.candidates.length).toBeGreaterThan(0)
      expect(plan.candidates.every((c) => !c.route.found)).toBe(true)
      expect(plan.proposal).toBeNull()
      expect(plan.noSuitableRoute).toBe(true)
    }
    expect(noEntrance.candidates.map((c) => c.room)).toEqual(['room-203', 'room-104'])
    expect(noGallery.candidates.map((c) => c.room)).toEqual(['room-302', 'room-301'])
  })

  it('H7.2 the texts for both profiles', () => {
    expect(noEntrance.noAlternativeText).toBe('No step-free alternative found.')
    expect(scene('gallery', ['central-door', 'walk-door'], 'steps-allowed').noAlternativeText).toBeNull()
    const stepsAllowed = planScenario(HOTEL, { ...scene('gallery', ['central-door', 'walk-door']).state, closedEdges: ['door-206-north', 'door-206-south'], profile: 'steps-allowed' })
    expect(stepsAllowed.route.found).toBe(false)
    expect(stepsAllowed.proposal?.room).toBe('room-302')
  })

  it('H7.3 there is no active route and no proposal to confirm', () => {
    expect(noEntrance.route.found).toBe(false)
    expect(scenarioReducer(noEntrance.state, { type: 'confirm-move', room: 'room-104' })).toBe(noEntrance.state)
    expect(buildDirections(HOTEL, noEntrance.route)).toEqual([])
    expect(buildGuestText(HOTEL, noEntrance.route, 'Step-free')).toBe('')
  })

  it('H7.4 the ghost trail and the closed transitions remain', () => {
    expect(noEntrance.ghost?.endsAt).toBe('side-entrance')
    expect(noEntrance.ghostDrawn?.legs.map((l) => l.edge.id)).toEqual(['forecourt-path', 'side-ramp'])
    expect(noEntrance.failure).toMatchObject({ at: 'side-entrance', label: 'Side Entrance closed' })
    expect(noEntrance.closed.has('garden-door')).toBe(true)
    // For the gallery, the lift is the first closed leg of the Step-free baseline.
    expect(noGallery.ghost?.endsAt).toBe('lift-1')
  })

  it('H7.5 the status gives each reason once, in the order of the controls', () => {
    expect(noEntrance.status.text).toBe('No step-free route to Room 204. The Side Entrance is closed. The Garden Entrance is closed.')
    expect(noGallery.status.text).toBe(
      'No step-free route to Room 206. The central door to the Portrait Gallery is closed. The Gallery Walk door is closed. The lift is out of service.',
    )
  })

  it('H7.6 the hint says when the other profile still reaches the room', () => {
    expect(noEntrance.otherProfileHint).toBe(
      'Steps allowed still reaches Room 204 via Main Entrance (front steps) → Grand Staircase.',
    )
    // Both gallery doors are closed, so Steps allowed cannot reach Room 206 either: no hint.
    expect(noGallery.otherProfileHint).toBeNull()
    // With one door and the lift closed the gallery is still reachable on foot (Steps allowed).
    expect(scene('gallery', ['central-door', 'lift'], 'steps-allowed').route.found).toBe(true)
    expect(scene('gallery', ['central-door', 'walk-door', 'lift'], 'steps-allowed').otherProfileHint).toBeNull()
  })

  it('H7.8 toggling one control off leaves the state', () => {
    const reopened = planScenario(HOTEL, apply(noEntrance.state, { type: 'toggle-closure', id: 'garden-entrance' }))
    expect(reopened.noSuitableRoute).toBe(false)
    expect(reopened.route.found).toBe(true)
  })

  it('H7.9 an unreachable room with a reachable candidate is a proposal, not "no suitable route"', () => {
    const lift = scene('lift', ['lift'])
    const gallery = scene('gallery', ['central-door', 'walk-door'])
    for (const plan of [lift, gallery]) {
      expect(plan.route.found).toBe(false)
      expect(plan.proposal).not.toBeNull()
      expect(plan.noSuitableRoute).toBe(false)
      expect(plan.noAlternativeText).toBeNull()
    }
  })
})

describe('Requirement 8: one route result, floor-aware steps', () => {
  it('H8.4 one step for a lift ride over two floors', () => {
    const plan = planScenario(HOTEL, { ...initialStateFor('gallery'), eventRoom: 'room-302', movedFrom: null })
    expect(plan.route.found).toBe(true)
    const lift = buildDirections(HOTEL, plan.route).find((s) => s.text.startsWith('Take the lift'))
    expect(lift).toMatchObject({ text: 'Take the lift up to Floor 3.', legs: [4, 5], floor: 3 })
    expect(routeSummary(HOTEL, plan.route)).toBe('Side Entrance (ramp) → Lift')
  })

  it('H8.4b one step for the Grand Staircase over two floors', () => {
    const route = findRoute(HOTEL, START, 'room-302', 'steps-allowed')
    expect(buildDirections(HOTEL, route).map((s) => s.text)).toContain('Take the Grand Staircase up to Floor 3.')
    expect(routeSummary(HOTEL, route)).toBe('Main Entrance (front steps) → Grand Staircase')
  })

  it('H8.5 a step ends at the Garden Entrance', () => {
    const route = findRoute(HOTEL, START, 'room-204', 'step-free', new Set(['side-door']))
    const step = buildDirections(HOTEL, route)[1]
    expect(step.text).toBe('Walk to the Garden Entrance. Level entrance, no steps.')
    expect(step.legs).toEqual([0])
  })

  it('H8.6 each step has the floor where its last leg ends', () => {
    const route = findRoute(HOTEL, START, 'room-206', 'step-free')
    const steps = buildDirections(HOTEL, route)
    expect(steps[0].floor).toBe(1)
    for (const step of steps.slice(1)) {
      expect(step.floor).toBe(HOTEL.nodes[route.legs[step.legs[step.legs.length - 1]].to].floor)
    }
    expect(steps[steps.length - 1].floor).toBe(2)
  })

  it('H8.2 components and the map do not route', () => {
    const sources = {
      ...import.meta.glob('../map/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
      ...import.meta.glob('../components/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
    } as Record<string, string>
    expect(Object.keys(sources).length).toBeGreaterThan(3)
    for (const [file, text] of Object.entries(sources)) expect(text, file).not.toMatch(/\bfindRoute\b/)
  })
})

describe('Requirement 13: the ghost trail beside a detour', () => {
  it('H13.1 with a detour, the trail starts where the routes part and ends at the first closed transition', () => {
    const plan = scene('entrance', ['side-entrance'])
    expect(plan.divergeAt).toBe(0)
    expect(plan.ghostDrawn?.startsAt).toBe('forecourt')
    expect(plan.ghostDrawn?.legs.map((l) => l.edge.id)).toEqual(['forecourt-path', 'side-ramp'])
    expect(plan.ghost?.endsAt).toBe('side-entrance')
  })

  it('H13.2 the part shared with the active route is not drawn dashed', () => {
    const plan = scene('gallery', ['central-door'])
    const shared = plan.route.legs.slice(0, plan.divergeAt ?? 0).map((l) => l.edge.id)
    expect(shared).toEqual(plan.ghost?.legs.map((l) => l.edge.id))
    expect(plan.ghostDrawn?.legs).toEqual([])
  })

  it('H13.3 when the routes part at the closed door, a marker with a caption shows where it broke', () => {
    const plan = scene('gallery', ['central-door'])
    expect(plan.divergeAt).toBe(8)
    expect(plan.ghostDrawn).toEqual({ legs: [], startsAt: 'corridor-2-mid' })
    expect(plan.failure).toMatchObject({ at: 'corridor-2-mid', label: 'Door closed' })
    expect(plan.failure?.edge.id).toBe('door-206-north')
    expect(plan.failure?.at).toBe(plan.ghost?.endsAt)
  })

  it('H13.4 without a detour, the old path is drawn up to the blockage', () => {
    for (const plan of [scene('lift', ['lift']), scene('gallery', ['central-door', 'walk-door'])]) {
      expect(plan.route.found).toBe(false)
      expect(plan.divergeAt).toBeNull()
      expect(plan.ghostDrawn?.legs).toEqual(plan.ghost?.legs)
      expect(plan.ghostDrawn?.startsAt).toBe('forecourt')
    }
  })

  it('H13.5 no ghost, no marker when the baseline is not cut', () => {
    for (const plan of [scene('lift'), scene('gallery', ['walk-door']), scene('lift', ['lift'], 'steps-allowed')]) {
      expect(plan.ghost).toBeNull()
      expect(plan.ghostDrawn).toBeNull()
      expect(plan.failure).toBeNull()
    }
  })
})

describe('Every preset, every combination of its controls, both profiles', () => {
  const subsets = (n: number) => Array.from({ length: 2 ** n }, (_, mask) => mask)

  for (const id of SCENARIO_IDS) {
    const controls = SCENARIOS[id].controls
    for (const mask of subsets(controls.length)) {
      const pressed = controls.filter((_, i) => mask & (1 << i)).map((c) => c.id)
      for (const profile of PROFILES) {
        it(`H8.1 ${id} [${pressed.join(', ') || 'nothing closed'}] ${profile}`, () => {
          const plan = scene(id, pressed, profile)

          // One route result for the map and the text.
          expect(plan.route).toBe(plan.comparison[profile])
          expect(buildDirections(HOTEL, plan.route).flatMap((s) => s.legs)).toEqual(plan.route.legs.map((_, i) => i))
          for (const step of buildDirections(HOTEL, plan.route).slice(1)) {
            expect(step.floor).toBe(HOTEL.nodes[plan.route.legs[step.legs[step.legs.length - 1]].to].floor)
          }

          // The route uses only open transitions, and Step-free never uses steps.
          expect(plan.route.legs.every((l) => !plan.closed.has(l.edge.id))).toBe(true)
          if (profile === 'step-free') expect(plan.route.legs.every((l) => !STEP_KINDS.has(l.edge.kind))).toBe(true)

          // The ghost trail is a prefix of the baseline that ends before the first closed leg.
          if (plan.ghost) {
            const n = plan.ghost.legs.length
            expect(plan.ghost.legs).toEqual(plan.baseline.legs.slice(0, n))
            expect(plan.closed.has(plan.baseline.legs[n].edge.id)).toBe(true)
            expect(plan.ghost.endsAt).toBe(plan.baseline.legs[n].from)
            expect(plan.ghost.legs.every((l) => !plan.closed.has(l.edge.id))).toBe(true)
            // The drawn trail is the part after the point where the routes part.
            const d = plan.route.found ? (plan.divergeAt ?? 0) : 0
            expect(plan.ghostDrawn?.legs).toEqual(plan.ghost.legs.slice(d))
            if (plan.route.found) expect(plan.route.legs.slice(0, d).map((l) => l.edge.id)).toEqual(plan.ghost.legs.slice(0, d).map((l) => l.edge.id))
            expect(plan.failure?.at).toBe(plan.ghost.endsAt)
          } else {
            expect(plan.ghostDrawn).toBeNull()
            expect(plan.failure).toBeNull()
          }

          // A proposal is reachable in the selected profile with the same closures.
          if (plan.proposal) {
            const check = findRoute(HOTEL, START, plan.proposal.room, profile, plan.closed)
            expect(check.found).toBe(true)
            expect(plan.route.found).toBe(false)
            const earlier = plan.candidates.slice(0, plan.candidates.findIndex((c) => c.room === plan.proposal!.room))
            expect(earlier.every((c) => !c.route.found)).toBe(true)
          }
          expect(plan.noSuitableRoute).toBe(!plan.route.found && plan.candidates.every((c) => !c.route.found))
          if (plan.noSuitableRoute) expect(plan.proposal).toBeNull()

          // Entrance checks: a found check uses its own entrance, and the active route costs the cheapest check.
          for (const check of plan.entranceChecks) {
            if (check.route.found) expect(check.route.nodes).toContain(check.entrance)
            else expect(check.reason).not.toBeNull()
          }
          const found = plan.entranceChecks.filter((c) => c.route.found)
          if (plan.route.found) expect(plan.route.cost).toBe(Math.min(...found.map((c) => c.route.cost)))
          else expect(found).toHaveLength(0)
        })
      }
    }
  }
})
