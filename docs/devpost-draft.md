# Devpost draft: Ghost Routes (Kiroween 2026, Costume Contest)

Copy each section into the matching Devpost field. Text in `[brackets]` is a placeholder for a link that does not exist yet.

## Links

- Live demo: https://ghost-routes.pages.dev/
- Code (MIT): https://github.com/Crafter-Code/ghost-routes
- Demo video (YouTube, public): `[YOUTUBE URL, to be added after upload]`

## Tagline

Step-free routing for a haunted hotel: see where your route broke, and the way round.

## Inspiration / the problem

Event organizers book rooms. Then a lift stops or a door is locked.

A workshop is booked on the second floor, and the crew brings heavy equipment on a cart, so they need a route without steps. When the lift goes out or a door closes, the booking is still there, but the route to it may be gone, or longer, or start at a different entrance. Most maps show only the route that works now. They do not show what changed, so the organizer works out by hand where the usual route fails, whether there is a way round, and which room the cart can still reach.

Ghost Routes is for event organizers, venue staff, and anyone who moves a wheelchair, pram, or cart through a building: people who need a step-free route and need to know when it changes.

## What it does

Ghost Routes plans routes inside The Hollowmere Hotel, a fictional three-floor hotel. Pick one of three situations, close a transition, and the map, the status and the guest directions change together.

1. **Gallery door closed (Room 206).** The central door of the Portrait Gallery closes. The app finds the way round to the same room: along the west passage and the Gallery Walk to the gallery's south door, 1 min 11 s longer. The closed door is marked "Door closed". Close the second door too and the app offers the Moonlight Hall on Floor 3 instead.
2. **Lift out, move 204 → 104.** With the lift out of service there is no step-free route to Room 204: "No step-free route to Room 204. The lift is out of service." The old route turns into a dashed ghost trail that stops at the lift door on Floor 1. Room 203 is checked and rejected, Room 104 is checked and confirmed, and one button moves the event. Guests on foot can still use the Grand Staircase.
3. **Side Entrance closed.** The ramp door is locked. The app checks all three entrances and routes the cart through the level Garden Entrance and its vestibule (+25 s). If the Garden Entrance closes too, it says plainly: "No step-free alternative found."

**Copy guest directions** gives the entrance, the floor and numbered steps. Selecting a step opens its floor on the map. **Reset scenario** starts again. The site works on a phone, with the keyboard alone, and with reduced motion. There is no login and no server; each visitor's changes stay in their own browser tab.

## The ghost trail

The ghost trail is the route you used to have, drawn up to the point where it stops working.

The app computes the route twice for the same profile: once with every transition open (the baseline) and once with the current closures. The ghost trail is the part of the baseline from the start up to, but not including, the first closed transition.

- **No way round:** the whole old route is drawn as a dashed lilac line up to the blockage. For the lift outage it ends at the lift door on Floor 1, with a lock and the caption "Lift out of service".
- **A way round:** the part both routes share is drawn once, as the solid amber route. The dashes start where the routes part. At the gallery the new route turns away right at the closed door, so nothing is dashed and the "Door closed" marker shows where the old route broke.

Each change animates once: the old route fades into dashes, the way round draws in from the point where it leaves the old route, and the door of a newly chosen room lights up. With reduced motion every state appears at once. The map, the floor switcher and the text directions read one route result per render, so they cannot disagree.

## How to test the demo

Open https://ghost-routes.pages.dev/. No login. Desktop or phone.

1. Pick **Gallery door closed** and press **Close central door**. The amber route draws in along the Gallery Walk; the central door shows **Door closed**. The status says the route adds 1 min 11 s.
2. Pick **Lift out, move to Room 104** and press **Lift out of service**. On Floor 1 the old route turns into a dashed trail that stops at the lift door. Under **Move the event?**, Room 203 is rejected and Room 104 is confirmed. Press **Move event to Room 104**: the door of Room 104 lights up.
3. Press **Copy guest directions**, then **Reset scenario**.
4. Optional: pick **Side Entrance closed**, press **Close Side Entrance** (the Garden Entrance route) and then **Close Garden Entrance** (no step-free alternative).

## Costume Contest angle

Ghost Routes is a routing tool dressed as a haunted hotel, and the costume carries the meaning. The ghost trail is the old route, still drawn on the plan, that no longer works. A lock and a small ghost sit where it broke. When a way round exists, it draws itself in amber from the exact point where it leaves the old route. When the event has to move, the door of the new room glows like a lantern.

For an organizer that answers three questions in one look: where does my usual route stop, is there a way round to the same room, and if not, which room can the cart still reach? Room 104 and the Moonlight Hall are offered only after the same routing function, with the same profile and the same closures, finds a route without steps to them.

The routing underneath is ordinary and tested: one graph, one shortest-path function, and rules for who may use which transition. The cream plans, burgundy walls, a different original carpet on each floor (hexagons, lanterns, crescent moons), the Library with its shelves and the Moonlight Hall with its inlaid moon make the result easy to remember.

