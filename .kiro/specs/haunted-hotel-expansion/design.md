# Design Document: Haunted Hotel Expansion

## Overview

The expansion changes data and presentation, not the routing algorithm. `findRoute`, `isTraversable` and `ghostTrail` in `src/routing/route.ts` stay as they are. The new behavior comes from:

- a bigger graph in `src/routing/hotel.ts` (Floors 1 to 3, the Garden Entrance, the gallery wing),
- scenario presets that choose the event room and the closure controls,
- three small additions to `planScenario`: added time, entrance checks and closure reasons,
- a floor-aware step list and a floor switcher in the interface.

```
ScenarioState (sessionStorage)  { scenario, profile, closedEdges, eventRoom, movedFrom }
        │
        ▼
planScenario(graph, state) ──► ScenarioPlan
        │                        ├─ route            active RouteResult (the only one)
        │                        ├─ ghost            prefix of the baseline, or null
        │                        ├─ baseline, comparison, candidates, proposal   (as before)
        │                        ├─ addedSeconds     route.cost − baseline.cost, or 0
        │                        ├─ divergeAt        first leg index where route leaves baseline, or null
        │                        ├─ entranceChecks   three findRoute calls, gates of the others closed
        │                        ├─ closedReasons    each closed message once
        │                        ├─ otherProfile     route of the other profile when this one is blocked
        │                        └─ status           text for the live region
        ▼
ScenarioPicker · Controls · StatusPanel · FloorSwitcher · FloorPlan · Directions
(all read the same plan; the focused floor and the selected step are view state in App)
```

Nothing under `src/map/` or `src/components/` calls `findRoute` (routing rule 2).

## Graph

### Nodes added or moved

| Node id | Floor | x, y | Kind | Phrase |
|---|---|---|---|---|
| `garden-entrance` | 1 | 445, 340 | entrance | the Garden Entrance |
| `garden-vestibule` | 1 | 445, 280 | corridor, landmark | the garden vestibule |
| `room-206` | 2 | 310, 270 | room | Room 206 (Portrait Gallery) |
| `west-end-2` | 2 | 35, 200 | corridor | the west passage |
| `south-walk-west` | 2 | 35, 360 | corridor | the Gallery Walk |
| `south-walk-mid` | 2 | 320, 360 | corridor | the Gallery Walk |
| `south-walk-east` | 2 | 510, 360 | corridor | the Gallery Walk |
| `room-205` (moved) | 2 | 510, 410 | room | Room 205 (Card Room) |
| `stairs-3` | 3 | 300, 120 | stairs | the top of the Grand Staircase |
| `lift-3` | 3 | 560, 140 | lift | the lift door on Floor 3 |
| `corridor-3-west`, `corridor-3-mid`, `corridor-3-east`, `lift-lobby-3` | 3 | 120/320/455/560, 200 | corridor | as on Floor 2 |
| `room-301` | 3 | 160, 270 | room | Room 301 (Library) |
| `room-302` | 3 | 460, 270 | room | Room 302 (Moonlight Hall) |

`FloorId` becomes `1 | 2 | 3`. The garden vestibule is a landmark, so a route through it reads "Walk through the garden vestibule to …". Room 104 is not a landmark, and no route passes through it.

### Transitions added or changed

