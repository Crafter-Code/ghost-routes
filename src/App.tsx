import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Directions } from './components/Directions'
import { RouteComparison, ScenarioButtons, StatusPanel } from './components/ScenarioControls'
import { FloorPlan } from './map/FloorPlan'
import { HOTEL } from './routing/hotel'
import { planScenario } from './routing/plan'
import { parseStoredState, scenarioReducer, STORAGE_KEY, type ScenarioAction } from './routing/scenario'
import type { ScenarioState } from './routing/plan'

function readSession(): ScenarioState {
  try {
    return parseStoredState(window.sessionStorage.getItem(STORAGE_KEY))
  } catch {
    return parseStoredState(null)
  }
}

export default function App() {
  const [state, dispatch] = useReducer(
    (s: ScenarioState, a: ScenarioAction) => scenarioReducer(s, a),
    undefined,
    readSession,
  )
  // One plan per render: the floor plans, status and directions all read it.
  const plan = useMemo(() => planScenario(HOTEL, state), [state])
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

  function confirmMove(room: string) {
    focusDirections.current = true
    dispatch({ type: 'confirm-move', room })
  }

  return (
    <div className="page">
      <header className="masthead">
        <p className="masthead__hotel">The Hollowmere Hotel</p>
        <h1 className="masthead__title">Ghost Routes</h1>
        <p className="masthead__lead">
          A workshop is booked in Room 204. The crew brings heavy equipment on a cart. Can it still get there when the lift
          goes out?
        </p>
        <ol className="masthead__steps" aria-label="Try the scenario">
          <li>Compare both routes to Room 204.</li>
          <li>Switch on “Lift out of service”.</li>
          <li>Follow the ghost trail and move the event.</li>
          <li>Copy the new guest directions.</li>
        </ol>
      </header>

      <main className="layout">
        <div className="layout__controls">
          <RouteComparison plan={plan} dispatch={dispatch} />
          <ScenarioButtons plan={plan} dispatch={dispatch} />
          <StatusPanel plan={plan} onConfirm={confirmMove} />
        </div>
        <div className="layout__maps">
          <FloorPlan plan={plan} floor={1} />
          <FloorPlan plan={plan} floor={2} />
          <ul className="legend" aria-label="Map legend">
            <li><span className="legend__swatch legend__swatch--route" aria-hidden="true" /> Active route</li>
            <li><span className="legend__swatch legend__swatch--ghost" aria-hidden="true" /> Ghost trail (old route)</li>
            <li><span className="legend__swatch legend__swatch--carpet" aria-hidden="true" /> Carpeted corridor</li>
          </ul>
        </div>
        <div className="layout__directions">
          <Directions plan={plan} ref={directionsHeading} />
        </div>
      </main>

      <footer className="footer">
        <p>Fictional hotel. Routing runs in your browser; your changes stay in this tab only.</p>
      </footer>
    </div>
  )
}
