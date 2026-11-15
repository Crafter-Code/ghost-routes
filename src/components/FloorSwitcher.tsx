import { useRef, type KeyboardEvent } from 'react'
import { FloorPlan } from '../map/FloorPlan'
import { FLOOR_IDS, floorSummary } from '../map/floorData'
import type { ScenarioPlan } from '../routing/plan'
import type { FloorId } from '../routing/types'

export const FLOOR_PANEL_ID = 'floor-panel'
export const floorTabId = (floor: FloorId) => `floor-tab-${floor}`

/**
 * Tab list of the three floors. Each tab shows a small plan with the same route, ghost trail and locks
 * as the big map, and says in words what is on that floor. Arrow keys, Home and End move between floors.
 */
export function FloorSwitcher({
  plan,
  floor,
  onSelect,
}: {
  plan: ScenarioPlan
  floor: FloorId
  onSelect: (floor: FloorId) => void
}) {
  const tabs = useRef<Record<number, HTMLButtonElement | null>>({})

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = FLOOR_IDS.indexOf(floor)
    let next: FloorId | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = FLOOR_IDS[(index + 1) % FLOOR_IDS.length]
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = FLOOR_IDS[(index + FLOOR_IDS.length - 1) % FLOOR_IDS.length]
    if (event.key === 'Home') next = FLOOR_IDS[0]
    if (event.key === 'End') next = FLOOR_IDS[FLOOR_IDS.length - 1]
    if (next === null) return
    event.preventDefault()
    onSelect(next)
    tabs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Floors" className="switcher">
      {FLOOR_IDS.map((f) => {
        const words = floorSummary(plan, f)
        const selected = f === floor
        return (
          <button
            key={f}
            ref={(el) => {
              tabs.current[f] = el
            }}
            type="button"
            role="tab"
            id={floorTabId(f)}
            aria-selected={selected}
            aria-controls={FLOOR_PANEL_ID}
            tabIndex={selected ? 0 : -1}
            className={`switcher__tab${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(f)}
            onKeyDown={onKeyDown}
            data-testid={`floor-tab-${f}`}
          >
            <span className="switcher__name">Floor {f}</span>
            <span className="switcher__mini" data-testid={`floor-${f}-mini`}>
              <FloorPlan plan={plan} floor={f} compact />
            </span>
            <span className="switcher__words">{words.length > 0 ? words.join(' · ') : 'Nothing on route'}</span>
          </button>
        )
      })}
    </div>
  )
}
