# Demo video script: Ghost Routes (about 2 min 30 s)

Record at 1366×900 in a clean browser window at https://ghost-routes.pages.dev/. Open the page fresh (or press Reset) before recording. For the Kiro segment, have two editor tabs ready: `.kiro/specs/ghost-routes/requirements.md` scrolled to Requirement 3, and `src/routing/hotel.test.ts` scrolled to the test named "3.2". Speak at about 150 words per minute. Upload as a public YouTube video, then replace `[YOUTUBE URL]` in `docs/devpost-draft.md`.

## Timing

Each window includes the clicks and pauses listed under it, not just the narration.

| Window | Segment | Words | Narration | Clicks and pauses | Total |
|---|---|---|---|---|---|
| 0:00–0:13 | Intro | 29 | 12 s | 1 s | 13 s |
| 0:13–0:34 | Two routes to Room 204 | 37 | 15 s | 6 s | 21 s |
| 0:34–0:58 | Lift out of service | 37 | 15 s | 9 s | 24 s |
| 0:58–1:20 | Ghost trail | 41 | 16 s | 6 s silent hold | 22 s |
| 1:20–1:42 | Move to Room 104 | 40 | 16 s | 6 s | 22 s |
| 1:42–1:53 | Copy directions and reset | 14 | 6 s | 5 s | 11 s |
| 1:53–2:20 | Kiro: requirement and test | 48 | 19 s | 8 s | 27 s |
| 2:20–2:31 | Close | 26 | 10 s | 1 s | 11 s |

Target length 2:31 (272 words at 150 words per minute, plus 42 s of clicks and pauses). A slower reading at 130 words per minute adds about 15 s, so the video stays under 3:00.

## 0:00–0:13 · Intro

**On screen:** the full page at the start state: title "Ghost Routes", The Hollowmere Hotel, both floor plans, Step-free selected with a solid route. Cursor still.

**Voice:** "A workshop is booked in Room 204. The crew has a cart, so they need a route without steps. Ghost Routes shows what happens when the lift goes out."

## 0:13–0:34 · Two routes to Room 204

**On screen:** the "Routes to Room 204" panel. Click *Steps allowed* (at about 0:17): both plans show the route through the front steps and the Grand Staircase, and the summary reads "Main Entrance (front steps) → Grand Staircase · 2 min 05 s". Click *Step-free* (at about 0:26): the route moves to the side ramp and the lift, "Side Entrance (ramp) → Lift · 2 min 20 s". Directions list visible at the right.

**Voice:** "Two routes to Room 204. Steps allowed uses the front steps and the Grand Staircase. Step-free goes up the side ramp and takes the lift. Both come from one graph, and the written directions match the map."

## 0:34–0:58 · Lift out of service

**On screen:** *Step-free* selected. Click **Lift out of service** (at about 0:37): the toggle turns on, the status box turns red and reads "No step-free route to Room 204. The lift is out of service." Lock icons appear on the lift on both floors. Hold 2 s on the status. At about 0:47 click *Steps allowed*: the status says the route is still open via the Grand Staircase. At about 0:54 click *Step-free* again.

**Voice:** "Now I mark the lift out of service. For step-free, the answer is exact: no route, because the lift is out of service. Guests on foot can still use the Grand Staircase. The problem is the cart."

## 0:58–1:20 · Ghost trail

**On screen:** Floor 1 plan, framed so the whole plan is visible, with the legend and the line "Ghost trail: the usual step-free route now stops at the lift door on Floor 1." in view. The dashed trail runs from "Start" across the forecourt, up the side ramp and into the corridor, and stops at the lift door, where the lock and ghost are. From 0:58 to 1:07 the cursor traces the dashed line from Start to the lift door while the first line of narration runs. From 1:07 to 1:13 the cursor rests on the lift door and nothing moves: the dashed trail is on screen with no narration. From 1:13 to 1:20 the second line of narration runs.

**Voice (0:58–1:07):** "This dashed line is the ghost trail: the route the crew used to have. It ends at the lift door on Floor 1."

**Silent hold (1:07–1:13):** no voice. Keep the cursor still on the door.

**Voice (1:13–1:20):** "The live route is solid, the old one is dashed. That is why the workshop has to move."

## 1:20–1:42 · Move to Room 104

**On screen:** the "Move the event?" box: "✕ Room 203 (Blue Room): no step-free route" and "✓ Room 104 (Garden Hall): step-free route, 1 min 00 s". Click **Move event to Room 104** (at about 1:30). The map redraws with a solid route to Room 104, the heading "Directions to Room 104" shows a focus outline, and the status reads "Event moved to Room 104. Step-free route ready via Side Entrance (ramp)."

**Voice:** "The app does not guess a new room. It checks. Room 203 fails. Room 104 has a route without steps, so that is the one it offers. I press move, and the map shows a solid route to Room 104."

## 1:42–1:53 · Copy directions and reset

**On screen:** click **Copy guest directions** (at about 1:43): the line "Copied: entrance, floor and steps." appears under the button. Hold 2 s. Click **Reset scenario** (at about 1:49): the page returns to Room 204 with Step-free selected and the lift toggle off.

**Voice:** "Copy guest directions gives the entrance, the floor and numbered steps. Reset starts again."

## 1:53–2:20 · Kiro: one requirement and the test that checks it

**On screen:** switch to the editor (at about 1:53). First `.kiro/specs/ghost-routes/requirements.md` at Requirement 3, with criterion 3.2 highlighted: "The ghost trail SHALL end at the node just before the first closed transition of the baseline route. For the lift outage this is the closed lift door on Floor 1." Hold about 8 s. Switch to `src/routing/hotel.test.ts` at the test `3.2 ends at the closed lift door on Floor 1, before the lift leg`, highlighted. Hold about 8 s.

**Voice:** "I built this with Kiro. Kiro Crew wrote the spec first. Requirement 3.2 says the ghost trail ends at the closed lift door on Floor 1. Here is the unit test with the same number in its name. A fast-check property tests the same rule on random graphs."

## 2:20–2:31 · Close

**On screen:** end card with https://ghost-routes.pages.dev/ and https://github.com/Crafter-Code/ghost-routes on a plain background. The start state of the app can show behind it.

**Voice:** "Ghost Routes: a route that fails should show where it failed. Try it at ghost-routes dot pages dot dev. The code is on GitHub, MIT license."

## Recording checks

- The status text, the ghost trail end at the lift door, and the "Copied" line must be readable at 1080p. Zoom the browser to 110% if not.
- Do not show a clipboard paste: the copy confirmation is on screen, and the clipboard content is covered by the Playwright test.
- Only use the Kiro lines that are true today: Kiro Crew wrote the spec and the first version; Kiro CLI ran the hook and the Playwright MCP check. Do not mention Kiro IDE, custom agents or Kiro Web.
- Time the finished video. If it runs over 3:00, cut the Steps allowed click in the lift segment first.