| Edge id | From → To | Kind | Cost | Notes |
|---|---|---|---|---|
| `garden-path` | forecourt → garden-entrance | walk | 45 | "garden path", gravel, slow with a loaded cart |
| `garden-door` | garden-entrance → garden-vestibule | walk | 10 | gate of the Garden Entrance, closedMessage "The Garden Entrance is closed.", closedLabel "Garden Entrance closed" |
| `vestibule-corridor` | garden-vestibule → corridor-1-east | walk | 10 | exit from the vestibule to the corridor |
| `vestibule-104` | garden-vestibule → room-104 | walk | 12 | separate door from the vestibule into Room 104. 12 s so that vestibule → Room 104 → lift lobby (22 s) is dearer than the corridor (20 s) |
| `side-door` (changed) | side-entrance → lift-lobby-1 | walk | 10 | gate of the Side Entrance, closedMessage "The Side Entrance is closed.", closedLabel "Side Entrance closed" |
| `door-206-north` | corridor-2-mid → room-206 | walk | 10 | closedMessage "The central door to the Portrait Gallery is closed." |
| `door-206-south` | south-walk-mid → room-206 | walk | 10 | closedMessage "The Gallery Walk door is closed." |
| `c2-west-end` | corridor-2-west → west-end-2 | walk | 8 | |
| `west-passage` | west-end-2 → south-walk-west | walk | 15 | |
| `south-walk-1`, `south-walk-2` | south-walk-west → mid → east | walk | 28, 19 | `via: 'Gallery Walk'` |
| `door-205` (moved) | south-walk-east → room-205 | walk | 10 | |
| `grand-staircase-upper` | stairs-2 → stairs-3 | stairs | 30 | name "Grand Staircase" |
| `lift-upper` | lift-2 → lift-3 | lift | 70 | name "lift", same closedMessage as `lift` |
| `c3-stairs`, `c3-west-mid`, `c3-mid-east`, `c3-east-lift-lobby`, `lift-door-3` | Floor 3 corridor | walk | 10, 20, 15, 10, 5 | as on Floor 2 |
| `door-301` | corridor-3-west → room-301 | walk | 10 | |
| `door-302` | corridor-3-east → room-302 | walk | 10 | |

`GraphEdge` gets two optional fields: `via?: string` and `closedLabel?: string`, the caption of the failure marker ("Door closed", "Lift out of service", "Side Entrance closed", "Garden Entrance closed"). `routeSummary` lists it once per run, so a route over `south-walk-1` and `south-walk-2` shows "Gallery Walk" once.

### Groups, gates and candidates (in `hotel.ts`)

```ts
export const LIFT_EDGE = 'lift'                                  // unchanged export
export const LIFT_EDGES = ['lift', 'lift-upper'] as const        // closure group
export const ENTRANCE_GATES = {                                  // entrance node -> gate edge
  'main-entrance': 'entrance-lobby',
  'side-entrance': 'side-door',
  'garden-entrance': 'garden-door',
} as const
export const RELOCATION_CANDIDATES = {
  'room-204': ['room-203', 'room-104'],                          // unchanged
  'room-206': ['room-302', 'room-301'],
}
```

The old `room-205` direct door from `corridor-2-mid` is removed. Nothing else on Floors 1 and 2 changes, so the original routes keep their costs.

### Costs, computed by the implemented graph

These are the values the tests in `src/routing/expansion.test.ts` assert. They come from the existing `findRoute` on the graph in `src/routing/hotel.ts`.

| Target | Profile | Nothing closed |
|---|---|---|
| Room 204 | Steps allowed | 125 s (unchanged) |
| Room 204 | Step-free | 140 s (unchanged) |
| Room 203 | Step-free | 185 s |
| Room 104 | Step-free | 60 s by the side ramp (unchanged); 67 s by the Garden Entrance |
| Room 205 | Step-free / Steps allowed | 204 s / 139 s (through the gallery) |
| Room 206 | Step-free / Steps allowed | 165 s / 100 s |
| Room 301 | Step-free / Steps allowed | 255 s / 150 s |
| Room 302 | Step-free / Steps allowed | 220 s / 145 s |

### The garden vestibule and the move route to Room 104

The vestibule gives the Garden Entrance its own door into Room 104, so the Garden Entrance route to Room 104 is 45 + 10 + 12 = 67 s. The side ramp route is 15 + 25 + 10 + 10 = 60 s. The ramp stays shorter, so with the lift out the app keeps proposing Room 104 by the first release's route: forecourt → side ramp → Side Entrance → lift lobby → Room 104, 1 min 00 s, "Side Entrance (ramp)". No first-release expectation changed, and `src/routing/hotel.test.ts` is byte-for-byte the same file.

The gravel path cost of 45 s keeps it that way. It would take a path cost under 38 s for the Garden Entrance to win, and test `H1.8b` fails if anyone changes the costs so that it does.

The vestibule also lets the Garden Entrance reach the lift without crossing Room 104: forecourt → Garden Entrance → vestibule → east corridor → lift lobby. No route passes through the Garden Hall; test `H1.3b` checks every room, profile and closure set.

