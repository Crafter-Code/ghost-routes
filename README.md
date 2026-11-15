# Ghost Routes

Responsive web app for desktop and mobile browsers.

Ghost Routes plans routes inside The Hollowmere Hotel, a fictional two-floor hotel. A workshop is booked in Room 204, and the crew brings heavy equipment on a cart. Mark the lift out of service and the app shows:

- which route still works for guests on foot (the Grand Staircase),
- that there is no step-free route to Room 204, and why,
- a dashed **ghost trail** of the old step-free route, ending at the closed lift door on Floor 1,
- a verified alternative: Room 104, offered only after the routing confirms a step-free route to it,
- new guest directions (entrance, floor, steps) you can copy.

The two-floor map, the route graph and the routing all run in the browser. There is no login and no server state. Each visitor's changes live in their own browser tab (`sessionStorage`).

## Requirements

- Node.js **26.7.0** (pinned in `.nvmrc` and `package.json` `engines`)
- npm 11 or newer (comes with Node.js 26)

With nvm: `nvm use`. `.npmrc` sets `engine-strict=true`, so `npm ci` stops on a different Node.js major version.

## Run from a clean clone

```sh
git clone <repository-url> ghost-routes
cd ghost-routes
npm ci
npm run build
npm run preview
```

Open the URL that `npm run preview` prints (by default <http://localhost:4173>).

For development with hot reload: `npm run dev`.

## Try the scenario

1. Under **Routes to Room 204**, compare **Steps allowed** (Main Entrance → Grand Staircase) and **Step-free** (Side Entrance ramp → Lift).
2. Switch on **Lift out of service**. With **Step-free** selected you see: *No step-free route to Room 204. The lift is out of service.* A lock icon marks the lift on both floors, and the dashed ghost trail stops at the lift door on Floor 1.
3. Select **Steps allowed**: the Grand Staircase route to Room 204 is still open. Select **Step-free** again.
4. Under **Move the event?**, Room 203 is checked and rejected, Room 104 is confirmed reachable. Press **Move event to Room 104**.
5. The map shows a solid route to Room 104 and the directions update. Press **Copy guest directions**.
6. Press **Reset scenario** to start again.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm test` | All unit and property tests (Vitest) |
| `npm run test:routing` | Routing tests only: hotel scenario + fast-check properties |
| `npm run test:e2e` | Builds, starts `vite preview`, and runs the full scenario in Playwright on a desktop and a phone viewport |

`test:e2e` uses the installed Google Chrome by default. Without Chrome, run `npx playwright install chromium` and then `PW_CHANNEL=chromium npm run test:e2e`. To test a deployed copy: `BASE_URL=https://example.org npm run test:e2e`.

## Project layout

```
.kiro/specs/ghost-routes/   Requirements-first spec: requirements.md, design.md, tasks.md
src/routing/                Graph, routing, ghost trail, relocation, directions (no React)
src/map/                    Floor layouts and the SVG floor plan
src/components/             Controls, status, directions
e2e/                        Playwright scenario on the production build
```

The map and the text directions both read one route result per render (`planScenario` in `src/routing/plan.ts`), so they cannot disagree.

## License

MIT. The hotel, floor plans, carpet pattern and icons are original work for this project.
