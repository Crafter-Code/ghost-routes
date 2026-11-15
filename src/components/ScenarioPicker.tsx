import type { ScenarioPlan } from '../routing/plan'
import { SCENARIO_IDS, SCENARIOS, type ScenarioId } from '../routing/scenarios'

export function ScenarioPicker({ plan, onPick }: { plan: ScenarioPlan; onPick: (id: ScenarioId) => void }) {
  return (
    <fieldset className="card picker">
      <legend className="card__title">Scenario</legend>
      {SCENARIO_IDS.map((id) => {
        const def = SCENARIOS[id]
        const selected = plan.state.scenario === id
        return (
          <label key={id} className={`picker__option${selected ? ' is-selected' : ''}`}>
            <input type="radio" name="scenario" value={id} checked={selected} onChange={() => onPick(id)} />
            <span className="picker__body">
              <span className="picker__title">{def.title}</span>
              <span className="picker__hint">{def.hint}</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