## Floor plans (top view)

Legend: `D` door, `N` and `S` the gallery's north and south doors, `E` Side Entrance door (east wall), `S` on Floor 1 is the Main Entrance (front steps), `G` Garden Entrance, `|  |  |` stair treads, `LIFT` the lift (same position on every floor), `.` carpeted corridor, `:` carpeted hall. One character is about 10 px wide. The drawing is a sketch, not the final SVG.

### Floor 1

```
+---------------+---------------------+-----------+------------+
|               |   GRAND STAIRCASE   |           |   Staff    |
|      101      |   |  |  |  |  |  |  |    102    +------------+
|    Ivy Room   |   |  |  |  |  |  |  |   Office  |    LIFT    |
|               |     ^  steps up     |           |[lift shaft]|
|               |                     |           |            |
+------ D ------+--------- D ---------+---- D ----+---- D -----+
|...................... central corridor ......................E  <-- Side Entrance (ramp, step-free)
+------ D ------+--------- D ---------+---- V ----+------ D ---+  | ^ |
|               |                     |  garden   |            |  | ^ |   side ramp
|      103      |:::::::LOBBY:::::::::| vestibule ]    104     |  | ^ |
|   Cloakroom   |:::::::::::::::::::::|           ]   Garden   |  | ^ |
|               |:::::::::::::::::::::|           |    Hall    |  | ^ |
|               |:::::::::::::::::::::|           |            |  | ^ |
+---------------+--------- S ---------+---- G ----+------------+
                           ^ ^ ^ front steps   ^ Garden Entrance (level door)
    (Start)  forecourt ............... garden path (gravel) ....
```

Floor 1 keeps the Side Entrance with the ramp (east wall) and Room 104. New: the Garden Entrance `G`, a level door into the garden vestibule. The vestibule has an exit `V` to the east corridor and its own door `]` into the Garden Hall. Room 104 keeps its door to the lift lobby. The Main Entrance `S` still has front steps.

### Floor 2

```
+---------------+---------------------+-----------+------------+
|               |   GRAND STAIRCASE   |           |   Staff    |
|      201      |   |  |  |  |  |  |  |    202    +------------+
|  Reading Room |   |  |  |  |  |  |  |Linen Store|    LIFT    |
|               |    ^ up   v down    |           |[lift shaft]|
|               |                     |           |            |
+------ D ------+--------- D ---------+---- D ----+---- D -----+
|...................... central corridor ......................|
+...+---- D ----+--------- N ----------+--------------- D -----+
|...|           |                      |                       |
|...|    203    |         206          |          204          |
|...| Blue Room |   PORTRAIT GALLERY   |       Gold Room       |
|...|           |     (two doors)      |                       |
|...|           |                      |                       |
+...+-----------+--------- S ----------+-----------------------+
|............... GALLERY WALK (south corridor) ................|
+--------------------------------------+--------- D -----------+
|                                      |          205          |
|               Storage                |       Card Room       |
+--------------------------------------+-----------------------+
```

Floor 2 keeps Room 204 (east, on the lift lobby). The Portrait Gallery (206) sits between two corridors. `N` opens onto the central corridor, `S` onto the Gallery Walk. The west passage (left edge, `.`) joins the two corridors without going through the gallery. Room 205 moves to the Gallery Walk.

### Floor 3

```
+---------------+---------------------+-----------+------------+
|               |   GRAND STAIRCASE   |           |   Staff    |
|      303      |   |  |  |  |  |  |  |    304    +------------+
|    Archive    |   |  |  |  |  |  |  |Linen Store|    LIFT    |
|               |    ^ up   v down    |           |[lift shaft]|
|               |                     |           |            |
+------ D ------+--------- D ---------+---- D ----+---- D -----+
|...................... central corridor ......................|
+-------- D -----------------+------------- D -----------------+
|                            |                                 |
|::::::::::::301:::::::::::::|               302               |
|::::::::::LIBRARY:::::::::::|         MOONLIGHT HALL          |
|                            |                                 |
|                            |                                 |
+----------------------------+---------------------------------+
```

