# Requirements Document

## Introduction

Ghost Routes is a responsive web app for desktop and mobile browsers. It plans routes inside The Hollowmere Hotel, a fictional two-floor hotel, for event organizers who move people and heavy equipment.

The demo story: a workshop organizer has booked Room 204 on Floor 2. Their crew brings heavy equipment on a cart, so they need a step-free route. The app shows the two routes to Room 204, what happens when the lift goes out of service, where the old route now fails (the ghost trail), and a verified move of the event to Room 104.

All routing runs in the browser from one graph. No account, no server state.

## Glossary

- **Graph**: the single set of nodes (places) and transitions (edges) that describes both floors and the outdoor approach.
- **Transition**: an edge between two nodes. Kinds: `walk`, `ramp`, `steps`, `stairs`, `lift`.
- **Closed transition**: a transition that is out of service and cannot be used by any profile.
- **Profile**: the visitor's movement needs. `Steps allowed` may use every open transition. `Step-free` may not use `steps` or `stairs`.
- **Route result**: the output of one routing call: found or not found, the ordered nodes and legs, and the cost.
- **Baseline route**: the route for the same profile and target with no closed transitions.
- **Ghost trail**: the part of the baseline route that is still walkable, drawn dashed, ending before the first closed transition.
- **Relocation candidate**: an event room that the hotel offers as an alternative to the booked room, in a fixed preference order.
- **Start**: the hotel forecourt, outside both entrances.

## Requirements

### Requirement 1: Two routes to Room 204 from one graph

**User Story:** As an event organizer, I want to compare the stairs route and the step-free route to Room 204, so that I know how guests and my equipment crew each get there.

#### Acceptance Criteria

1. WHEN the profile is `Steps allowed` AND no transition is closed THE SYSTEM SHALL route from the forecourt to Room 204 through the Main Entrance front steps and the Grand Staircase.
2. WHEN the profile is `Step-free` AND no transition is closed THE SYSTEM SHALL route from the forecourt to Room 204 through the Side Entrance ramp and the lift.
3. THE SYSTEM SHALL compute both routes with the same routing function over the same graph, differing only in the profile.
4. THE SYSTEM SHALL show a summary of both routes to the event room at the same time, so the visitor can compare them and switch profile from that summary.
5. WHEN the profile is `Step-free` THE SYSTEM SHALL never include a `steps` or `stairs` transition in the route.

### Requirement 2: Lift out of service

**User Story:** As an event organizer, I want to mark the lift as out of service, so that I can see who can still reach my room.

#### Acceptance Criteria

1. WHEN the visitor marks the lift out of service THE SYSTEM SHALL treat the lift transition as closed and recompute the route for the current profile.
2. WHILE the lift is closed AND the profile is `Steps allowed` THE SYSTEM SHALL keep the route to Room 204 through the Grand Staircase.
3. WHILE the lift is closed AND the profile is `Step-free` AND no step-free route to Room 204 exists THE SYSTEM SHALL show the message `No step-free route to Room 204. The lift is out of service.`
4. WHILE the lift is closed THE SYSTEM SHALL show a lock icon at the lift on both floor plans.
5. WHEN the route status changes THE SYSTEM SHALL announce the new status text to screen readers through a polite live region.
6. THE SYSTEM SHALL build every active route only from open transitions.
7. IF a target is unreachable THEN closing one more transition SHALL NOT make it reachable.

### Requirement 3: Ghost trail

**User Story:** As an event organizer, I want to see where my usual route now breaks, so that I can explain the problem to my crew.

#### Acceptance Criteria

1. WHEN the baseline route contains a closed transition THE SYSTEM SHALL draw a ghost trail along the baseline route from the start.
2. THE ghost trail SHALL end at the node just before the first closed transition of the baseline route. For the lift outage this is the closed lift door on Floor 1.
3. THE ghost trail SHALL NOT include the first closed transition or any leg after it.
4. THE SYSTEM SHALL draw the ghost trail dashed and the active route solid, so the two are distinct without color alone.
5. WHEN the baseline route contains no closed transition THE SYSTEM SHALL NOT draw a ghost trail.

### Requirement 4: Verified relocation proposal

**User Story:** As an event organizer, I want the app to suggest a room my cart can still reach, so that I can move the event with confidence.

#### Acceptance Criteria

1. WHEN the profile is `Step-free` AND no route to the event room exists THE SYSTEM SHALL check each relocation candidate in preference order with the same routing function, profile and closed transitions.
2. THE SYSTEM SHALL propose only the first candidate that has a route. For the lift outage the candidates are Room 203, then Room 104, and the proposal is Room 104.
3. THE SYSTEM SHALL NOT propose a candidate without a route, and SHALL tell the visitor which candidates were checked and rejected.
4. IF no candidate has a route THEN THE SYSTEM SHALL say that no step-free alternative was found and SHALL NOT show a confirm button.

### Requirement 5: Confirm the move to Room 104

**User Story:** As an event organizer, I want to confirm the move and share new directions, so that guests and the crew arrive at the right room.

#### Acceptance Criteria

1. WHEN the visitor confirms the proposal THE SYSTEM SHALL set the event room to Room 104 and recompute the route.
2. AFTER the move THE SYSTEM SHALL draw the route to Room 104 as a solid line and update the text directions from the same route result.
3. AFTER the move THE SYSTEM SHALL announce `Event moved to Room 104.` together with the new route status, and SHALL move keyboard focus to the directions heading.
4. THE SYSTEM SHALL let the visitor copy guest directions that contain the entrance, the floor and the numbered steps.
5. IF the clipboard is not available THEN THE SYSTEM SHALL show the guest directions as selectable text.

### Requirement 6: One route result for map and text

**User Story:** As a visitor, I want the map and the written steps to always agree, so that I can trust either one.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute one route result per render and pass that same object to the floor plans and to the text directions.
2. THE text directions SHALL list exactly the legs drawn on the map, in the same order.

### Requirement 7: Reset and per-visitor session

**User Story:** As a judge, I want to run the scenario again without affecting other judges, so that every test starts clean.

#### Acceptance Criteria

1. THE SYSTEM SHALL work without registration or login.
2. THE SYSTEM SHALL store the scenario state (profile, closed transitions, event room) in the visitor's browser session storage only.
3. WHEN the visitor presses Reset THE SYSTEM SHALL restore the initial state: Room 204, all transitions open, `Step-free` profile.
4. IF the stored state is missing or invalid THEN THE SYSTEM SHALL start from the initial state.

### Requirement 8: Layout and accessibility

**User Story:** As a visitor on a laptop or a phone, I want a clear, readable plan, so that I can follow the scenario on any screen.

#### Acceptance Criteria

1. THE SYSTEM SHALL show two floor plans with a cream background, burgundy walls and large room numbers.
2. WHERE the viewport is at least 960 px wide THE SYSTEM SHALL show the text steps beside the floor plans; otherwise under them.
3. THE SYSTEM SHALL make every control reachable and operable by keyboard, with a visible focus indicator.
4. THE SYSTEM SHALL use English for all interface text.

### Requirement 9: Reproducible build

**User Story:** As a judge or contributor, I want the app to build the same way from a clean clone.

#### Acceptance Criteria

1. THE repository SHALL pin the Node.js version in `.nvmrc` and `package.json` `engines`, and SHALL include `package-lock.json`.
2. WHEN a contributor runs `npm ci`, `npm run build` and `npm run preview` in a clean clone THE SYSTEM SHALL serve the built app.
3. THE repository SHALL provide `npm run test:routing` for the routing tests.
