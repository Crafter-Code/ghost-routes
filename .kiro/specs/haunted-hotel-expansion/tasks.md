# Implementation Plan: Haunted Hotel Expansion

Nothing here starts until the floor plans in `design.md` are approved. All work happens on `feature/haunted-hotel-expansion`. `main` and the public demo stay on the current release.

Test names start with `H<requirement>.<criterion>`, for example `H4.3 ghost trail ends at the central corridor`. Unit tests go in `src/routing/expansion.test.ts`, properties in `src/routing/route.property.test.ts`, browser checks in `e2e/`. `src/routing/hotel.test.ts` is not edited.

- [x] 0. Guard the release
  - [x] 0.1 Run `npm test` and `npm run test:e2e` on the branch before any change and record the result (baseline: 21 unit tests, e2e 7 passed and 1 skipped).
    - Done: 21 passed; e2e 7 passed, 1 skipped (keyboard test is desktop-only).
    - _Requirements: 12.1, 12.3_
  - [x] 0.2 Keep a copy of the first release's `hotel.test.ts` result in the task log. Any later edit to that file is a failed task.
    - Done: git blob `3593b25f` before and after this stage; 16 of 16 pass.
    - _Requirements: 2.6_

- [x] 1. Extend the graph
  - [x] 1.1 Change `FloorId` to `1 | 2 | 3` and add `via?: string` to `GraphEdge` in `src/routing/types.ts`.
    - _Requirements: 1.1_
  - [x] 1.2 Add the nodes and transitions listed in `design.md` to `src/routing/hotel.ts`: Garden Entrance, garden vestibule, Portrait Gallery, west passage, Gallery Walk, Floor 3, `grand-staircase-upper`, `lift-upper`. Move `room-205` onto the Gallery Walk. Export `LIFT_EDGES`, `ENTRANCE_GATES` and the candidates for `room-206`.
  - [x] 1.2b Test the vestibule and that no route cuts through an event room other than the gallery.
    - Tests `H1.3`, `H1.3b`, `H1.8b` (the Garden Entrance is not a shortcut to Room 104), `H1.9` (gallery as a through room).
    - _Requirements: 1.3, 1.8, 1.9_
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [x] 1.3 Test: with nothing closed, every room has a route for both profiles.
    - Test `H1.6 every room is reachable for both profiles`.
    - _Requirements: 1.6_
  - [x] 1.4 Test: Step-free routes to every room contain no `steps` or `stairs` edge.
    - Test `H1.7 step-free uses no steps or stairs on any floor`.
    - _Requirements: 1.7_
  - [x] 1.5 Test: original costs are unchanged.
    - Test `H1.8 original routes keep their cost`: 125 s, 140 s and 60 s (Room 104 with the lift out).
    - _Requirements: 1.8, 2.2_

- [x] 2. Keep the original scenario
  - [x] 2.1 Test the original scenario on the new graph, with the same expectations as the first release: both route summaries, the exact blocked message, ghost trail ending at `lift-1`, Room 203 rejected and Room 104 proposed, status after the move.
    - Tests `H2.1 default state is the lift scenario for Room 204`, `H2.2 route summaries`, `H2.3 blocked message`, `H2.4 ghost ends at lift-1 and 104 is proposed`, `H2.5 status after the move`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 2.2 Run `src/routing/hotel.test.ts` unchanged and require it to pass.
    - _Requirements: 2.6_
  - [x] 2.3 Test: closing only `lift` (not the group) still gives the first release's result.
    - Test `H5.1b closing only the lower lift segment behaves as in the first release`.
    - _Requirements: 2.6, 5.1_

- [x] 3. Scenario presets and state
  - [x] 3.1 Add `src/routing/scenarios.ts` with the three presets, their closure controls and `initialStateFor`.
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [x] 3.2 Add `scenario` to `ScenarioState`; add the actions `set-scenario` and `toggle-closure`; keep `toggle-lift` as an alias; make `parseStoredState` accept a first-release state and reject unknown scenarios, foreign edges and foreign rooms.
    - _Requirements: 3.2, 3.6, 3.7, 3.8_
  - [x] 3.3 Tests: `H3.1 default preset is lift`, `H3.2 picking a preset resets room, closures, profile and move`, `H3.6 a control opens and closes its whole group`, `H3.7 a first-release state loads`, `H3.7b a state with a foreign edge falls back to the initial state`, `H3.8 reset restores the default`.
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 3.8_