Floor 3 holds the Library (301) and the Moonlight Hall (302). Both are reached by the lift or the Grand Staircase, so they show what the lift outage costs: Step-free cannot reach them, Steps allowed can.

## Scenarios, closed transitions and expected routes

Times use `formatTime`. "Entrance" is the entrance named in the route summary.

| # | Scenario | Control pressed | Closed transitions | Profile | Route the graph gives | Time | Ghost trail ends at |
|---|---|---|---|---|---|---|---|
| 0 | Baseline for Room 204 | none | none | Steps allowed | forecourt → main-entrance → lobby → corridor-1-mid → stairs-1 → stairs-2 → corridor-2-mid → corridor-2-east → lift-lobby-2 → room-204 | 2 min 05 s | none |
| 0 | | | | Step-free | forecourt → ramp-base → side-entrance → lift-lobby-1 → lift-1 → lift-2 → lift-lobby-2 → room-204 | 2 min 20 s | none |
| B1 | Lift out, move to 104 | Lift out of service | `lift`, `lift-upper` | Step-free | **none.** Status "No step-free route to Room 204. The lift is out of service." | none | `lift-1`, the lift door on Floor 1 (4 legs) |
| B1 | | | | Steps allowed | unchanged: Main Entrance (front steps) → Grand Staircase | 2 min 05 s | none |
| B2 | | Move event to Room 104 | same | Step-free | Candidates: Room 203 ✕, Room 104 ✓. Route: forecourt → ramp-base → side-entrance → lift-lobby-1 → room-104 | 1 min 00 s | none after the move |
| A0 | Gallery door closed | none | none | Step-free | forecourt → … → lift-2 → lift-lobby-2 → corridor-2-east → corridor-2-mid → room-206 (Side Entrance (ramp) → Lift) | 2 min 45 s | none |
| A0 | | | | Steps allowed | forecourt → main-entrance → … → stairs-2 → corridor-2-mid → room-206 | 1 min 40 s | none |
| A1 | | Close central door | `door-206-north` | Step-free | …→ corridor-2-mid → corridor-2-west → west-end-2 → south-walk-west → south-walk-mid → room-206 (Side Entrance (ramp) → Lift → Gallery Walk) | 3 min 56 s (+1 min 11 s) | `corridor-2-mid` (8 legs, all shared with the detour: nothing dashed, marker "Door closed") |
| A1 | | | | Steps allowed | …→ stairs-2 → corridor-2-mid → corridor-2-west → west-end-2 → south-walk-west → south-walk-mid → room-206 | 2 min 51 s (+1 min 11 s) | `corridor-2-mid` (6 legs) |
| A2 | | Close central door and Gallery Walk door | `door-206-north`, `door-206-south` | Step-free | **no route to Room 206.** Candidates: Room 302 ✓ (3 min 40 s), Room 301 ✓ (4 min 15 s). Proposal: Room 302 | 3 min 40 s after the move | `corridor-2-mid` |
| A3 | | the two doors and Lift out of service | `door-206-north`, `door-206-south`, `lift`, `lift-upper` | Step-free | **no suitable route.** Candidates 302 ✕, 301 ✕. "No step-free alternative found." No other-profile hint: both doors are closed, so Steps allowed cannot reach Room 206 either | none | `lift-1` (the lift is the first closed leg of the baseline) |
| C0 | Side Entrance closed | none | none | Step-free | same as baseline 0 | 2 min 20 s | none |
| C1 | | Close Side Entrance | `side-door` | Step-free | forecourt → garden-entrance → garden-vestibule → corridor-1-east → lift-lobby-1 → lift-1 → lift-2 → lift-lobby-2 → room-204 (Garden Entrance (level) → Lift). Entrance check: Main ✕ front steps, Side ✕ closed, Garden ✓ 2 min 45 s | 2 min 45 s (+25 s) | `side-entrance` (2 legs: the path and the ramp, drawn dashed from the forecourt) |
| C1 | | | | Steps allowed | unchanged: Main Entrance (front steps) → Grand Staircase | 2 min 05 s | none |
| C2 | | Close Side Entrance and Garden Entrance | `side-door`, `garden-door` | Step-free | **no suitable route.** Entrance check: Main ✕ front steps, Side ✕ closed, Garden ✕ closed. Candidates 203 ✕, 104 ✕. Hint: "Steps allowed still reaches Room 204 via Main Entrance (front steps) → Grand Staircase." | none | `side-entrance` |

