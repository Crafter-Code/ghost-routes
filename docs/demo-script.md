# Demo video script: Ghost Routes (about 2 min 35 s)

Record at 1366×900 in a clean browser window at https://ghost-routes.pages.dev/. Open the page fresh (or press **Reset scenario**) before recording. Do not turn on reduced motion in the operating system: the video shows the animations. For the Kiro segment, have two editor tabs ready: `.kiro/specs/haunted-hotel-expansion/requirements.md` scrolled to Requirement 13, and `src/routing/expansion.test.ts` scrolled to the test named "H13.3". Speak at about 150 words per minute. Upload as a public YouTube video, then replace `[YOUTUBE URL]` in `docs/devpost-draft.md` (two places).

The video shows two different outcomes: a way round to the **same** room (Room 206), and a **move** to another room (204 → 104).

## Timing

Each window includes the clicks and the silent holds, not just the narration.

| Window | Segment | Words | Narration | Clicks and silent holds | Total |
|---|---|---|---|---|---|
| 0:00–0:12 | Intro | 28 | 11 s | 1 s | 12 s |
| 0:12–0:22 | Three floors | 20 | 8 s | 2 s | 10 s |
| 0:22–0:56 | Outcome 1: way round to Room 206 | 53 | 21 s | 14 s (6 s silent while the detour draws) | 34 s |
| 0:56–1:44 | Outcome 2: lift out, move 204 → 104 | 73 | 29 s | 19 s (5 s silent on the ghost trail, 4 s silent on the lit door) | 48 s |
| 1:44–1:54 | Copy and reset | 13 | 5 s | 4 s | 10 s |
| 1:54–2:22 | Kiro: requirement and test | 54 | 22 s | 6 s | 28 s |
| 2:22–2:34 | Close | 23 | 9 s | 2 s | 12 s |

Target length 2:34: 264 words at 150 words per minute (106 s) plus 48 s of clicks and holds. Reading at 130 words per minute adds about 16 s, so the video stays under 3:00. If a take runs long, cut the "Three floors" segment first.

Animation timings in the app, for the holds: the old route fades into dashes in 0.5 s; the way round starts drawing 0.45 s after the click and takes 0.9 s, then a soft halo appears at about 1.6 s; the new room's door pulses twice in 3.2 s and keeps a ring.

## 0:00–0:12 · Intro

**On screen:** the start state: "Ghost Routes", the scenario picker on the left with **Lift out, move to Room 104** selected, the floor switcher and Floor 1 in the middle, the directions on the right. Cursor still.

**Voice:** "A crew with heavy equipment on a cart needs a route without steps. Ghost Routes shows what happens to that route when a door or the lift closes."

## 0:12–0:22 · Three floors

**On screen:** move the cursor over the three floor tabs above the map. Click **Floor 3** (about 0:16): the Library and the Moonlight Hall. Click **Floor 1** again (about 0:20).

**Voice:** "The Hollowmere Hotel has three floors. The small plans show every floor; the large one shows the floor you pick."

## 0:22–0:56 · Outcome 1: a way round to the same room

**On screen:** click **Gallery door closed** (about 0:23). The map opens Floor 2; the Portrait Gallery, Room 206, is the event room. At about 0:30 click **Close central door**. Hold the cursor still and say nothing from 0:31 to 0:37: the amber route draws in from the central corridor along the west passage and the Gallery Walk to the gallery's south door, and a soft halo follows. The central door shows a lock and **Door closed**, with a small ghost. Then point at the status: "…still open via Side Entrance (ramp) → Lift → Gallery Walk. It adds 1 min 11 s."

**Voice (0:23–0:30):** "First, an exhibition in the Portrait Gallery on Floor 2. I close its central door."

**Silent hold (0:31–0:37).**

**Voice (0:38–0:56):** "The way round draws itself from the point where it leaves the old route: along the Gallery Walk to the other door. Same room, one minute eleven longer. The closed door is marked, so the crew knows why."

## 0:56–1:44 · Outcome 2: the lift fails, the event moves from 204 to 104

**On screen:** click **Lift out, move to Room 104** (about 0:57). The map opens Floor 1. At about 1:02 click **Lift out of service**. The status turns red: "No step-free route to Room 204. The lift is out of service." On Floor 1 the old amber route fades into a dashed lilac trail that stops at the lift door, with a lock, a ghost and the caption **Lift out of service**. Hold still and silent from 1:04 to 1:09 on the dashed trail. Then scroll the left column to **Move the event?**: "✕ Room 203 (Blue Room): no step-free route", "✓ Room 104 (Garden Hall): step-free route, 1 min 00 s". At about 1:30 click **Move event to Room 104**. The map shows a solid route to Room 104 and its door pulses warm twice; focus moves to "Directions to Room 104". Hold still and silent from 1:31 to 1:35 on the lit door.

**Voice (0:57–1:03):** "Second, a workshop in Room 204. Now the lift fails."

**Silent hold (1:04–1:09).**

**Voice (1:10–1:30):** "There is no way round this time. The dashed line is the ghost trail: the route the crew used to have, up to the lift door where it breaks. The app does not guess a new room. It checks. Room 203 fails. Room 104 has a route without steps."

**Silent hold (1:31–1:35).**

**Voice (1:36–1:44):** "I move the event. The new door lights up, and the directions are ready."

## 1:44–1:54 · Copy and reset

**On screen:** click **Copy guest directions** (about 1:45): "Copied: entrance, floor and steps." appears under the button. Click **Reset scenario** (about 1:51): back to Room 204, nothing closed, Floor 1.

**Voice:** "Copy gives guests the entrance, the floor and the steps. Reset starts again."

## 1:54–2:22 · Kiro: one requirement and the test that checks it

**On screen:** switch to the editor (about 1:54). `.kiro/specs/haunted-hotel-expansion/requirements.md` at Requirement 13, criterion 3 highlighted: "WHEN the divergence point is the node before the first closed transition … THE drawn ghost trail SHALL be empty, and THE SYSTEM SHALL show the failure marker there with its caption, for example "Door closed"." Hold about 9 s. Switch to `src/routing/expansion.test.ts` at the test `H13.3 when the routes part at the closed door, a marker with a caption shows where it broke`. Hold about 9 s. Optionally cut to the terminal with `npm test` showing "129 passed".

**Voice:** "I built this with Kiro, spec first. This requirement says what the map shows when the new route turns away right at the closed door: no dashes, just the marker. Here is the test with the same number. Steering keeps the routing rules in every agent's context, and a hundred and twenty-nine tests pass."

## 2:22–2:34 · Close

**On screen:** back to the app at the start state, then an end card with https://ghost-routes.pages.dev/ and https://github.com/Crafter-Code/ghost-routes.

**Voice:** "Ghost Routes: a route that fails should show where it failed, and the way round. Try it at ghost-routes dot pages dot dev."

## Recording checks

- The status text, the "Door closed" and "Lift out of service" captions, the dashed trail and the "Copied" line must be readable at 1080p. Zoom the browser to 110% if not.
- Do not talk over the three silent holds: they are there so the detour drawing, the ghost trail and the lit door are seen.
- If a click lands too early, press **Reset scenario** and redo the segment; the animations run once per change and do not replay when you switch floors.
- Do not show a clipboard paste: the copy confirmation is on screen, and the clipboard content is covered by the Playwright test.
- Only use Kiro lines that are true today (see `docs/kiro-usage.md`). Do not mention Kiro IDE, custom agents or Kiro Web.
- Time the finished video. It must be under 3:00.
