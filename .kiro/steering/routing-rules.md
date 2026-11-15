---
inclusion: always
---

# Ghost Routes: routing rules

These rules come from `.kiro/specs/ghost-routes/requirements.md`. Every change to the app must keep them true.

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

## Always

- User-facing text is English.
- Room 104 is proposed only after `findRoute` confirms a step-free route to it (Requirement 4).