### Not the same as no route

Rows A2 and B1 both have no route to the booked room. Only A3 and C2 are "no suitable route", because only there does every relocation candidate fail too. A2 and B1 end in a verified proposal.

### The Moonlight Hall as a proposal

Row A2 is a valid state in which the Moonlight Hall is proposed: both gallery doors closed, the lift working, Step-free. The move gives a step-free route to Room 302 by the lift ("Take the lift up to Floor 3."), 3 min 40 s. The same proposal appears for Steps allowed with both doors and the lift closed (by the Grand Staircase).

## State, reducer and storage

```ts
type ScenarioId = 'lift' | 'gallery' | 'entrance'

interface ScenarioState {            // additive: one new field
  scenario: ScenarioId               // default 'lift'
  profile: Profile
  closedEdges: string[]
  eventRoom: string
  movedFrom: string | null
}

interface ScenarioDef {              // src/routing/scenarios.ts
  id: ScenarioId
  title: string
  bookedRoom: string
  controls: { id: string; label: string; edges: readonly string[] }[]
}
```

| Action | Effect |
|---|---|
| `set-scenario` | `initialStateFor(id)`: booked room of the preset, nothing closed, Step-free, `movedFrom: null` |
| `toggle-closure` `{ id }` | toggles all edges of that control together |
| `toggle-lift` | kept as an alias of `toggle-closure` for the lift control, so the first release's tests keep working |
| `confirm-move`, `set-profile`, `reset` | as before |

`parseStoredState` keeps the storage key `ghost-routes:v1`. A missing `scenario` reads as `'lift'`, so a state saved by the first release loads. It stays strict: the scenario must exist, every closed edge must belong to a control of that scenario, and the event room must be the booked room or one of its candidates. Anything else returns the initial state.

## Plan additions

| Field | Definition |
|---|---|
| `addedSeconds` | `route.cost − baseline.cost` when both are found and the result is above zero, otherwise `0` |
| `divergeAt` | index of the first leg of `route` that differs from the baseline leg at the same index, or `null` |
| `entranceChecks` | for each entry of `ENTRANCE_GATES`: `findRoute(…, closed ∪ gates of the other entrances)`; reason `closed` when its own gate is closed, `front steps` when only Steps allowed finds a route, otherwise `no route` |
| `closedReasons` | `closedMessage` of every closed edge, deduplicated, in the order of the preset's controls |
| `otherProfile` | the route of the other profile when `route` is not found, else `null` |
| `status` | as before, plus the "It adds <time>." sentence and the reasons list |

The proposal panel appears whenever the route is missing, for either profile. Its lead line stays "Checked with the same step-free rules and the lift out:" when the lift is the only closed group, which is the first release's wording. With any other closure it reads "Checked with the same <profile> rules and the closed doors:".

## Directions and floor-aware steps

- `buildDirections` starts a new step when a walking leg arrives at an entrance node. For a level entrance the step reads "Walk to the Garden Entrance. Level entrance, no steps."
- Consecutive legs with the same kind and name (`lift`, `lift-upper`) form one step, with `legs: [i, i+1]`.
- `DirectionStep` gets `floor: FloorId`, the floor of the node where its last leg ends. The "Start" step has the floor of the start node.
- `buildGuestText` writes "Garden Entrance (level, step-free)" for a level entrance.

## Layout

### Desktop, 1180 px and wider (sketch at 1366 × 900)

From 760 px to 1179 px the steps column moves under the map. Under 760 px everything stacks in one column, with a "Jump to the map" link at the top.

