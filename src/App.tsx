import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Directions } from './components/Directions'
import { FLOOR_PANEL_ID, FloorSwitcher, floorTabId } from './components/FloorSwitcher'
import { ScenarioPicker } from './components/ScenarioPicker'
import { RouteComparison, ScenarioButtons, StatusPanel } from './components/ScenarioControls'
import { FloorPlan } from './map/FloorPlan'
import { floorSummary } from './map/floorData'
import { buildDirections } from './routing/directions'
import { HOTEL } from './routing/hotel'
import { planScenario } from './routing/plan'
import { parseStoredState, scenarioReducer, STORAGE_KEY, type ScenarioAction } from './routing/scenario'
import { SCENARIOS } from './routing/scenarios'
import type { ScenarioState } from './routing/plan'
import type { FloorId } from './routing/types'

function readSession(): ScenarioState {
  try {
    return parseStoredState(window.sessionStorage.getItem(STORAGE_KEY))
  } catch {
    return parseStoredState(null)
  }
}

/** The floor the map opens on for a state: the moved-to room's floor, else the scenario's floor. */
function initialFloor(state: ScenarioState): FloorId {
  return state.movedFrom ? HOTEL.nodes[state.eventRoom].floor : SCENARIOS[state.scenario].focusFloor
}

export default function App() {
  const [state, dispatch] = useReducer(
    (s: ScenarioState, a: ScenarioAction) => scenarioReducer(s, a),
    undefined,
    readSession,
  )
  // One plan per render: the floor plans, the switcher, the status and the directions all read it.
  const plan = useMemo(() => planScenario(HOTEL, state), [state])
  const steps = useMemo(() => buildDirections(HOTEL, plan.route), [plan.route])
  const routeKey = `${plan.target}:${plan.route.legs.map((leg) => leg.edge.id).join(',')}`

  // View state only: which floor is drawn large, and which text step is selected.
  const [floor, setFloor] = useState<FloorId>(() => initialFloor(state))
  const [selected, setSelected] = useState<{ key: string; index: number } | null>(null)
  const [floorNews, setFloorNews] = useState('')
  const selectedIndex = selected && selected.key === routeKey ? selected.index : null
  const highlight = selectedIndex !== null ? steps[selectedIndex]?.legs ?? [] : []

  const directionsHeading = useRef<HTMLHeadingElement>(null)
  const focusDirections = useRef(false)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Private mode or storage disabled: the scenario still works for this page view.
    }
  }, [state])

  useEffect(() => {
    if (focusDirections.current) {
      focusDirections.current = false
      directionsHeading.current?.focus()
    }
  }, [state.eventRoom])

  function showFloor(next: FloorId) {
    setFloor(next)
    setFloorNews(`Showing Floor ${next}.`)
  }

  function act(action: ScenarioAction) {
    dispatch(action)
    // Picking a scenario or resetting opens the scenario's floor. Closures never move the map.
    if (action.type === 'set-scenario') showFloor(SCENARIOS[action.scenario].focusFloor)
    if (action.type === 'reset') showFloor(SCENARIOS.lift.focusFloor)
  }

  function confirmMove(room: string) {
    focusDirections.current = true
    dispatch({ type: 'confirm-move', room })
    showFloor(HOTEL.nodes[room].floor)
  }

  function selectStep(index: number) {
    setSelected({ key: routeKey, index })
    const step = steps[index]
    if (step && step.floor !== floor) showFloor(step.floor)
    // On a phone the map is above the steps; bring it into view without moving focus.
    const map = document.getElementById(FLOOR_PANEL_ID)
    if (map && window.matchMedia('(max-width: 759px)').matches) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      map.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  const words = floorSummary(plan, floor)

  return (
    <div className="page">
      <a className="skip-link" href="#map">
        Jump to the map
      </a>
      <header className="masthead">
        <p className="masthead__hotel">The Hollowmere Hotel</p>
        <h1 className="masthead__title">Ghost Routes</h1>
        <p className="masthead__lead">
          Three floors, one cart of heavy equipment. Close the lift or a door and see which route still works, where the old one
          breaks, and which room the crew can still reach.
        </p>
      </header>

      <main className="layout">
        <div className="layout__controls">
          <ScenarioPicker plan={plan} onPick={(id) => act({ type: 'set-scenario', scenario: id })} />
          <RouteComparison plan={plan} dispatch={act} />
          <ScenarioButtons plan={plan} dispatch={act} />
          <StatusPanel plan={plan} onConfirm={confirmMove} />
        </div>

        <section className="layout__map" id="map" aria-label="Hotel map" tabIndex={-1}>
          <FloorSwitcher plan={plan} floor={floor} onSelect={showFloor} />
          <p className="visually-hidden" aria-live="polite">
            {floorNews}
          </p>
          <figure
            className="floor"
            id={FLOOR_PANEL_ID}
            role="tabpanel"
            aria-labelledby={floorTabId(floor)}
            data-testid={`floor-${floor}`}
          >
            <figcaption className="floor__title">
              Floor {floor}
              {words.length > 0 && <span className="floor__words"> · {words.join(' · ')}</span>}
            </figcaption>
            <FloorPlan plan={plan} floor={floor} highlight={highlight} />
          </figure>
          <ul className="legend" aria-label="Map legend">
            <li>
              <span className="legend__swatch legend__swatch--route" aria-hidden="true" /> Active route
            </li>
            <li>
              <span className="legend__swatch legend__swatch--ghost" aria-hidden="true" /> Ghost trail (old route)
            </li>
            <li>
              <span className="legend__swatch legend__swatch--lock" aria-hidden="true" /> Closed
            </li>
            <li>
              <span className="legend__swatch legend__swatch--carpet" aria-hidden="true" /> Carpeted corridor
            </li>
          </ul>
        </section>

        <div className="layout__directions">
          <Directions plan={plan} steps={steps} selected={selectedIndex} onSelect={selectStep} ref={directionsHeading} />
        </div>
      </main>

      <footer className="footer">
        <p>Fictional hotel. Routing runs in your browser; your changes stay in this tab only.</p>
      </footer>
    </div>
  )
}