- [x] 4. Plan additions
  - [x] 4.1 In `planScenario`, add `addedSeconds`, `divergeAt`, `closedReasons`, `otherProfile` and the status sentences ("It adds <time>.", reasons list).
    - _Requirements: 4.4, 4.5, 7.5, 7.6_
  - [x] 4.2 Add `entranceChecks` to the plan with one `findRoute` call per entrance and the other gates closed.
    - _Requirements: 6.3, 6.4, 6.5_
  - [x] 4.3 Let the proposal appear for either profile whenever the route is missing.
    - _Requirements: 5.6, 7.9_
  - [x] 4.4 Closed door with a detour: tests `H4.1 central door closed recomputes the route`, `H4.2 detour uses the Gallery Walk door and no closed edge`, `H4.3 ghost trail ends at corridor-2-mid`, `H4.4 status and added time (1 min 11 s)`, `H4.5 no added-time sentence when the cost is unchanged`, `H4.7 reopening the door removes the detour and the ghost`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  - [x] 4.5 Lift failure: tests `H5.1 lift control closes both segments`, `H5.2 steps allowed still reaches 204, 301 and 302`, `H5.3 step-free reaches nothing above Floor 1`, `H5.4 candidates for 204 are 203 then 104`, `H5.5 candidates for 206 are 302 then 301`, `H5.6 the proposal is the first reachable candidate in the selected profile`, `H5.7 only the verified proposal can be confirmed`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 4.6 Side Entrance: tests `H6.1 closing the Side Entrance closes side-door`, `H6.2 ghost ends at side-entrance after the ramp`, `H6.3 entrance check lists three entrances`, `H6.5 reasons are closed and front steps`, `H6.6 step-free route goes through the Garden Entrance, +25 s`, `H6.7 guest text names the Garden Entrance (level, step-free)`.
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_
  - [x] 4.7 No suitable route: tests `H7.1 unreachable room and unreachable candidates is the no-suitable-route state` for C2 and A3, `H7.2 texts for both profiles`, `H7.3 no confirm and no active route`, `H7.4 ghost and locks remain`, `H7.5 reasons in control order, each once`, `H7.6 other-profile hint`, `H7.9 a reachable candidate is a proposal, not this state` for A2 and B1.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9_

- [x] 5. Directions with floors
  - [x] 5.1 In `directions.ts`: start a new step at each entrance, merge consecutive lift or stair legs, add `floor` to steps, list `via` once in `routeSummary`, write "level" entrances in the summary and the guest text.
    - _Requirements: 6.6, 6.7, 8.4, 8.5, 8.6_
  - [x] 5.2 Tests: `H8.3 directions cover every leg once and in order` for every scenario row of the table, `H8.4 one step for the lift from Floor 1 to Floor 3`, `H8.5 a step ends at the Garden Entrance`, `H8.6 each step has the floor of its last leg`, `H4.6 the detour text lists the Gallery Walk and not the closed door`.
    - _Requirements: 4.6, 8.3, 8.4, 8.5, 8.6_

- [x] 6. Properties and exhaustive check
  - [x] 6.1 Add fast-check properties to `src/routing/route.property.test.ts`, each named with its requirement.
    - Done: P6 (closure groups) and P7 (drawn ghost trail). The hotel-specific checks planned as P8 to P10 run over every preset in 6.2 instead (see `design.md`, Correctness properties).
    - _Requirements: 3.6, 7.8, 13.1, 13.2, 13.3_
  - [x] 6.2 Add `H8.1 map and text share one route result`: for every preset, every subset of its controls and both profiles, `plan.route` is the same object as `plan.comparison[profile]`, no closed edge is in the route, Step-free has no steps or stairs, the ghost is a prefix of the baseline, and any proposal is reachable in the selected profile.
    - _Requirements: 8.1, 8.2, 8.3, 8.8_
  - [x] 6.3 Add a source check: no file under `src/map/` or `src/components/` contains `findRoute`.
    - Test `H8.2 components do not route`.
    - _Requirements: 8.2_
  - [x] 6.4 Run `npm run test:routing` and keep any fast-check counterexample and seed as a regression test.

- [x] 6b. Ghost trail beside a detour (data)
  - [x] 6b.1 Add `divergeIndex` and `drawnGhostLegs` to `src/routing/route.ts`, and `divergeAt`, `ghostDrawn` and `failure` to the plan.
    - Tests `H13.1` to `H13.5`, property P7.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  - [x] 6b.2 Keep the released map working with the two lift segments: one lock per node in `src/map/FloorPlan.tsx` (both segments touch the Floor 2 lift door).
    - e2e `scenario.spec.ts` passes unchanged.
    - _Requirements: 2.1, 12.3_