```
+----------------------------------------------------------------------------------------+
| The Hollowmere Hotel · Ghost Routes                                                    |
+--------------------+---------------------------------------------+---------------------+
| LEFT  320 px       | CENTER  about 600 px                        | RIGHT  360 px       |
|                    |                                             |                     |
| [1] Scenario       | [5] Floor switcher (tab list)               | [8] Guest steps     |
|  (•) Lift out…     |  +---------+ +---------+ +---------+        |  Directions to      |
|  ( ) Gallery door  |  | F1 mini | | F2 mini | | F3 mini |        |  Room 206           |
|  ( ) Side Entrance |  | route   | | ghost   | | lock    |        |  1 Start at…        |
|                    |  +---------+ +---------+ +---------+        |  2 Walk to…         |
| [2] Routes to 206  |      Floor 2 selected                       |  3 Take the lift… ◄ |
|  Steps allowed     |                                             |  4 Walk to…         |
|  Step-free         | [6] Focused floor, large                    |  [Copy guest        |
|                    |   one solid route                           |   directions]       |
| [3] Organizer      |   one dashed ghost trail ending at a lock   |                     |
|  [Close central    |   ghost icon, markers, lit door             |                     |
|   door] [Reset]    |                                             |                     |
|                    | [7] Legend                                  |                     |
| [4] Block status   |   solid = route   dashed = ghost trail      |                     |
|  role=status       |   lock = closed   ring = new room door      |                     |
|  ghost note        |                                             |                     |
|  proposal /        |                                             |                     |
|  entrance check    |                                             |                     |
+--------------------+---------------------------------------------+---------------------+
```

Selecting a step in [8] moves the switcher in [5] and the map in [6] to the step's floor and highlights the step's legs.

### Phone, 390 px

```
+-------------------------------+
| Ghost Routes                  |
| [1] Scenario  (3 radio rows)  |
| [2] Routes to Room 206        |
|     ( ) Steps allowed         |
|     (•) Step-free             |
| [3] Organizer action          |
|     [ Close central door ]    |
|     [ Reset scenario ]        |
| [4] Block status              |
|     No step-free route…       |
|     Ghost trail: …            |
|     ✓ Room 302 …  [Move…]     |
| [5] Floor switcher            |
|  [F1 mini][F2 mini][F3 mini]  |
| [6] Map, focused floor        |
|  358 px wide, no side scroll  |
| [7] Legend                    |
| [8] Guest steps               |
|  1 Start at…                  |
|  2 Take the lift up to…  ◄    |
|  [Copy guest directions]      |
+-------------------------------+
```

The status [4] comes before the map, so the visitor reads the result first. The three mini plans are about 112 px wide each, with the floor name and one text chip (for example "route", "ghost trail", "closed") under each.

### Selecting a step

```
visitor activates step 3 ("Take the lift up to Floor 3.")
   → App view state: { focusedFloor: step.floor, selectedStep: 3 }     (not in the plan)
   → FloorSwitcher selects Floor 3 and announces "Showing Floor 3." in its own live region
   → FloorPlan(3) draws step.legs with the highlight class on top of the route
   → on a phone, if the map is outside the viewport, scroll it into view (instant when reduced motion)
   → keyboard focus stays on the step button
```

The step list is `ol > li > button`. The list keeps `data-testid="directions"` and its text, so text checks keep working.

## Interface changes

- **Floor switcher.** `role="tablist"` with three `role="tab"` buttons. Each holds a small `FloorPlan` in `compact` mode (no room names, same route, ghost and locks) and a text chip. The large map is the `tabpanel`. Roving `tabindex`, arrow keys, Home and End.
- **Test ids.** The large map keeps `floor-N`, `route-N`, `ghost-trail-N` and `lock-<node>` for the focused floor. The compact plans use `floor-N-mini` and no other test ids. A short helper in the e2e spec switches the floor before it checks the other floors.
- **Closure controls.** `ScenarioButtons` renders the controls of the active preset. The button for the lift keeps the accessible name "Lift out of service".
- **Closed doors.** `layout.ts` gets door shapes with an `edgeId`. A closed edge with a door shape draws its lock at the door. A closed edge without one (the lift) draws it at the end nodes, as now.
- **Ghost trail beside a detour (Requirement 13).** `plan.ghost` stays the baseline prefix up to the first closed transition (routing rule 3). The map draws `plan.ghostDrawn` instead:

  | Case | Shared legs | Dashed | Marker |
  |---|---|---|---|
  | No active route (B1, A2, A3, C2) | none | the whole ghost trail, from the start | at the end, with the caption |
  | Detour that parts before the closure (C1: parts at the forecourt) | drawn once, solid | from the divergence point to the node before the closed transition | at the end, with the caption |
  | Detour that parts at the closed door (A1: parts at `corridor-2-mid`) | drawn once, solid, up to the door | nothing (`ghostDrawn.legs` is empty) | "Door closed" at the central door, with the ghost icon |
  | Baseline not cut (lift scenario on foot, A0, walk door only) | — | nothing | none |

  `divergeIndex` and `drawnGhostLegs` live in `src/routing/route.ts` next to `ghostTrail`. The plan exposes `divergeAt`, `ghostDrawn` and `failure`.
