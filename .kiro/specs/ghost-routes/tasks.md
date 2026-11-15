# Implementation Plan

- [x] 1. Set up a reproducible project
  - Scaffold React + TypeScript + Vite; pin Node.js in `.nvmrc` and `engines`; commit `package-lock.json`.
  - Add scripts `build`, `preview`, `test`, `test:routing`, `test:e2e`.
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Build the routing core
  - [x] 2.1 Define graph, route and profile types in `src/routing/types.ts`.
    - _Requirements: 1.3_
  - [x] 2.2 Implement `findRoute` (Dijkstra) with a single traversability rule for profiles and closures.
    - _Requirements: 1.3, 1.5, 2.6_
  - [x] 2.3 Implement `ghostTrail` that stops before the first closed leg of the baseline.
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  - [x] 2.4 Implement `checkCandidates` for verified relocation.
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 2.5 Write property tests P1–P5 with fast-check on random graphs.
    - _Requirements: 1.5, 2.6, 2.7, 3.2, 3.3, 4.1, 4.2_

- [x] 3. Model The Hollowmere Hotel
  - [x] 3.1 Add the two-floor graph with the stairs route, the ramp + lift route and Rooms 101–104, 201–205.
    - _Requirements: 1.1, 1.2_
  - [x] 3.2 Add the floor layouts (walls, rooms, carpet) for the SVG plans.
    - _Requirements: 8.1_
  - [x] 3.3 Unit-test both routes to Room 204, the lift outage per profile, the ghost end at the Floor 1 lift door and the Room 104 proposal.
    - _Requirements: 1.1, 1.2, 2.2, 2.3, 3.2, 4.2_

- [x] 4. Plan the scenario
  - [x] 4.1 Implement `planScenario` that returns one `ScenarioPlan` (route, ghost, proposal, comparison, status).
    - _Requirements: 2.1, 2.3, 4.1, 6.1_
  - [x] 4.2 Implement `buildDirections` and `buildGuestText` from the route result.
    - _Requirements: 5.2, 5.4, 6.2_
  - [x] 4.3 Implement the reducer (set profile, toggle lift, confirm move, reset) with sessionStorage persistence and validation.
    - _Requirements: 5.1, 7.1, 7.2, 7.3, 7.4_

- [x] 5. Build the interface
  - [x] 5.1 Render two floor plans from the plan: solid route, dashed ghost, lock icon, markers, floor-change badges.
    - _Requirements: 2.4, 3.4, 5.2, 8.1_
  - [x] 5.2 Add route comparison, lift toggle, reset, live status, proposal with confirm.
    - _Requirements: 1.4, 2.3, 2.5, 4.3, 4.4, 5.3, 7.3_
  - [x] 5.3 Add text directions with copy and a selectable fallback.
    - _Requirements: 5.4, 5.5, 6.2_
  - [x] 5.4 Responsive layout and keyboard focus styles.
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 6. Verify the built app
  - [x] 6.1 Playwright scenario on `npm run preview`: both routes to 204, lift out, ghost trail, proposal, move to 104, copy, reset; desktop and phone viewports; keyboard only.
    - _Requirements: 1.4, 2.3, 2.5, 3.1, 4.2, 5.1, 5.3, 5.4, 7.3, 8.2, 8.3_
  - [x] 6.2 Document clean-clone setup in `README.md`.
    - _Requirements: 9.2_
