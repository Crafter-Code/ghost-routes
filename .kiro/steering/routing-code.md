---
inclusion: fileMatch
fileMatchPattern: ["src/routing/**/*.ts", "src/map/**/*.tsx", "src/components/**/*.tsx"]
---

# Working on routing, map and directions code

- `isTraversable` in `src/routing/route.ts` is the only place that applies the profile rule and closures. Do not copy that check elsewhere.
- `ghostTrail` slices `baseline.legs` up to the first closed leg. Do not compute the trail from the active route.
- Components receive a `ScenarioPlan` and render it. They do not route. Test `H8.2` in `src/routing/expansion.test.ts` fails if a file in `src/map/` or `src/components/` mentions `findRoute`.
- The map draws the active line from `plan.route`, the dashed trail from `plan.ghostDrawn` (not `plan.ghost`), and the break from `plan.failure`. `plan.ghost` stays the full baseline prefix for the data rule; `ghostDrawn` is the part after the point where the routes part.
- Node coordinates in `src/routing/hotel.ts` and the drawings in `src/map/layout.ts` must agree: every walking line crosses walls only through a door gap of its own edge. `src/map/layout.test.ts` checks this; give a new edge that passes a wall a `DoorShape` with its edge id.
- After changing `src/routing/`, run `npm run test:routing`. The File Save hook in `.kiro/hooks/routing-tests-on-save.json` does this automatically.
- Tests by scope:
  - `src/routing/hotel.test.ts` checks the original scenario (Room 204, lift out, move to Room 104) from `.kiro/specs/ghost-routes/`. Do not edit it; it must keep passing unchanged.
  - `src/routing/expansion.test.ts` holds the tests of `.kiro/specs/haunted-hotel-expansion/`, named `H<requirement>.<criterion>`, including the check over every preset, closure combination and profile.
  - `src/routing/route.property.test.ts` holds fast-check properties that hold for any graph (P1 to P7).
  - `src/map/layout.test.ts` checks that the floor plans match the graph.
- A new rule needs: an acceptance criterion in the spec it belongs to, a unit test in the test file of that spec (above), and, if it holds for any graph, a fast-check property in `src/routing/route.property.test.ts` that names the requirement.
- If a property fails, keep the shrunk counterexample and the seed from the fast-check report in a regression test.
