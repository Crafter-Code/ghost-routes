# Ghost Routes

Responsive web app for desktop and mobile browsers.

Ghost Routes plans routes inside The Hollowmere Hotel, a fictional three-floor hotel. An organizer moves a crew with heavy equipment on a cart, so the route must be step-free. Close the lift, a door or an entrance and the app shows:

- which route still works, and for whom (guests on foot can still use the Grand Staircase),
- a dashed lilac **ghost trail** of the old route up to the closed transition, with a lock and a caption such as "Lift out of service" or "Door closed",
- an amber detour when one exists, drawn from the point where it leaves the old route,
- a verified alternative room, offered only after the routing confirms a route to it in the selected profile,
- a clear "No step-free alternative found." when the room and every alternative are unreachable,
- guest directions (entrance, floor, numbered steps) you can copy. Selecting a step opens its floor on the map.

The three-floor map, the route graph and the routing all run in the browser. There is no login and no server state. Each visitor's changes live in their own browser tab (`sessionStorage`).

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

## Try the scenarios

Pick a scenario at the top left (on a phone: at the top). The floor switcher shows all three floors; the large map shows one.

**Lift out, move to Room 104** (the original demo)

1. Compare **Steps allowed** (Main Entrance → Grand Staircase) and **Step-free** (Side Entrance ramp → Lift) under **Routes to Room 204**.
2. Press **Lift out of service**. Step-free reads *No step-free route to Room 204. The lift is out of service.* On Floor 1 the old route turns into a dashed ghost trail that stops at the lift door.
3. Under **Move the event?**, Room 203 is rejected and Room 104 is confirmed. Press **Move event to Room 104**: the door of Room 104 lights up and focus moves to the new directions.
4. Press **Copy guest directions**, then **Reset scenario**.

**Gallery door closed** (Room 206, Floor 2)

1. Press **Close central door**. The amber detour draws in along the west passage and the Gallery Walk to the gallery's south door; the central door shows **Door closed**. The route takes 1 min 11 s longer.
2. Also press **Close Gallery Walk door**. Room 206 is unreachable; the Moonlight Hall (Room 302, Floor 3) is offered. Move the event there and select the step *Take the lift up to Floor 3.* to open Floor 3.
3. Also press **Lift out of service**: no step-free alternative is left.

**Side Entrance closed** (Room 204)

1. Press **Close Side Entrance**. The route uses the level Garden Entrance and its vestibule (+25 s). **Entrances checked** lists all three entrances and why two fail.
2. Also press **Close Garden Entrance**: no step-free route and no alternative; the app says that Steps allowed still reaches Room 204.

With *reduce motion* set in the operating system, every state appears at once without animation.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm test` | All unit and property tests (Vitest) |
| `npm run test:routing` | Routing tests only: hotel scenario + fast-check properties |
| `npm run test:e2e` | Builds, starts `vite preview`, and runs the scenarios in Playwright on a desktop and a phone viewport (`e2e/scenario.spec.ts`: the original demo; `e2e/expansion.spec.ts`: three floors, motion and reduced motion, the 390 px layout and focus order) |

`test:e2e` uses the installed Google Chrome by default. Without Chrome, run `npx playwright install chromium` and then `PW_CHANNEL=chromium npm run test:e2e`. To test a deployed copy: `BASE_URL=https://example.org npm run test:e2e`. To save the review screenshots and a short screen recording: `EVIDENCE_DIR=docs/evidence/expansion npm run test:e2e` (the recording needs `npx playwright install ffmpeg` once).

## Project layout

```
.kiro/specs/ghost-routes/              First spec: the two-floor demo (Room 204 → 104)
.kiro/specs/haunted-hotel-expansion/   Second spec: three floors, three scenarios, map, motion
src/routing/                           Graph, routing, ghost trail, scenarios, plan, directions (no React)
src/map/                               Floor layouts, carpets and the SVG floor plan
src/components/                        Scenario picker, controls, status, floor switcher, directions
e2e/                                   Playwright scenarios on the production build
docs/evidence/                         Screenshots, the hook log and the screen recording
```

The map, the floor switcher and the text directions all read one route result per render (`planScenario` in `src/routing/plan.ts`), so they cannot disagree. The map draws the active route from `plan.route`, the dashed trail from `plan.ghostDrawn` and the break from `plan.failure`.

## License

MIT. The hotel, floor plans, carpet pattern and icons are original work for this project.
