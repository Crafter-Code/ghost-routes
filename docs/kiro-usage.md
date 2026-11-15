# How Ghost Routes was built with Kiro

This log records each Kiro tool used on Ghost Routes: the concrete task, what changed, and the evidence. It feeds the Kiro section of the Devpost submission. Entries are added as work happens; nothing here is claimed without a file, a test or a log behind it.

## Summary

| Kiro feature | Status | Evidence |
|---|---|---|
| Kiro Crew (agent: Claude Opus 5.5) | Used: first implementation | Spec, app, tests, README (see below) |
| Requirements-first spec | Used: written in Kiro Crew | [`.kiro/specs/ghost-routes/`](../.kiro/specs/ghost-routes/) |
| Property-based tests (fast-check) | Used | [`src/routing/route.property.test.ts`](../src/routing/route.property.test.ts) |
| Steering (`always` + `fileMatch`) | Used, loaded by Kiro Crew and Kiro CLI | [`.kiro/steering/`](../.kiro/steering/) |
| Agent hook: PostFileSave → `npm run test:routing` | Used, fired in Kiro CLI 3.3.0 | [`docs/evidence/hook-routing-tests-2026-11-15.log`](evidence/hook-routing-tests-2026-11-15.log) |
| Kiro IDE (spec + implementation) | **Pending** | Kiro IDE is not yet installed on the dev machine |
| Agent hook: Post Task Execution → build | **Pending** | Not configured yet |
| Custom agents `route-reviewer`, `browser-qa` | **Pending** | Not created yet |
| Playwright MCP in `.kiro/settings/mcp.json` | Used: 8/8 checks passed in Kiro CLI 3.3.0 on the local production build (fourth attempt; the first three crashed) | [`docs/evidence/mcp/`](evidence/mcp/), Browser checks below. The Playwright *test runner* is used separately |
| Kiro CLI: Haunted Hotel Expansion | Used, on `feature/haunted-hotel-expansion` (not released) | Spec, code, tests and checks: see the section at the end |
| Kiro Web repository review | **Pending** | Needs a public repository |
| Kiro Powers (BrowserStack) | **Pending** | Needs BrowserStack access and a public URL |

## Log

### 2026-11-14 · Kiro Crew · first implementation

- **Who/what:** Claude Opus 5.5 running in Kiro Crew implemented the first version from a 12-point brief.
- **Task:** write a requirements-first spec, then build a React + TypeScript + Vite app that routes over one hotel graph: two routes to Room 204, lift outage, ghost trail, verified move to Room 104, reset, per-visitor session.
- **What changed:**
  - Spec: [`requirements.md`](../.kiro/specs/ghost-routes/requirements.md) (9 requirements, EARS-style acceptance criteria; lift closure is Requirement 2, ghost trail Requirement 3, verified proposal Requirement 4, the move Requirement 5), [`design.md`](../.kiro/specs/ghost-routes/design.md) (graph, routing, UI states S0–S3, properties P1–P5), [`tasks.md`](../.kiro/specs/ghost-routes/tasks.md) (each task linked to requirement numbers).
  - Routing core with no React: [`src/routing/`](../src/routing/).
  - UI: [`src/App.tsx`](../src/App.tsx), [`src/map/FloorPlan.tsx`](../src/map/FloorPlan.tsx), [`src/components/`](../src/components/).
- **Evidence:**
  - Unit tests per acceptance criterion: [`src/routing/hotel.test.ts`](../src/routing/hotel.test.ts) (16 tests, named by requirement number).
  - Property tests on random graphs with fast-check: [`src/routing/route.property.test.ts`](../src/routing/route.property.test.ts). P1 active route uses only open transitions (Req 2.6); P2 Step-free excludes steps and stairs (Req 1.5); P3 closing an edge never makes an unreachable room reachable (Req 2.7); P4 ghost trail ends before the first closed transition (Req 3.2, 3.3); P5 the proposal is the first reachable candidate (Req 4.1, 4.2). No counterexample found so far.
  - Browser scenario on the production build (`vite preview`), desktop and phone viewports: [`e2e/scenario.spec.ts`](../e2e/scenario.spec.ts). 7 passed, 1 skipped (keyboard test is desktop-only).
  - Clean-copy check: `npm ci`, `npm test`, `npm run test:e2e` all passed.

