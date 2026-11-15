# Playwright MCP QA run

Prompt for a Kiro agent with the `playwright` MCP server from `.kiro/settings/mcp.json`. Start the production build first:

```sh
npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Then give the agent this prompt (replace the URL for the public build):

> Use only the playwright MCP tools. Open http://127.0.0.1:4173/. Read the page with browser_snapshot after every step and quote the exact text you rely on.
>
> 1. Desktop (1366×900). Under "Routes to Room 204", report both summaries: Steps allowed must mention "Main Entrance (front steps) → Grand Staircase", Step-free must mention "Side Entrance (ramp) → Lift". Take a screenshot `mcp-1-routes-204.png`.
> 2. Press "Lift out of service". Check that it has pressed=true and that the status (role=status) reads exactly "No step-free route to Room 204. The lift is out of service." Check that the Floor 1 plan description mentions a dashed ghost trail ending at "the lift door on Floor 1". Screenshot `mcp-2-lift-out.png`.
> 3. Select "Steps allowed": status must say the route to Room 204 is still open via the Grand Staircase. Select "Step-free" again.
> 4. Check the proposal lists Room 203 as "no step-free route" and Room 104 as "step-free route". Press "Move event to Room 104". Report which element has focus (must be the heading "Directions to Room 104") and the status text (must start "Event moved to Room 104."). Screenshot `mcp-3-moved-104.png`.
> 5. Press "Copy guest directions" and report the confirmation text.
> 6. Press "Reset scenario". Directions must be for Room 204 and the lift toggle must be pressed=false.
> 7. Mobile: resize to 390×844, reload, repeat steps 2 and 4. Report whether the directions are below the floor plans and whether the page scrolls sideways. Screenshot `mcp-4-mobile.png`.
> 8. Keyboard: at 1366×900, reset, then use only browser_press_key (Tab, Shift+Tab, Space, Enter). Reach and press "Lift out of service", then "Move event to Room 104". After each key that moves focus, report the focused element from the snapshot.
>
> End with a table: step, expected, observed, pass/fail.