- **Entrance check list.** Shown under the status while any entrance gate is closed: "✕ Main Entrance: front steps", "✕ Side Entrance: closed", "✓ Garden Entrance: step-free route, 2 min 45 s".

## Motion

All three effects are CSS keyframes on elements that always exist in their final style. If the animation does not run, the screen is already correct.

| State | Trigger | What moves | Timing | Reduced motion |
|---|---|---|---|---|
| 1. Old route becomes a ghost trail | a closure that cuts the baseline | the legs of `ghostDrawn` change `stroke-dasharray` from `1000 0` to `10 8` and `stroke` from the route color to the ghost color | 0 to 0.5 s, ease in-out | dashed from the first frame |
| 2. The detour draws in | a route that leaves the baseline (`divergeAt` is not null) | the legs after `divergeAt` use `pathLength=1`, `stroke-dasharray: 1` and `stroke-dashoffset` from 1 to 0 | starts at 0.45 s, lasts 0.9 s, ease out | fully drawn from the first frame |
| 3. The new room's door lights up | `confirm-move` | a radial glow around the door of the new room, and the door ring | two pulses in 3.2 s, then a steady ring | steady ring from the first frame, no pulse |

- Layers are keyed by a plan signature (closed edges, route leg ids, event room). A new signature replays the animation. Switching floors or selecting a step does not change the signature.
- The status text, focus move and live regions are set in the same render, not after the animation.
- `@media (prefers-reduced-motion: reduce)` sets `animation: none` and `transition: none` for these classes. Scrolling to the map uses `behavior: 'auto'` in that case.
- Meaning never depends on motion: dashed shape, lock, ghost icon, ring and the text in the status carry it.

## Look and feel

- Palette stays: cream `#f6efe0` plan, burgundy `#6b1d24` walls, teal route, violet-grey ghost trail. New tokens: `--glow: #f3b94a` and `--glow-soft: rgba(243,185,74,.35)` for the lit door.
- Carpets are original SVG patterns, one per floor: nested hexagons (existing) on Floor 1, lantern diamonds on Floor 2, crescent moons on Floor 3. Corridors and halls use them.
- The mood comes from the ghost icon, the lock badges, the lantern glow on the new door and the burgundy wall, not from dimming the plan. The glow is local: a radial gradient about 70 px across around one door.
- No external fonts, images or requests.

## Correctness properties

The first release's P1 to P5 stay. Two new fast-check properties on random graphs are in `src/routing/route.property.test.ts`:

- **P6 (Req 3.6, 7.8)** Closing a whole group of edges keeps every edge of the group out of the route, never turns an unreachable target reachable, and never makes a route cheaper.
- **P7 (Req 13.1 to 13.3)** The drawn ghost trail is the end of the ghost trail from the divergence point, contains no closed edge, ends at the node before the first closed edge, and is empty exactly when the routes part at that node. Without a route it is the whole ghost trail.

The other planned properties need the hotel's presets, gates and directions, so they are checked over every preset rather than on random graphs. `src/routing/expansion.test.ts` runs every preset with every subset of its closure controls and both profiles (2 + 8 + 4 subsets, times 2 profiles = 28 plans) and asserts on each plan:

