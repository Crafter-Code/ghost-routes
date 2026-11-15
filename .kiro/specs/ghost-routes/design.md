# Design Document

## Overview

Ghost Routes is a static React + TypeScript app built with Vite. Everything runs in the browser:

- one hotel graph (`src/routing/hotel.ts`),
- one routing function (`findRoute` in `src/routing/route.ts`),
- one scenario planner (`planScenario` in `src/routing/plan.ts`) that turns the visitor's state into a single `ScenarioPlan`,
- React components that only render that plan.

```
ScenarioState (sessionStorage)
        │
        ▼
planScenario(graph, state) ──► ScenarioPlan
        │                        ├─ route        (active RouteResult)
        │                        ├─ ghost        (prefix of baseline, or null)
        │                        ├─ proposal     (verified candidate, or null)
        │                        ├─ comparison   (route per profile)
        │                        └─ status       (text for the live region)
        ▼
FloorPlan ×2  +  Directions  +  StatusPanel   (all read the same plan)
```

## Graph

### Data model

```ts
type FloorId = 1 | 2
type EdgeKind = 'walk' | 'ramp' | 'steps' | 'stairs' | 'lift'
type Profile = 'steps-allowed' | 'step-free'

interface GraphNode {
  id: string
  label: string          // short name, e.g. "Room 204"
  phrase: string         // used in sentences, e.g. "Room 204 (Gold Room)"
  floor: FloorId
  x: number; y: number   // position in the floor's SVG viewBox
  kind: 'outdoor' | 'entrance' | 'corridor' | 'stairs' | 'lift' | 'room'
  landmark?: boolean     // named in collapsed walking steps ("through the lobby")
}

interface GraphEdge {
  id: string
  from: string; to: string   // undirected
  kind: EdgeKind
  cost: number               // estimated seconds with a loaded cart
  name?: string              // "Grand Staircase", "lift", "side ramp"
  closedMessage?: string     // "The lift is out of service."
}
```

### The Hollowmere Hotel graph

Costs are chosen so that the stairs route is the cheapest for `Steps allowed` (125) and the lift route is the only one for `Step-free` (140).

```
Floor 2   stairs-2 ─ corridor-2-mid ─ corridor-2-east ─ lift-lobby-2 ─ room-204
             │                                              │
          (stairs)                                       lift-2
             │                                            (lift)  ◄── closable
Floor 1   stairs-1 ─ corridor-1-mid ─ corridor-1-east ─ lift-lobby-1 ─ lift-1
                         │                                 │    └─ room-104
                       lobby                         side-entrance
                         │                                 │ (ramp)
                   main-entrance                       ramp-base
                         │ (steps)                         │
                     forecourt ────────────────────────────┘
```

| Route | Profile | Path | Cost |
|---|---|---|---|
| A | Steps allowed | forecourt → front steps → Main Entrance → lobby → Grand Staircase → Floor 2 corridor → Room 204 | 125 |
| B | Step-free | forecourt → side ramp → Side Entrance → lift (Floor 1 → 2) → Room 204 | 140 |
| C | Step-free, lift closed | forecourt → side ramp → Side Entrance → Room 104 | 60 |

Relocation candidates for Room 204, in order: Room 203 (Floor 2, needs the lift or stairs), Room 104 (Floor 1).

## Routing

`findRoute(graph, from, to, profile, closed)` runs Dijkstra over the undirected graph.

An edge is traversable when:

```ts
!closed.has(edge.id) && !(profile === 'step-free' && (edge.kind === 'steps' || edge.kind === 'stairs'))
```

This is the only place where the profile rule and closures are applied. Both routes to Room 204 come from this function with different profiles (Requirement 1.3).

`ghostTrail(baseline, closed)` walks the baseline legs in order and stops at the first closed leg. It returns the legs before it and the blocked edge, or `null` if the baseline has no closed leg (Requirement 3).

`checkCandidates(graph, start, candidates, profile, closed)` calls `findRoute` for each candidate and returns every result. The proposal is the first found result (Requirement 4).

## Scenario states

```ts
interface ScenarioState {
  profile: Profile
  closedEdges: string[]     // the UI only toggles 'lift'
  eventRoom: string         // 'room-204' or 'room-104'
  movedFrom: string | null  // 'room-204' after the move
}
```

| State | Trigger | Map | Text and status |
|---|---|---|---|
| S0 Planning | initial / Reset | solid route A or B | "Route to Room 204 ready via …" |
| S1 Lift out, steps allowed | lift toggled, profile Steps allowed | solid route A, lock at lift | "The lift is out of service. Your route to Room 204 is still open via …" |
| S2 Lift out, step-free | lift toggled, profile Step-free | no active route, dashed ghost to lift door on Floor 1, lock at lift | "No step-free route to Room 204. The lift is out of service." + proposal Room 104, Room 203 rejected |
| S3 Moved | Confirm move to Room 104 | solid route C | "Event moved to Room 104. Step-free route ready …", focus on directions, copy enabled |

Reset returns to S0 from any state. The state is stored under `ghost-routes:v1` in `sessionStorage`, so every browser tab and every judge has an independent scenario (Requirement 7).

## UI

- `App` holds the reducer, calls `planScenario` once per render and passes the plan down (Requirement 6).
- `RouteComparison`: a radio group with one option per profile. Each option shows the summary of its route ("Main Entrance → Grand Staircase") or "No route".
- `Controls`: "Lift out of service" toggle button (`aria-pressed`), "Reset scenario".
- `StatusPanel`: `role="status"` live region with the plan's status text; proposal card with the checked candidates and "Move event to Room 104" button.
- `FloorPlan`: one SVG per floor. Static layout (walls, rooms, carpet) from `src/map/layout.ts`; dynamic layers: ghost trail (dashed), active route (solid), start and destination markers, lock icon at closed transitions, floor-change badges at stairs and lift.
- `Directions`: numbered steps from `buildDirections(plan.route)`, plus "Copy guest directions".

Visual language: cream paper background (`#f6efe0`), burgundy walls (`#6b1d24`), large room numbers, a geometric hexagon carpet in the corridors (own artwork, inspired by 1970s hotel carpets), teal solid route, grey-violet dashed ghost trail.

Layout: CSS grid. At ≥ 960 px the floor plans are on the left and the side panel on the right. Below that, the order is controls, floor plans, directions.

## Correctness properties

These properties are checked with fast-check on random graphs (`src/routing/route.property.test.ts`).

| # | Property | Requirement |
|---|---|---|
| P1 | A found route starts at the start, ends at the target, and every leg is a traversable, open edge connecting consecutive nodes. | 2.6 |
| P2 | A step-free route contains no `steps` or `stairs` edge. | 1.5 |
| P3 | If the target is unreachable with closures C, it is unreachable with C ∪ {e}. | 2.7 |
| P4 | The ghost trail is a prefix of the baseline, contains no closed edge, and ends at the `from` node of the first closed leg. | 3.2, 3.3 |
| P5 | A proposal, if any, is the first candidate with a found route. | 4.1, 4.2 |

## Error handling

- Unknown node ids passed to `findRoute` return a not-found result.
- Invalid or old session state is discarded (Requirement 7.4).
- Clipboard failures show the guest directions in a selectable text box (Requirement 5.5).

## Testing strategy

- `npm run test:routing`: unit tests for the hotel scenario and property tests for the routing core.
- `npm run test:e2e`: Playwright runs the full scenario 204 → lift out → 104 against `npm run preview` (the production build) on a desktop and a phone viewport, including keyboard operation and the live region text.