### 2026-11-15 · Steering

- **Task:** make three project rules persistent for every agent.
- **What changed:**
  - [`.kiro/steering/routing-rules.md`](../.kiro/steering/routing-rules.md), `inclusion: always`: Step-free excludes stairs, steps and closed transitions; map and directions use one route result; the ghost trail ends before the first closed transition.
  - [`.kiro/steering/routing-code.md`](../.kiro/steering/routing-code.md), `inclusion: fileMatch` on `src/routing/**/*.ts`, `src/map/**/*.tsx`, `src/components/**/*.tsx`: where each rule lives in code and how to add a rule (criterion → unit test → property).
- **Evidence:** right after the file was saved, Kiro Crew injected `routing-rules` into the running session as a workspace rule. In the hook test below, the Kiro CLI agent quoted the steering on its own ("The routing rules call for `npm run test:routing` after changes in `src/routing/`").

### 2026-11-15 · Agent hook: routing tests on file save

- **Task:** run the routing tests whenever an agent saves a file in the routing module.
- **What changed:** [`.kiro/hooks/routing-tests-on-save.json`](../.kiro/hooks/routing-tests-on-save.json): trigger `PostFileSave`, matcher `src/routing/.*\.ts$`, action `npm run test:routing`.
- **Evidence:** in Kiro CLI 3.3.0 the hook loaded (`hooks.reload.loaded {"read":1,"registered":1}`) and fired when the agent wrote `src/routing/hook-probe.ts`. To capture the command output, a temporary second hook with the same trigger and matcher wrote it to a file. That output, with the event JSON Kiro passed on STDIN, is saved in [`docs/evidence/hook-routing-tests-2026-11-15.log`](evidence/hook-routing-tests-2026-11-15.log): 21 tests passed, exit code 0. The probe file and probe hook were then removed.
- **Still to check:** the same hook in Kiro IDE (Agent Hooks panel).

## Devpost: Kiro section (draft)

> Ghost Routes started as a requirements-first spec in `.kiro/specs/ghost-routes/`. Each behavior judges see (the lift closing, the ghost trail stopping at the lift door, the verified move to Room 104) has its own acceptance criterion, a unit test named after it, and for general rules a fast-check property on random graphs. Steering keeps the three routing rules in every agent's context, and a PostFileSave hook re-runs the routing tests whenever an agent edits the routing module. The first implementation was written by Claude Opus 5.5 in Kiro Crew.
>
> *To be completed after the pending items above: Kiro IDE work, custom agents, MCP, and a comparison of the tools actually used.*

## Browser checks

Two different kinds of browser check exist. They are recorded separately.

### Playwright test runner (not MCP)

- **Client:** none. Plain `npm run test:e2e` (Playwright 1.65, Google Chrome) against `vite preview` of the production build.
- **What it checks:** [`e2e/scenario.spec.ts`](../e2e/scenario.spec.ts). Both routes to Room 204; lift out with the exact message and lock icons on both floors; Steps allowed still uses the Grand Staircase; dashed ghost trail on Floor 1 ending at the lift door; Room 203 rejected and Room 104 proposed; move to 104 with focus on the directions heading; copy guest directions (clipboard content checked); reload keeps the state; reset; a second browser context starts clean; keyboard-only run; steps beside the map on desktop and under it on a phone with no sideways scroll.
- **Result, 2026-11-15:** desktop 1366×900 and phone (Pixel 7): 7 passed, 1 skipped (keyboard test runs on desktop only).

### Playwright MCP (Brief 6f)

- **2026-11-15, Kiro Crew (Claude Opus 5.5):** the agent tried to create `.kiro/settings/mcp.json`. The host policy refused the write with this exact error:

  ```
  Blocked by a permission rule (deny fs_write matching "/Users/dmitri/Desktop/Mine/Kiroween - Project/Code/.kiro/settings/mcp.json"); the user did not reject it. Source: kiro-scope.
  ```

  An agent cannot register its own MCP servers, so the agent did not try another way to write the file. No MCP run has happened yet.