- `plan.route` is the object in `plan.comparison[profile]`, and the directions cover each of its legs once and in order, each step with the floor of its last leg (Req 8.1, 8.3, 8.6);
- no closed edge in the route, and no steps or stairs for Step-free (Req 1.7);
- the ghost trail is a baseline prefix that ends before the first closed leg, the drawn trail is its part after the divergence point, and the marker is at its end (Req 13);
- any proposal is reachable in the selected profile with the same closures and no earlier candidate is (Req 5.6);
- "no suitable route" holds exactly when the room and every candidate are unreachable (Req 7.1);
- every found entrance check uses its own entrance, and the active route costs the same as the cheapest one (Req 6.4).

## Files that change

| File | Change |
|---|---|
| `src/routing/types.ts` | `FloorId = 1 \| 2 \| 3`; `via?` and `closedLabel?` on `GraphEdge` |
| `src/routing/hotel.ts` | new nodes and edges, garden vestibule, moved `room-205`, `LIFT_EDGES`, `ENTRANCE_GATES`, candidates for `room-206` |
| `src/routing/scenarios.ts` (new) | the three presets and `initialStateFor` |
| `src/routing/scenario.ts` | `set-scenario`, `toggle-closure`, `toggle-lift` alias, stricter and backward-compatible parsing |
| `src/routing/route.ts` | adds `divergeIndex` and `drawnGhostLegs`; `findRoute`, `isTraversable` and `ghostTrail` unchanged |
| `src/routing/format.ts` (new) | `formatTime`, moved out of the components so the plan can use it |
| `src/routing/plan.ts` | `scenario` in state, `addedSeconds`, `divergeAt`, `ghostDrawn`, `failure`, `entranceChecks`, `closedReasons`, `otherProfileHint`, `noSuitableRoute`, status text |
| `src/routing/directions.ts` | split at entrances, merge floor-change legs, `floor` on steps, `via` in summaries, level-entrance wording |
| `src/map/layout.ts` | three floor layouts, per-floor viewBox, door shapes with `edgeId`, per-floor carpet ids |
| `src/map/FloorPlan.tsx` | three carpets, locks at doors, compact mode, highlighted step legs, ghost beside a shared route, animation layers |
| `src/components/ScenarioControls.tsx` | closure controls from the preset, entrance check list, no-suitable-route state, proposal for either profile |
| `src/components/Directions.tsx` | step buttons, `aria-current`, floor callback |
| `src/components/ScenarioPicker.tsx` (new) | preset radio group |
| `src/components/FloorSwitcher.tsx` (new) | tab list with mini plans and chips, live region |
| `src/App.tsx` | three-column layout, `focusedFloor` and `selectedStep` view state |
| `src/index.css` | layout at 960 px and 390 px, tokens, keyframes, reduced-motion rules |
| `src/routing/hotel.test.ts` | **not edited** (Requirement 2.6) |
| `src/routing/expansion.test.ts` (new) | tests named `H<req>.<n>`, scenario table, exhaustive invariants |
| `src/routing/route.property.test.ts` | adds P6 and P7 |
| `e2e/scenario.spec.ts` | small edits: switch the floor before checking Floor 2 items |
| `e2e/expansion.spec.ts` (new) | three scenarios, no-route states, 390 px, keyboard, reduced motion |
| `.kiro/steering/routing-rules.md`, `routing-code.md` | mention closure groups and entrance gates (after approval) |
| `README.md`, `docs/kiro-usage.md` | new scenarios and the browser checks (after the work is done) |

## Risks and open questions

1. **Shared legs.** Decided: shared legs are drawn once as the solid route, and the dashed trail starts at the divergence point (Requirement 13). In the gallery case nothing is dashed and the failure marker carries the message.
2. **Garden Entrance through Room 104.** Resolved by the garden vestibule. No route passes through the Garden Hall; test `H1.3b` checks every room, profile and closure set.
3. **Gallery as a shortcut.** Allowed: with both gallery doors open, Room 205 is reached through the gallery (204 s). With the central door closed it goes round by the west passage (255 s). No scenario books Room 205.
4. **Lift as two transitions.** A control closes both. A test must make sure that closing only `lift` (as the first release's tests do) still behaves as before.
5. **Moonlight Hall as an event room.** It is only a relocation candidate. Making it bookable would need a fourth preset.
6. **Test ids.** Only the focused floor carries the old test ids, so `e2e/scenario.spec.ts` needs a floor switch before it checks Floor 2. The checked behavior does not change.
