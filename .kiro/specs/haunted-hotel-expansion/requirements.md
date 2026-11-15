# Requirements Document: Haunted Hotel Expansion

## Introduction

This spec extends Ghost Routes for the Kiroween Costume Contest. The Hollowmere Hotel grows from two floors to three, and the app gains three organizer scenarios that all run on the existing routing core:

1. **Closed door, same room.** A door of the Portrait Gallery is closed. The route detours through a different corridor to the same room.
2. **Lift out, move 204 → 104.** The original scenario, unchanged.
3. **Side Entrance closed.** The app checks the other entrances and finds a step-free alternative entrance, or says that there is none.

The released app at https://ghost-routes.pages.dev/ stays as it is until this work is approved. All work happens on the branch `feature/haunted-hotel-expansion`.

This spec builds on `.kiro/specs/ghost-routes/`. Where it does not say otherwise, that spec and the steering rules in `.kiro/steering/routing-rules.md` still hold.

## Glossary

- **Closure control**: an organizer button that closes one or more transitions, for example "Lift out of service".
- **Closure group**: the set of transitions one closure control closes together. The lift is one group made of two transitions, because the lift shaft now serves three floors.
- **Gate**: the transition that lets a visitor from the outdoor approach into the building through one entrance.
- **Detour**: an active route that differs from the baseline route, reaches the same room and uses only open transitions.
- **Divergence point**: the node where the active route first leaves the baseline route. The legs before it are shared by both routes.
- **Drawn ghost trail**: the part of the ghost trail the map draws dashed (Requirement 13).
- **Failure marker**: a lock with a short caption at the node where the baseline meets its first closed transition.
- **Added time**: active route cost minus baseline route cost, in seconds. Zero when the route is unchanged.
- **Entrance check**: the result of routing to the event room with every other entrance's gate closed. It tells whether the room can be reached through one named entrance.
- **No suitable route**: the state in which the event room is unreachable for the selected profile and no relocation candidate is reachable either (Requirement 7).
- **Scenario preset**: one of the three scenarios above, with its event room, its closure controls and its relocation candidates.
- **Focused floor**: the floor drawn large on the map. It is a view setting, not part of the route result.

Terms from the Ghost Routes spec (Graph, Transition, Profile, Route result, Baseline route, Ghost trail, Relocation candidate, Start) keep their meaning.

## Requirements

### Requirement 1: One graph for three floors

**User Story:** As an event organizer, I want one hotel with three floors, so that every route, detour and proposal comes from the same data.

#### Acceptance Criteria

1. THE SYSTEM SHALL describe Floors 1, 2 and 3 and the outdoor approach in one graph and SHALL compute every route with the existing `findRoute`.
2. THE graph SHALL keep on Floor 1 the forecourt, the Main Entrance with the front steps, the Side Entrance with the side ramp, the Grand Staircase, the lift, and Rooms 101 to 104.
3. THE graph SHALL add on Floor 1 a Garden Entrance, reached from the forecourt by a gravel path. Its level door opens into a garden vestibule, which is its own node. The vestibule has an exit to the east corridor and a separate door into Room 104 (Garden Hall).
4. THE graph SHALL keep on Floor 2 Rooms 201, 202, 203 and 204, and SHALL add the Portrait Gallery (Room 206). The gallery has two doors: one to the central corridor and one to the Gallery Walk, a second corridor along the south side of the floor. A west passage joins the two corridors. Room 205 (Card Room) opens onto the Gallery Walk.
5. THE graph SHALL add Floor 3 with the Library (Room 301) and the Moonlight Hall (Room 302). Both open onto the Floor 3 corridor, which the Grand Staircase and the lift reach.
6. WHEN no transition is closed THE SYSTEM SHALL find a route to every room for both profiles.
7. THE Step-free profile SHALL never use a `steps` or `stairs` transition on any floor.
8. THE SYSTEM SHALL keep the cost of the original routes unchanged: 125 s for Steps allowed to Room 204, 140 s for Step-free to Room 204, and 60 s for Step-free to Room 104 with the lift out, through the Side Entrance. The Garden Entrance route to Room 104 (67 s) SHALL NOT be shorter, so the move route of the first release stays the one the app shows.
9. WHEN both gallery doors are open THE SYSTEM MAY route through the Portrait Gallery, for example to Room 205.

### Requirement 2: The original scenario still works

**User Story:** As a judge who saw the first release, I want the first scenario to behave exactly as before, so that nothing I already verified has changed.

#### Acceptance Criteria

