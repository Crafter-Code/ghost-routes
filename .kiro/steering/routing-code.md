---
inclusion: fileMatch
fileMatchPattern: ["src/routing/**/*.ts", "src/map/**/*.tsx", "src/components/**/*.tsx"]
---

# Working on routing, map and directions code

- `isTraversable` in `src/routing/route.ts` is the only place that applies the profile rule and closures. Do not copy that check elsewhere.
- `ghostTrail` slices `baseline.legs` up to the first closed leg. Do not compute the trail from the active route.
- Components receive a `ScenarioPlan` and render it. They do not route.
- After changing `src/routing/`, run `npm run test:routing`. The File Save hook in `.kiro/hooks/routing-tests-on-save.json` does this automatically.
- A new rule needs: an acceptance criterion in `requirements.md`, a unit test in `src/routing/hotel.test.ts`, and, if it holds for any graph, a fast-check property in `src/routing/route.property.test.ts` that names the requirement.
- If a property fails, keep the shrunk counterexample and the seed from the fast-check report in a regression test.
