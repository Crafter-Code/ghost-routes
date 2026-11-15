# Devpost draft: Ghost Routes (Kiroween 2026, Costume Contest)

Copy each section into the matching Devpost field. Text in `[brackets]` is a placeholder for a link that does not exist yet.

## Links

- Live demo: https://ghost-routes.pages.dev/
- Code (MIT): https://github.com/Crafter-Code/ghost-routes
- Demo video (YouTube, public): `[YOUTUBE URL, to be added after upload]`

## Tagline

Step-free hotel routing that shows where your route broke, as a ghost.

## Inspiration / the problem

Event organizers book rooms. Then the lift stops working.

A workshop is booked in Room 204 on the second floor. The crew brings heavy equipment on a cart, so they need a route without steps. When the lift goes out, the booking is still there, but the route to it is gone. Most maps show only the route that works now. They do not show what changed, so the organizer has to work out by hand where the usual route fails and which other room the cart can still reach.

Ghost Routes is for event organizers, venue staff, and anyone who moves a wheelchair, pram, or cart through a building: people who need a step-free route and need to know when it disappears.

## What it does

Ghost Routes plans routes inside The Hollowmere Hotel, a fictional two-floor hotel.

1. It shows two routes to Room 204 side by side. *Steps allowed* goes through the Main Entrance front steps and the Grand Staircase. *Step-free* goes through the Side Entrance ramp and the lift.
2. You mark the lift **out of service**. Step-free now reads: "No step-free route to Room 204. The lift is out of service." The guest route over the Grand Staircase stays open.
3. A dashed **ghost trail** shows the old step-free route and stops at the lift door on Floor 1. It marks where the route died.
4. The app proposes a new room only after it has checked a step-free route to it. Room 203 is checked and rejected. Room 104 is confirmed. One button moves the event.
5. **Copy guest directions** gives the entrance, the floor and numbered steps.
6. **Reset scenario** starts again.

There is no login and no server. Each visitor's changes stay in their own browser tab.

## The ghost trail

The ghost trail is the route you used to have, drawn up to the point where it stops working.

The app computes the same route twice for the same profile: once with every transition open (the baseline) and once with the lift closed. The ghost trail is the part of the baseline route from the start up to, but not including, the first closed transition. For the lift outage it ends at the lift door on Floor 1. The trail is dashed and the active route is solid, so the two are different without relying on color.

The route and the text directions come from one route result per render, so the map and the written steps cannot disagree.

## How to test the demo

Open https://ghost-routes.pages.dev/. No login. Desktop or phone.

1. Under **Routes to Room 204**, compare *Steps allowed* and *Step-free*.
2. Press **Lift out of service**. The status turns red, and a lock appears on the lift on both floors.
3. Look at Floor 1: the dashed trail ends at the lift door.
4. Select *Steps allowed*: the Grand Staircase route is still open. Select *Step-free* again.
5. Under **Move the event?**, check that Room 203 is rejected and Room 104 is confirmed. Press **Move event to Room 104**.
6. Press **Copy guest directions**.
7. Press **Reset scenario**.

Every control also works with the keyboard alone.

## Costume Contest angle

Ghost Routes is a routing tool dressed as a haunted hotel. The costume carries the meaning: the ghost trail is the old route, still drawn on the plan, that no longer works.

For an organizer, the ghost trail answers the first question after a lift outage: where does my usual route stop? It shows the step-free route they planned, from the forecourt up the side ramp and along the corridor, and it ends at the closed lift door on Floor 1. The organizer sees why the workshop cannot stay in Room 204: the cart can reach the door, and the lift behind it is out of service. Staff can explain this to a crew in one look.

The app then proposes a new room, and it does so only after it has checked a step-free route to it. Room 203 is checked first and rejected. Room 104 is offered because the same routing function, with the same profile and the lift closed, finds a route without steps to it. The routing underneath is ordinary and tested: one graph, one shortest-path function, and rules for who may use which transition. The haunted-hotel look, with a ghost and a lock on the broken lift and a cream-and-burgundy plan, makes that result easy to remember.

## How we used Kiro