1. WHEN the page loads with no stored state THE SYSTEM SHALL show the lift outage scenario for Room 204 with the Step-free profile, as in the first release.
2. THE route summaries for Room 204 SHALL read "Main Entrance (front steps) → Grand Staircase" for Steps allowed and "Side Entrance (ramp) → Lift" for Step-free.
3. WHEN the lift is out of service AND the profile is Step-free THE status SHALL read exactly "No step-free route to Room 204. The lift is out of service."
4. WHEN the lift is out of service THE ghost trail SHALL end at the lift door on Floor 1, and Room 203 SHALL be rejected and Room 104 proposed.
5. AFTER the move THE status SHALL start with "Event moved to Room 104." and keyboard focus SHALL be on the heading "Directions to Room 104".
6. THE unit tests in `src/routing/hotel.test.ts` SHALL pass without edits.

### Requirement 3: Scenario presets and organizer actions

**User Story:** As an organizer, I want to pick a situation and close the matching door, so that I can see what each closure does.

#### Acceptance Criteria

1. THE SYSTEM SHALL offer three scenario presets: "Lift out, move to Room 104", "Gallery door closed" and "Side Entrance closed". THE default SHALL be the lift scenario.
2. WHEN the visitor picks a preset THE SYSTEM SHALL set the event room of that preset, open every transition, select the Step-free profile and clear any earlier move.
3. THE preset "Lift out, move to Room 104" SHALL offer one closure control: "Lift out of service". It closes the lift between Floors 1 and 2 and the lift between Floors 2 and 3 together.
4. THE preset "Gallery door closed" SHALL book the Portrait Gallery (Room 206) and SHALL offer three closure controls: "Close central door", "Close Gallery Walk door" and "Lift out of service".
5. THE preset "Side Entrance closed" SHALL book Room 204 and SHALL offer two closure controls: "Close Side Entrance" and "Close Garden Entrance".
6. EACH closure control SHALL be a toggle button with `aria-pressed`, and SHALL open and close all transitions of its group together.
7. THE SYSTEM SHALL keep the scenario, the profile, the closed transitions and the event room in session storage only, and SHALL accept a state saved by the first release.
8. WHEN the visitor presses Reset THE SYSTEM SHALL restore the default scenario with nothing closed.

### Requirement 4: A closed door with a detour to the same room

**User Story:** As an organizer, I want to see that closing one door of the gallery does not lose the room, so that I can send guests the other way.

#### Acceptance Criteria

1. WHEN the visitor closes the central door of the Portrait Gallery THE SYSTEM SHALL recompute the route to Room 206 for the selected profile.
2. THE detour SHALL reach Room 206 through the Gallery Walk door. It SHALL leave the central corridor, pass the west passage and the Gallery Walk, and SHALL NOT use the closed door.
3. THE ghost trail SHALL be the baseline route up to the central corridor on Floor 2 and SHALL end there, before the closed door. The detour shares all of these legs, so the drawn ghost trail is empty and a failure marker "Door closed" marks the central door (Requirement 13.3).
4. THE status SHALL be "The central door to the Portrait Gallery is closed. Your route to Room 206 is still open via <summary>. It adds <time>." where <summary> names the entrance, each floor change and the Gallery Walk, and <time> is the added time. For the Step-free profile it SHALL read "Side Entrance (ramp) → Lift → Gallery Walk" and "1 min 11 s".
5. WHEN the added time is zero THE SYSTEM SHALL leave out the sentence "It adds <time>."
6. THE text directions SHALL list the detour legs in the order they are drawn, and SHALL NOT mention the closed door.
7. WHEN the central door is open again THE SYSTEM SHALL return to the direct route and remove the ghost trail.

### Requirement 5: Lift failure and the move from Room 204 to Room 104

**User Story:** As an organizer, I want the lift outage to keep working across three floors, so that I can still move the workshop to a room my cart reaches.

#### Acceptance Criteria

1. WHEN the visitor presses "Lift out of service" THE SYSTEM SHALL close both lift transitions, and SHALL show a lock at the lift on every floor.
2. WHILE the lift is closed AND the profile is Steps allowed THE SYSTEM SHALL keep the Grand Staircase route to Room 204, and SHALL still reach Rooms 301 and 302 by the stairs.
3. WHILE the lift is closed AND the profile is Step-free THE SYSTEM SHALL NOT reach any room above Floor 1.
4. THE relocation candidates for Room 204 SHALL stay Room 203, then Room 104, checked in that order with the same profile and closures.
5. THE relocation candidates for Room 206 SHALL be Room 302 (Moonlight Hall), then Room 301 (Library), checked in that order with the same profile and closures.
6. THE SYSTEM SHALL propose only the first candidate that has a route in the selected profile, and SHALL show every candidate that was checked.
7. THE SYSTEM SHALL confirm a move only to the verified proposal.
8. WHEN the move is confirmed THE SYSTEM SHALL recompute the route to the new room, draw it solid, announce "Event moved to <room>." with the new route status, and move focus to the directions heading.