- **Next:** a person adds the config below, then runs the prompt in [`docs/mcp-qa-prompt.md`](mcp-qa-prompt.md) in Kiro CLI or Kiro IDE. Screenshots go to `docs/evidence/mcp/`. The result is recorded here.
- **2026-11-15, second attempt:** the MCP run did not start. `.kiro/settings/mcp.json` does not exist in the project (`ls: .kiro/settings/: No such file or directory`). `kiro-cli mcp list` (Kiro CLI 3.3.0) lists no `playwright` server, and there is no global `~/.kiro/settings/mcp.json`. No MCP check was run, so none of its steps has a result yet.
- **2026-11-15, third attempt (Kiro CLI 3.3.0):** the person added `.kiro/settings/mcp.json` with args `--browser chrome --headless --isolated`. `kiro-cli mcp list` showed `playwright npx` under the workspace. The Kiro CLI agent ran the QA prompt with `--trust-tools=@playwright` and called `browser_navigate` 5 times, `browser_tabs` 3 times and `browser_close` 2 times. Every call failed, even on `about:blank`:

  ```
  Error: browserBackend.callTool: Target crashed
  Error: browserBackend.callTool: Target page, context or browser has been closed
  ```

  None of the 8 QA steps ran, and no screenshots were saved.
- **Diagnosis:** the crash also happens when `@playwright/mcp@0.0.85` is called directly over stdio, outside Kiro, so Kiro is not the cause. Chrome 158 starts fine through Playwright itself, with or without headless. The only working MCP variant was `--no-sandbox`: `browser_navigate` then returned the page. Chrome's own sandbox cannot start inside the sandboxed agent process. The Playwright test runner turns that sandbox off by default, which is why `npm run test:e2e` passes.
- **Open step:** a person adds `"--no-sandbox"` (and `"--output-dir", "docs/evidence/mcp"` for screenshots) to the args in `.kiro/settings/mcp.json`. Then the MCP QA run is repeated. Risk: with `--no-sandbox` Chrome loses its process sandbox, so the MCP browser should open only the local build and the project's own public URL.

  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@0.0.85", "--browser", "chrome", "--headless", "--isolated", "--output-dir", "docs/evidence/mcp"]
      }
    }
  }
  ```

  The config has no secrets: it only starts a local browser.

- **2026-11-15, fourth attempt (Kiro CLI, current config: `--browser chrome --headless --isolated`, no `--no-sandbox`):** Chrome did not crash. `npm run build` and `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` served the production build; `browser_navigate` to `http://127.0.0.1:4173/` returned the page "Ghost Routes · The Hollowmere Hotel". The earlier "Target crashed" error did not recur in this run. The cause of the earlier crashes was not identified, so the `--no-sandbox` advice above is not needed for this configuration on this run. All 8 steps of the QA prompt ran. Screenshots are in `docs/evidence/mcp/`.

  | Step | Expected | Observed | Result |
  |---|---|---|---|
  | 1. Routes to 204 (1366×900) | Steps allowed via front steps → Grand Staircase; Step-free via Side Entrance (ramp) → Lift | "Main Entrance (front steps) → Grand Staircase · 2 min 05 s"; "Side Entrance (ramp) → Lift · 2 min 20 s" | pass |
  | 2. Lift out | `Lift out of service` pressed=true; status exact; Floor 1 description mentions ghost trail ending at the lift door | pressed=true; status "No step-free route to Room 204. The lift is out of service."; Floor 1 plan: "A dashed ghost trail shows the old route. It ends at the lift door on Floor 1. The lift is marked out of service."; also "Ghost trail: the usual step-free route now stops at the lift door on Floor 1." | pass |
  | 3. Steps allowed | Route still open via Grand Staircase | "The lift is out of service. Your route to Room 204 is still open via Main Entrance (front steps) → Grand Staircase."; Step-free reselected afterwards | pass |
  | 4. Proposal and move | 203 "no step-free route"; 104 "step-free route"; focus on heading; status starts "Event moved to Room 104." | "✕ Room 203 (Blue Room): no step-free route"; "✓ Room 104 (Garden Hall): step-free route, 1 min 00 s"; focus H2 "Directions to Room 104"; status "Event moved to Room 104. Step-free route ready via Side Entrance (ramp)." | pass |
  | 5. Copy | Confirmation text | "Copied: entrance, floor and steps." (clipboard content not read; the Playwright test runner checks it) | pass |
  | 6. Reset | Directions for 204; lift pressed=false | Heading "Directions to Room 204"; pressed=false; status "Step-free route to Room 204 ready via Side Entrance (ramp) → Lift." | pass |
  | 7. Mobile 390×844 | Steps 2 and 4 repeat; directions below plans; no sideways scroll | Same status and focus results. Heading top at y=1439, below both floor plans (bottoms y=1111 and y=1341). `scrollWidth` 390 = viewport 390. | pass |
  | 8. Keyboard 1366×900 | Reach and press both buttons with Tab, Shift+Tab, Space, Enter | Tab → Step-free radio; Tab → "Lift out of service"; Shift+Tab → radio; Tab → lift button; Space → pressed=true and status "No step-free route…"; Tab → "Reset scenario"; Tab → "Move event to Room 104"; Enter → focus H2 "Directions to Room 104", status "Event moved to Room 104. …" | pass |

  Notes on the run:
  - The Floor 1 `role=img` label could not be read through `getAttribute('aria-label')` (null), so the description was read from the `browser_snapshot` accessibility tree. A DOM check for `[stroke-dasharray]` found 0 elements. The dashed trail was then checked by eye on `mcp-2-lift-out.png`: a dashed line runs from Start across the forecourt, up the side ramp and along the corridor, and ends at the lift door (lock icon and ghost, "Out of service").
  - Two screenshots were taken in the wrong state at first (`mcp-1` after the lift was already out, `mcp-2` after selecting Steps allowed). `mcp-1` and `mcp-2` were retaken in the correct state.
  - Two tool calls issued in parallel during the keyboard step ran out of order. Focus was re-read afterwards, and the order Lift → Reset → Move follows the page order.
  - Focus and status were read with `browser_evaluate`, and page structure with `browser_snapshot`.
  - The preview server was stopped after the run.