- [x] 7. Floor plans
  - [x] 7.1 Add the three layouts to `src/map/layout.ts` with the rooms, doors, stairs and lift from the sketches, a per-floor viewBox (Floor 2 is taller) and door shapes with `edgeId`.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 11.1_
  - [x] 7.1b Align the node coordinates in `hotel.ts` with the drawings, and test it: `src/map/layout.test.ts` (every walking line crosses walls only through a door gap of its own edge; room and corridor nodes sit inside their shapes).
    - _Requirements: 1.1, 8.1_
  - [x] 7.2 In `FloorPlan.tsx`: three carpet patterns, locks at door shapes, a `compact` mode, highlighted step legs, `floor-N-mini` test ids. Draw `plan.ghostDrawn` (not `plan.ghost`) dashed, shared legs once as the solid route, and `plan.failure` as a lock with its caption.
    - _Requirements: 8.7, 8.8, 9.1, 11.2, 13.1, 13.3, 13.5_
  - [x] 7.3 Check the plans by eye against the sketches on desktop and at 390 px before building more UI. Record the result.

- [x] 8. Interface
  - [x] 8.1 `ScenarioPicker`, generic closure controls, entrance check list, no-suitable-route panel, proposal for either profile.
    - _Requirements: 3.1, 3.6, 6.8, 7.2, 7.3_
  - [x] 8.2 `FloorSwitcher` as a tab list with mini plans, chips and a separate polite live region.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.8_
  - [x] 8.3 `Directions` as step buttons with `aria-current="step"`; `App` keeps `focusedFloor` and `selectedStep`; selecting a step switches the floor.
    - _Requirements: 8.7, 9.4_
  - [x] 8.4 Desktop three-column layout and phone stack in `index.css`.
    - _Requirements: 9.5, 9.6, 9.7_

- [x] 9. Motion and look
  - [x] 9.1 Keyframes for the three states, keyed by plan signature, with the reduced-motion rules and instant scroll.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [x] 9.2 Tokens `--glow`, `--glow-soft`, the lit door ring and glow, and a contrast check of the new text styles.
    - _Requirements: 10.7, 11.3, 11.4, 11.5_

- [x] 10. Browser checks
  - [x] 10.1 Edit `e2e/scenario.spec.ts` only to switch floors before checking Floor 2 items. Run it on desktop and phone. The original scenario 204 → lift out → ghost trail → 104 → copy → reset must pass.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.3_
  - [x] 10.2 Add `e2e/expansion.spec.ts`:
    - gallery: close the central door, check the detour text, the dashed ghost and the solid detour, then close the second door and confirm the proposal for Room 302;
    - lift in the gallery scenario: close both doors and the lift, check "No step-free alternative found." and that no confirm button exists;
    - entrance: close the Side Entrance, check the Garden Entrance route and the entrance list, then close the Garden Entrance and check the no-route state and the other-profile hint;
    - select a step and check the floor changes and `aria-current`;
    - 390 px: no sideways scroll, switcher in one row, steps under the map;
    - keyboard: tab list arrows, Home and End, step buttons, closure toggles with Space;
    - reduced motion: with `emulateMedia({ reducedMotion: 'reduce' })` the animated layers report `animation-name: none` and show the final dash and draw state.
    - _Requirements: 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.5, 6.6, 7.7, 8.7, 9.3, 9.7, 10.6_
  - [x] 10.3 Run the Playwright MCP QA in Kiro CLI on the local production build: the detour to Room 206 and the move from 204 to 104. Screenshots in `docs/evidence/mcp/` (`mcp-5` to `mcp-7`). The 390 px checks run in Playwright (`e2e/expansion.spec.ts`); a separate MCP prompt file was not added.
    - _Requirements: 12.4_

- [x] 9b. Phone layout
  - [x] 9b.1 Under 760 px render the compact block (scenario, closures, short status), then the map, then the move options, the comparison and the steps, in DOM order.
    - e2e: the order of boxes, the focus order, the move options below the map, no sideways scroll in every state.
    - _Requirements: 9.6, 9.7_

- [ ] 11. Docs and release
  - [x] 11.1 Update the steering files for closure groups and entrance gates, `README.md` for the three scenarios, and `docs/kiro-usage.md` with the client, the build and the results.
    - Done: `routing-rules.md` rules 4 and 5 and the drawing note in rule 3; `routing-code.md`; `README.md`; `docs/kiro-usage.md`.
    - _Requirements: 12.4_
  - [ ] 11.2 Open a preview build of the branch (not production) and check it without a login.
    - _Requirements: 12.1, 12.2_
  - [ ] 11.3 Ask for approval. Merge to `main` only after a yes.
    - _Requirements: 12.1_