### Requirement 6: The Side Entrance closes and an alternative entrance is verified

**User Story:** As an organizer, I want to know which other entrance my cart can use, so that I do not send the crew to a door with steps.

#### Acceptance Criteria

1. WHEN the visitor closes the Side Entrance THE SYSTEM SHALL close its gate transition and SHALL recompute the route to Room 204 for the selected profile.
2. THE ghost trail SHALL follow the baseline route up the side ramp and SHALL end at the Side Entrance, before the closed door. The routes part at the forecourt, so the whole trail (path and ramp) is drawn dashed.
3. THE SYSTEM SHALL run an entrance check for the Main Entrance, the Side Entrance and the Garden Entrance, with the selected profile and the current closures, and SHALL list the three results.
4. THE entrance check SHALL be one `findRoute` call per entrance, made with the gates of the other two entrances closed in addition to the current closures.
5. THE list SHALL give a reason for every entrance without a route: "closed" for a closed gate, and "front steps" for the Main Entrance when the profile is Step-free.
6. FOR the Step-free profile with only the Side Entrance closed THE SYSTEM SHALL route through the Garden Entrance and the garden vestibule, and SHALL read "The Side Entrance is closed. Your route to Room 204 is still open via Garden Entrance (level) → Lift. It adds 25 s."
7. THE route through the Garden Entrance SHALL be the one the map draws and the text lists, and the entrance in the guest text SHALL be "Garden Entrance (level, step-free)".
8. WHILE any entrance gate is closed THE SYSTEM SHALL show the entrance check list.

### Requirement 7: No suitable route

**User Story:** As an organizer, I want a clear answer when nothing works, so that I know to reopen something or change the plan, and the app never invents a route.

#### Acceptance Criteria

1. THE state "no suitable route" SHALL hold when the event room is unreachable for the selected profile AND no relocation candidate is reachable for that profile.
2. IN that state THE SYSTEM SHALL show the text "No step-free alternative found." for the Step-free profile, and "No alternative found." for Steps allowed.
3. IN that state THE SYSTEM SHALL NOT show a confirm button, SHALL NOT draw an active route, and SHALL show "There is no step-free route to <room> right now." in the directions area.
4. IN that state THE SYSTEM SHALL still draw the ghost trail up to the first closed transition of the baseline route, and SHALL show the lock icons on the closed transitions.
5. IN that state THE status SHALL start with "No step-free route to <room>." (or "No route to <room>." for Steps allowed) followed by the reason of every closed transition, each once, in the order of the preset's closure controls.
6. WHEN the other profile still reaches the event room THE SYSTEM SHALL say so with that route's summary, for example "Steps allowed still reaches Room 204 via Main Entrance (front steps) → Grand Staircase."
7. THE state SHALL be reachable in the app by two sequences: close the Side Entrance and the Garden Entrance (Room 204), and close both gallery doors and the lift (Room 206).
8. WHEN one closure control is toggled off THE SYSTEM SHALL leave the state and recompute.
9. A state in which the event room is unreachable but a candidate is reachable SHALL NOT be called "no suitable route". IT SHALL show the proposal of Requirement 5.

### Requirement 8: One route result for map and text, and floor-aware steps

**User Story:** As a visitor, I want the map and the written steps to agree on all three floors, and I want a step to take me to its floor.

#### Acceptance Criteria

1. THE SYSTEM SHALL call `planScenario` once per render and SHALL give the same `plan.route` to every floor plan, to the status, to the text directions and to the guest text.
2. THE floor plans and the text SHALL NOT call `findRoute`.
3. THE text directions SHALL cover every leg of the route exactly once and in order.
4. THE SYSTEM SHALL merge consecutive legs of one lift or one staircase into a single step, for example "Take the lift up to Floor 3."
5. THE SYSTEM SHALL start a new step at every entrance, for example "Walk to the Garden Entrance. Level entrance, no steps."
6. EACH step SHALL have a floor: the floor where its legs end.
7. WHEN the visitor selects a step THE SYSTEM SHALL make that step's floor the focused floor, SHALL mark the step with `aria-current="step"`, and SHALL highlight that step's legs on the map.
8. THE SYSTEM SHALL draw one active route and at most one drawn ghost trail at a time.

### Requirement 9: Floor switcher and layout

**User Story:** As a visitor on a laptop or a phone, I want to see all three floors and read the one that matters, so that I do not lose the route.

#### Acceptance Criteria

