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
| Playwright MCP in `.kiro/settings/mcp.json` | **Pending** | Not configured yet. The Playwright *test runner* is used (below), not the MCP server |
| Kiro CLI edge-case routing checks | **Pending** | CLI so far used only to verify the hook |
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