- **Brief 6f result (2026-11-15): Playwright MCP verified in Kiro CLI 3.3.0.** All 8 checks of [`docs/mcp-qa-prompt.md`](mcp-qa-prompt.md) passed on the local production build (`npm run build`, then `vite preview` on `127.0.0.1:4173`) with the current Chrome configuration (`--browser chrome --headless --isolated`, no `--no-sandbox`). The dashed ghost trail ending at the lift door is confirmed visually on [`mcp-2-lift-out.png`](evidence/mcp/mcp-2-lift-out.png). The MCP run confirmed only the text "Copied: entrance, floor and steps."; the clipboard content is checked by the separate Playwright test (`e2e/scenario.spec.ts`, `npm run test:e2e`). The earlier `--no-sandbox` suggestion and the "Open step" above are no longer needed for this configuration.

## Haunted Hotel Expansion (branch `feature/haunted-hotel-expansion`, not on `main`)

All work below ran in **Kiro CLI**, on the local production build (`npm run build`, then `vite preview` on `127.0.0.1`). The public demo at https://ghost-routes.pages.dev/ still serves the first release.

### 2026-11-15 · Spec and stage 1: three-floor graph and scenarios

- **Spec:** [`.kiro/specs/haunted-hotel-expansion/`](../.kiro/specs/haunted-hotel-expansion/), requirements-first, 13 requirements. Requirement 13 draws the ghost trail beside a detour: shared legs once as the solid route, the dashes from the point where the routes part, and a "Door closed" style marker when they part at the closed door.
- **Code:** three floors, the Portrait Gallery with two doors, the Gallery Walk and west passage, a garden vestibule with its own door into Room 104, Floor 3 with the Library and the Moonlight Hall; scenario presets; the lift closes as two segments.
- **Evidence:** `src/routing/expansion.test.ts` (H-tests named after the requirements, plus every preset × closure combination × profile), fast-check properties P6 and P7. `src/routing/hotel.test.ts` of the first release was not edited (same git blob `3593b25f`) and still passes 16 of 16.

### 2026-11-15 · Stage 2: map, floor switcher, scenario interface

- Floor plans in `src/map/layout.ts`, node coordinates aligned with them. `src/map/layout.test.ts` checks that every walking line crosses walls only through the door gap of its own edge.
- Floor switcher (tab list with mini plans), steps as buttons that open their floor (`aria-current="step"`), three-column desktop layout.

### 2026-11-15 · Stage 3: phone layout, motion, local checks

