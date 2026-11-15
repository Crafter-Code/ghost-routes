---
inclusion: always
---

# Ghost Routes: routing rules

These rules come from `.kiro/specs/ghost-routes/requirements.md` (rules 1 to 3) and `.kiro/specs/haunted-hotel-expansion/requirements.md` (rules 4 and 5, and the drawing note in rule 3). Every change to the app must keep them true. Tests that check a rule are named after it.

## 1. Step-free excludes stairs, steps and closed transitions

- A `Step-free` route never uses a transition of kind `steps` or `stairs` (Requirement 1.5).
- No route, for any profile, uses a closed transition (Requirement 2.6).
- Closing a transition never makes an unreachable room reachable (Requirement 2.7).
- `Steps allowed` keeps the Grand Staircase route to Room 204 when the lift is closed (Requirement 2.2).

## 2. The map and the directions use one route result

- `planScenario` is called once per render. Its `plan.route` is the only route the floor plans, the text directions, the status and the guest text read (Requirement 6).
- Never call `findRoute` inside a component to draw or describe a route.

## 3. The ghost trail ends before the first closed transition

- The ghost trail is a prefix of the baseline route (same profile, no closures).
- It stops at the `from` node of the first closed leg and never includes that leg or any later leg (Requirements 3.2, 3.3).
- For the lift outage it ends at the lift door on Floor 1.
- The map draws only the part after the point where the active route leaves the baseline (`plan.ghostDrawn`); `plan.ghost` itself stays the full prefix (expansion Requirement 13; tests H13.1 to H13.5, property P7).

## 4. A closure group closes and opens as one

- A closure control closes every transition of its group; pressing it again opens all of them. If only part of a group is closed, pressing the control closes the rest (expansion Requirement 3.6; tests H3.3, H3.6).
- A control shows as pressed only when every transition of its group is closed.
- The lift is one group, `LIFT_EDGES` in `src/routing/hotel.ts`: `lift` (Floor 1 to 2) and `lift-upper` (Floor 2 to 3). "Lift out of service" closes both, so with the lift out `Step-free` reaches no room above Floor 1 (Requirements 5.1, 5.3; tests H5.1, H5.3).
- Closing a whole group never makes an unreachable room reachable and never makes a route cheaper (Requirement 7.8; property P6).
- A stored state may close only transitions that belong to a control of its scenario; anything else loads as the initial state (Requirement 3.7; test H3.7b).
- The first release's `toggle-lift` action acts only on the lift control of the current scenario, and closing only `lift` still gives the first release's result (tests H3.6b, H5.1b).

## 5. An entrance is entered through its gate

- Each entrance node has exactly one gate: the transition from the entrance into the building, listed in `ENTRANCE_GATES` (Main Entrance `entrance-lobby`, Side Entrance `side-door`, Garden Entrance `garden-door`). Closing an entrance closes its gate, not the path or ramp outside it (Requirement 6.1; test H6.1).
- Entrance nodes sit just outside the wall, so only the gate crosses the door gap (`src/map/layout.test.ts`).
- The entrance check is one `findRoute` per entrance, with the gates of the other entrances closed on top of the current closures. A check that finds a route passes its own entrance and no other gate (Requirement 6.4; tests H6.4 and the check over every preset in H8.1).
- A failed check gives a reason: `closed` when its own gate is closed; otherwise `front steps` for `Step-free` when a `steps` transition leads to the entrance; otherwise `no route` (Requirement 6.5; test H6.5).
- The active route costs the same as the cheapest check that finds a route; when no check finds one, there is no active route (test H8.1).
- The Garden Entrance leads into the garden vestibule. No route cuts through an event room, except the Portrait Gallery while both of its doors are open (Requirements 1.3, 1.9; test H1.3b). The Garden Entrance route to Room 104 (67 s) stays longer than the ramp route (60 s), so the move route of the first release does not change (Requirement 1.8; test H1.8b).

## Always

- User-facing text is English.
- Room 104 is proposed only after `findRoute` confirms a step-free route to it (Requirement 4).