1. THE SYSTEM SHALL show a floor switcher with three entries (Floor 1, Floor 2, Floor 3). EACH entry SHALL show a small plan with its route, ghost trail and locks, and SHALL say in text which of these the floor has.
2. THE focused floor SHALL be drawn large under the switcher.
3. THE switcher SHALL be a tab list: arrow keys move between floors, Home and End go to the first and last floor, and the selected floor has `aria-selected="true"`.
4. WHEN the route, the ghost trail or a closure changes THE SYSTEM SHALL NOT change the focused floor unless the visitor selects a floor or a step.
5. WHERE the viewport is at least 960 px wide THE SYSTEM SHALL show three columns: scenario, organizer action and block status on the left, the floor switcher and map in the middle, and the guest steps on the right.
6. WHERE the viewport is under 960 px THE SYSTEM SHALL stack them in this order: scenario, route comparison, organizer action, block status, floor switcher, map, guest steps.
7. AT 390 px width THE page SHALL NOT scroll sideways and the floor switcher SHALL fit in one row.
8. WHEN the focused floor changes THE SYSTEM SHALL announce "Showing Floor <n>." in a polite live region that is separate from the route status.

### Requirement 10: Motion

**User Story:** As a visitor, I want the changes to be easy to follow, and I want no motion if I ask for none.

#### Acceptance Criteria

1. WHEN a closure turns an old route into a ghost trail THE SYSTEM SHALL change the line from solid to dashed in 0.5 s.
2. WHEN a detour exists THE SYSTEM SHALL draw it from the point where it leaves the old route, in 0.9 s, starting 0.45 s after the closure.
3. WHEN the visitor confirms a move THE SYSTEM SHALL light the door of the new room with a local glow that pulses twice in 3.2 s and then stays as a steady ring.
4. THE animations SHALL run only when the plan changes. Changing the focused floor or selecting a step SHALL NOT replay them.
5. THE status text, focus and live regions SHALL update at once and SHALL NOT wait for an animation.
6. WHERE the visitor prefers reduced motion THE SYSTEM SHALL show the same three states at once, with no animation and no smooth scrolling.
7. THE meaning of each state SHALL NOT depend on motion or on color alone: a dashed line, a lock, a ghost icon, a ring and text carry it.

### Requirement 11: Look and feel

**User Story:** As a judge, I want a fictional hotel with a Halloween mood that stays readable.

#### Acceptance Criteria

1. THE floor plans SHALL use a cream background, burgundy walls and large room numbers.
2. EACH floor SHALL have its own original carpet pattern drawn in SVG: nested hexagons on Floor 1, lantern diamonds on Floor 2 and crescent moons on Floor 3.
3. THE lit door of a moved event SHALL use a local warm glow and SHALL NOT dim or tint the rest of the plan.
4. THE SYSTEM SHALL use no copyrighted artwork, fonts or images, and no external requests.
5. TEXT SHALL meet a contrast ratio of at least 4.5 to 1, and every control SHALL keep a visible focus indicator.
6. ALL interface text SHALL be in English.

### Requirement 12: Safe release

**User Story:** As the owner, I want the public demo to stay on the current release until I approve the new one.

#### Acceptance Criteria

1. THE work SHALL stay on the branch `feature/haunted-hotel-expansion` and SHALL NOT be pushed to `main` before approval.
2. THE branch SHALL build with `npm run build` and SHALL keep the pinned Node.js version.
3. BEFORE merge THE branch SHALL pass `npm test`, `npm run test:routing`, the unchanged `src/routing/hotel.test.ts`, and `npm run test:e2e` on desktop and on a 390 px phone.
4. THE project SHALL record the browser checks of the new scenarios in `docs/kiro-usage.md` with the client and the build they ran on.

### Requirement 13: Drawing the ghost trail beside a detour

**User Story:** As an organizer, I want to see the part of the old route that I can no longer use, without a dashed line on top of the route I can still use.

#### Acceptance Criteria

1. WHEN a detour exists THE SYSTEM SHALL draw the legs shared by the old and the new route once, as one solid line. THE drawn ghost trail SHALL start at the divergence point and SHALL end at the node before the first closed transition.
2. THE drawn ghost trail SHALL be a part of the ghost trail of the Ghost Routes spec (Requirement 3 there). It SHALL NOT include the first closed transition or any leg after it.
3. WHEN the divergence point is the node before the first closed transition (the new route turns away right at the closed door) THE drawn ghost trail SHALL be empty, and THE SYSTEM SHALL show the failure marker there with its caption, for example "Door closed".
4. WHEN there is no active route THE SYSTEM SHALL draw the whole ghost trail from the start up to the blockage, as in the first release.
5. WHENEVER a ghost trail exists THE SYSTEM SHALL show the failure marker at its end, with the caption of the closed transition: "Lift out of service", "Door closed", "Side Entrance closed" or "Garden Entrance closed".
6. WHEN the baseline route uses no closed transition THE SYSTEM SHALL show neither a ghost trail nor a failure marker.