## How we used Kiro

Everything below is backed by a file, a test, or a log in the repository. [`docs/kiro-usage.md`](https://github.com/Crafter-Code/ghost-routes/blob/main/docs/kiro-usage.md) has the details.

**Two requirements-first specs.** [`.kiro/specs/ghost-routes/`](https://github.com/Crafter-Code/ghost-routes/tree/main/.kiro/specs/ghost-routes) describes the first release (the lift outage and the move to Room 104, 9 requirements). [`.kiro/specs/haunted-hotel-expansion/`](https://github.com/Crafter-Code/ghost-routes/tree/main/.kiro/specs/haunted-hotel-expansion) describes the three-floor expansion (13 requirements): closure groups, the entrance check, the "no suitable route" state, floor-aware steps, the phone layout, motion with reduced motion, and Requirement 13, which says how the ghost trail is drawn beside a way round. Each `tasks.md` links every task to requirement numbers.

**Kiro Crew (Claude Opus 5.5): first release.** From a 12-point brief the agent wrote the first spec, then the app: one hotel graph, one routing function, the lift outage, the ghost trail and the verified move to Room 104.

**Kiro CLI: the expansion.** In Kiro CLI the expansion went spec first, then in stages, each a separate commit: the three-floor graph and scenarios, the map and floor switcher, then the phone layout and motion. The first release's tests (`src/routing/hotel.test.ts`, 16 tests) were never edited and still pass.

**Tests named after the specs.** `npm test` runs 129 tests, all passing:

- `src/routing/hotel.test.ts` (16): the first release, named by requirement, for example "3.2 ends at the closed lift door on Floor 1, before the lift leg".
- `src/routing/expansion.test.ts` (97): the expansion, named `H<requirement>.<criterion>`, for example "H13.3 when the routes part at the closed door, a marker with a caption shows where it broke". It also runs every scenario with every combination of its closures and both profiles, and checks that the map and the text get the same route object.
- `src/routing/route.property.test.ts` (7): fast-check properties on random graphs, P1 to P7. For example, closing a transition never makes an unreachable room reachable, and the dashed part of a ghost trail never contains a closed transition. No counterexample has been found.
- `src/map/layout.test.ts` (9): every line drawn between graph nodes crosses walls only through the door gap of its own transition, so the route on the map really goes through the doors.

**Steering.** [`routing-rules.md`](https://github.com/Crafter-Code/ghost-routes/blob/main/.kiro/steering/routing-rules.md) is always on and holds five rules, each naming its requirement and tests: Step-free excludes steps, stairs and closed transitions; the map and the directions use one route result; the ghost trail ends before the first closed transition; a closure group (the lift is two segments) closes and opens as one; an entrance is entered through its gate. [`routing-code.md`](https://github.com/Crafter-Code/ghost-routes/blob/main/.kiro/steering/routing-code.md) loads for routing, map and component files and says which test file belongs to which spec.

**Agent hook.** `.kiro/hooks/routing-tests-on-save.json` runs `npm run test:routing` after an agent saves a file in `src/routing/`. In Kiro CLI 3.3.0 the hook loaded and fired; the captured run is saved in `docs/evidence/hook-routing-tests-2026-11-15.log`.

**Playwright MCP in Kiro CLI.** `.kiro/settings/mcp.json` registers `@playwright/mcp` (Chrome, headless, isolated). On the local production build, Kiro CLI drove Chrome through the MCP tools: the 8 checks of the first release, then the expansion's two main outcomes. For the gallery detour it read the status in the same frame as the click, saw the detour animation running from the point where the routes part, and saw it not replay when switching floors. For the lift outage it saw the old route fade into dashes, the move to Room 104 with focus on the new directions, and the lit door. Screenshots are in `docs/evidence/mcp/`.

**Playwright test runner, on the deployed site.** `npm run test:e2e` runs 21 browser checks on a desktop and a phone viewport: the three scenarios, copy (the clipboard content is read back), reset, the move to Room 302 and a step that opens Floor 3, both "no suitable route" states, the keyboard, animations that run once and do not replay, reduced motion, and at 390 px the order of blocks, the focus order and no sideways scroll. The expansion was first published as a Cloudflare Pages preview of its branch and checked there (21 passed, 15 skipped by viewport); after approval it was merged and the same checks passed on https://ghost-routes.pages.dev/ (21 passed, 15 skipped). The production build serves the same JavaScript and CSS, byte for byte, as the reviewed preview.

**What the checks do not cover.** The MCP runs used the local build. No real phone check is recorded; the phone checks use an emulated 390 px viewport and a Pixel 7 profile.

## Built with

React, TypeScript, Vite, Vitest, fast-check, Playwright, Cloudflare Pages, Kiro Crew, Kiro CLI.

## Try it

- Demo: https://ghost-routes.pages.dev/
- Code: https://github.com/Crafter-Code/ghost-routes
- Video: `[YOUTUBE URL]`