- **Phone (under 760 px):** a compact block (scenario, closures, short status), then the floor switcher and the map, then the move options, the route comparison and the steps. The DOM order is the visual order. On a 390 × 844 screen the floor tabs start at y = 504 px, so the map begins on the first screen; after "Lift out of service" the Floor 1 map with the lift lock is still on the first screen.
- **Motion:** the old route turns into the lilac dashed trail (0.5 s); a detour draws in from the divergence point (0.9 s after 0.45 s) with an amber halo; the moved-to room's door gets two warm pulses (3.2 s) and keeps a ring. Each animation is keyed to its own part of the plan; switching floors or selecting a step shows the final state. With reduced motion every state appears at once.
- **Unit tests:** `npm test` 129 passed (`hotel.test.ts` 16, `expansion.test.ts` 97, `route.property.test.ts` 7, `layout.test.ts` 9).
- **Playwright test runner (Google Chrome):** `npm run test:e2e` 19 passed, 15 skipped by project (desktop-only and phone-only tests, and the recording, which runs only with `EVIDENCE_DIR`). Covered: the original 204 → lift out → 104 demo on desktop and phone; the detour to Room 206 with "Door closed"; the move to Room 302 and a text step that opens Floor 3; the Garden Entrance; both "no suitable route" states; the keyboard; animations that run once and do not replay on floor or step changes; reduced motion (`emulateMedia({ reducedMotion: 'reduce' })`: no running animation, dashes `10px, 8px`, the detour fully drawn, the door ring 4 px); at 390 px the block order, the focus order (skip link, scenario, lift, reset, link to the move options, Floor 1 tab, … Move event, profile) and no sideways scroll in every state.
- **Recording:** [`docs/evidence/expansion/recording-206-detour-and-204-to-104.webm`](evidence/expansion/recording-206-detour-and-204-to-104.webm), about 11 s at 1366 × 900, made by `e2e/record.spec.ts` (Playwright video; `npx playwright install ffmpeg` was run once for it).
- **Screenshots:** `docs/evidence/expansion/`: `phone-390-0-load.png`, `phone-390-1-lift-out.png`, full-page `phone-390-1-lift-out-full.png` and `phone-390-2-moved-104-full.png`, and the four desktop floors.

### 2026-11-15 · Playwright MCP in Kiro CLI, expansion

- **Config:** the existing `.kiro/settings/mcp.json` (`--browser chrome --headless --isolated`), 1366 × 900, local production build.
- **Detour to Room 206:** after "Close central door" the status read "The central door to the Portrait Gallery is closed. Your route to Room 206 is still open via Side Entrance (ramp) → Lift → Gallery Walk. It adds 1 min 11 s." in the same frame as the click. Running animations then: `halo-in`, `route-draw`, `route-draw`; the drawn path was `M320,200L120,200L35,200L35,360L320,360L320,280` (from the central corridor, round by the west passage and the Gallery Walk, into the gallery from the south). Marker: "Door closed"; no dashed trail on Floor 2. 1.8 s later no animation ran; switching to Floor 1 and back to Floor 2 started none. Screenshot [`mcp-5-detour-206.png`](evidence/mcp/mcp-5-detour-206.png).
- **Move 204 → 104:** after "Lift out of service" the status read "No step-free route to Room 204. The lift is out of service." in the same frame; running: `ghost-casing-fade`, `ghost-fade`; after 0.8 s the trail was dashed `10px, 8px` in `rgb(132, 117, 182)`; marker "Lift out of service"; proposal "✕ Room 203 (Blue Room): no step-free route", "✓ Room 104 (Garden Hall): step-free route, 1 min 00 s". After "Move event to Room 104": focus on the heading "Directions to Room 104", status "Event moved to Room 104. Step-free route ready via Side Entrance (ramp).", the lit door at Room 104's door (560, 220). The door pulse had already ended when the next MCP call read the page, so MCP saw only the final ring (4 px); the pulse itself is checked by the Playwright test runner. Screenshots [`mcp-6-lift-out-ghost.png`](evidence/mcp/mcp-6-lift-out-ghost.png), [`mcp-7-moved-104-lit-door.png`](evidence/mcp/mcp-7-moved-104-lit-door.png).
- **Not covered:** no real phone; the phone checks use emulated 390 px and Pixel 7 viewports.