Everything below is backed by a file, a test, or a log in the repository. [`docs/kiro-usage.md`](https://github.com/Crafter-Code/ghost-routes/blob/main/docs/kiro-usage.md) has the details.

**Kiro Crew (Claude Opus 5.5): first implementation.** From a 12-point brief, the agent wrote the spec first, then the app: a React + TypeScript + Vite single-page app with one hotel graph, one routing function, the lift outage, the ghost trail, the verified move to Room 104, reset, and a per-visitor session.

**Requirements-first spec** in [`.kiro/specs/ghost-routes/`](https://github.com/Crafter-Code/ghost-routes/tree/main/.kiro/specs/ghost-routes): `requirements.md` (9 requirements with acceptance criteria), `design.md` (graph, routing, UI states, properties), and `tasks.md` (each task linked to requirement numbers). Each visible behavior has its own criterion. Lift closure is Requirement 2, the ghost trail is Requirement 3, the verified proposal is Requirement 4, and the move to Room 104 is Requirement 5.

**Tests named after the spec.** `src/routing/hotel.test.ts` has 16 unit tests whose names start with a requirement number, for example "3.2 ends at the closed lift door on Floor 1, before the lift leg". `src/routing/route.property.test.ts` has 5 fast-check properties on random graphs (P1 to P5): active routes use only open transitions, Step-free never uses steps or stairs, closing a transition never makes an unreachable room reachable, the ghost trail is a prefix of the baseline that ends before the first closed transition, and the proposal is the first reachable candidate. `npm test` runs all 21; all pass, and fast-check has found no counterexample.

**Steering** in [`.kiro/steering/`](https://github.com/Crafter-Code/ghost-routes/tree/main/.kiro/steering). `routing-rules.md` (always on) holds the three routing rules: Step-free excludes stairs, steps and closed transitions; the map and the directions use one route result; the ghost trail ends before the first closed transition. `routing-code.md` loads when an agent touches routing, map or component files, and says where each rule lives in code. Kiro Crew loaded the rules into its session, and in the hook test the Kiro CLI agent quoted them without being asked.

**Agent hook.** `.kiro/hooks/routing-tests-on-save.json` runs `npm run test:routing` after an agent saves a file in `src/routing/`. In Kiro CLI 3.3.0 the hook loaded and fired when the agent wrote a probe file there; the captured run (21 tests passed, exit code 0) is saved in `docs/evidence/hook-routing-tests-2026-11-15.log`. The probe file and a temporary logging hook were removed afterwards.

**Playwright MCP in Kiro CLI.** `.kiro/settings/mcp.json` registers `@playwright/mcp` (Chrome, headless, isolated). Three earlier attempts failed with `Target crashed`. In the fourth attempt, Kiro CLI 3.3.0 drove Chrome through the MCP tools on the **local production build** (`npm run build`, then `vite preview` on `127.0.0.1:4173`) and passed all 8 checks of `docs/mcp-qa-prompt.md`: both routes to 204, lift out with the exact message, Steps allowed still open, the Room 203/104 proposal, the move with focus on the directions heading, copy, reset, a 390 px phone width with no sideways scroll, and a keyboard-only run. The four screenshots are in `docs/evidence/mcp/`. We never found why the earlier attempts crashed.

**Playwright test runner (separate from MCP).** `npm run test:e2e` runs the same scenario on the production build at a desktop size and a phone size, and also checks the clipboard content. It passed against the local build (7 passed, 1 skipped, because the keyboard test runs on desktop only) and against the deployed demo at https://ghost-routes.pages.dev/ (7 passed, 1 skipped).

**What the checks do not cover.** The MCP run used the local build, not the public demo. No real phone has been tested; the phone checks use an emulated 390 px viewport and a Pixel 7 profile.

## Built with

React, TypeScript, Vite, Vitest, fast-check, Playwright, Cloudflare Pages, Kiro Crew, Kiro CLI.

## Try it

- Demo: https://ghost-routes.pages.dev/
- Code: https://github.com/Crafter-Code/ghost-routes
- Video: `[YOUTUBE URL]`
