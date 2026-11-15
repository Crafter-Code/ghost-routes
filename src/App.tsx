import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Directions } from './components/Directions'
import { FLOOR_PANEL_ID, FloorSwitcher, floorTabId } from './components/FloorSwitcher'
import { ScenarioPicker } from './components/ScenarioPicker'
import { RouteComparison, ScenarioButtons, StatusDetails, StatusSummary } from './components/ScenarioControls'
import { FloorPlan, type MapAnimation } from './map/FloorPlan'
import { floorSummary } from './map/floorData'
import { buildDirections } from './routing/directions'
import { HOTEL } from './routing/hotel'
import { planScenario, type ScenarioPlan } from './routing/plan'
import { parseStoredState, scenarioReducer, STORAGE_KEY, type ScenarioAction } from './routing/scenario'
import { SCENARIOS } from './routing/scenarios'
import type { ScenarioState } from './routing/plan'
import type { FloorId } from './routing/types'
import { useMediaQuery } from './useMediaQuery'

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

/** What each animation depends on. An animation runs only when its own part of the plan changes. */
function signatures(plan: ScenarioPlan) {
  const ids = (legs: { edge: { id: string } }[]) => legs.map((leg) => leg.edge.id).join(',')
  return {
    ghost: plan.ghostDrawn && plan.ghostDrawn.legs.length > 0 ? `${plan.target}|${ids(plan.ghostDrawn.legs)}` : '',
    route: `${plan.target}|${ids(plan.route.legs)}`,
    detour: plan.route.found && plan.divergeAt !== null,
    door: plan.state.movedFrom && plan.route.found ? plan.target : '',
  }
}

const NO_ANIMATION: MapAnimation = { ghost: null, detour: null, door: null }

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
  const narrow = useMediaQuery('(max-width: 759px)')

  // View state only: which floor is drawn large, and which text step is selected.
  const [floor, setFloor] = useState<FloorId>(() => initialFloor(state))
  const [selected, setSelected] = useState<{ key: string; index: number } | null>(null)
  const [floorNews, setFloorNews] = useState('')
  const selectedIndex = selected && selected.key === routeKey ? selected.index : null
  const highlight = selectedIndex !== null ? (steps[selectedIndex]?.legs ?? []) : []

  // Animations follow changes of the route state, computed in render so the first frame already
  // starts from the animation's first keyframe. The first page load does not animate.
  const sigs = signatures(plan)
  const [seen, setSeen] = useState(sigs)
  const [animation, setAnimation] = useState<MapAnimation>(NO_ANIMATION)
  if (seen.ghost !== sigs.ghost || seen.route !== sigs.route || seen.door !== sigs.door) {
    setSeen(sigs)
    setAnimation((current) => ({
      ghost: seen.ghost !== sigs.ghost ? sigs.ghost || null : current.ghost,
      detour: seen.route !== sigs.route ? (sigs.detour ? sigs.route : null) : current.detour,
      door: seen.door !== sigs.door ? sigs.door || null : current.door,
    }))
  }

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

  /** The visitor looks at another floor or step: show final states, never replay an animation. */
  function viewFloor(next: FloorId) {
    setAnimation(NO_ANIMATION)
    showFloor(next)
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
    setAnimation(NO_ANIMATION)
    const step = steps[index]
    if (step && step.floor !== floor) showFloor(step.floor)
    // On a phone the map is above the steps; bring it into view without moving focus.
    const map = document.getElementById(FLOOR_PANEL_ID)
    if (map && narrow) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      map.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  const words = floorSummary(plan, floor)

  const picker = <ScenarioPicker key="picker" plan={plan} onPick={(id) => act({ type: 'set-scenario', scenario: id })} />
  const comparison = <RouteComparison key="comparison" plan={plan} dispatch={act} />
  const buttons = <ScenarioButtons key="buttons" plan={plan} dispatch={act} />
  const summary = <StatusSummary key="summary" plan={plan} linkToDetails={narrow} />
  const details = <StatusDetails key="details" plan={plan} onConfirm={confirmMove} />
  const map = (
    <section key="map" className="layout__map" id="map" aria-label="Hotel map" tabIndex={-1}>
      <FloorSwitcher plan={plan} floor={floor} onSelect={viewFloor} />
      <p className="visually-hidden" aria-live="polite">
        {floorNews}
      </p>
      <figure className="floor" id={FLOOR_PANEL_ID} role="tabpanel" aria-labelledby={floorTabId(floor)} data-testid={`floor-${floor}`}>
        <figcaption className="floor__title">
          Floor {floor}
          {words.length > 0 && <span className="floor__words"> · {words.join(' · ')}</span>}
        </figcaption>
        <FloorPlan plan={plan} floor={floor} highlight={highlight} animation={animation} />
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
  )
  const directions = (
    <div key="directions" className="layout__directions">
      <Directions plan={plan} steps={steps} selected={selectedIndex} onSelect={selectStep} ref={directionsHeading} />
    </div>
  )

  return (
    <div className="page">
      <a className="skip-link" href="#map">
        Jump to the map
      </a>
      <header className="masthead">
        <p className="masthead__hotel">The Hollowmere Hotel</p>
        <h1 className="masthead__title">Ghost Routes</h1>
        {narrow ? (
          <p className="masthead__lead">Close the lift or a door and see where the old route breaks.</p>
        ) : (
          <p className="masthead__lead">
            Three floors, one cart of heavy equipment. Close the lift or a door and see which route still works, where the old one
            breaks, and which room the crew can still reach.
          </p>
        )}
      </header>

      {narrow ? (
        // Phone: the DOM order is the visual order, so focus follows it. The map comes right after
        // the compact block; the full comparison and the move options follow the map.
        <main className="layout layout--narrow">
          <div className="compact-block">
            {picker}
            {buttons}
            {summary}
          </div>
          {map}
          {details}
          {comparison}
          {directions}
        </main>
      ) : (
        <main className="layout">
          <div className="layout__controls">
            {picker}
            {comparison}
            {buttons}
            {summary}
            {details}
          </div>
          {map}
          {directions}
        </main>
      )}

      <footer className="footer">
        <p>Fictional hotel. Routing runs in your browser; your changes stay in this tab only.</p>
      </footer>
    </div>
  )
}
