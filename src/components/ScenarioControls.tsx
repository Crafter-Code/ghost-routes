import { routeSummary } from '../routing/directions'
import { formatTime } from '../routing/format'
import { HOTEL, LIFT_EDGE } from '../routing/hotel'
import { PROFILE_LABELS, PROFILES, type ScenarioPlan } from '../routing/plan'
import type { ScenarioAction } from '../routing/scenario'
import type { Profile } from '../routing/types'

const PROFILE_HINTS: Record<Profile, string> = {
  'steps-allowed': 'Guests on foot',
  'step-free': 'Equipment cart, wheelchair, pram',
}

export { formatTime }

export function RouteComparison({ plan, dispatch }: { plan: ScenarioPlan; dispatch: (a: ScenarioAction) => void }) {
  const target = HOTEL.nodes[plan.target]
  return (
    <fieldset className="card comparison">
      <legend className="card__title">Routes to {target.label}</legend>
      {PROFILES.map((profile) => {
        const route = plan.comparison[profile]
        return (
          <label key={profile} className={`profile-option${plan.state.profile === profile ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="profile"
              value={profile}
              checked={plan.state.profile === profile}
              onChange={() => dispatch({ type: 'set-profile', profile })}
            />
            <span className="profile-option__body">
              <span className="profile-option__name">{PROFILE_LABELS[profile]}</span>
              <span className="profile-option__hint">{PROFILE_HINTS[profile]}</span>
              <span className={`profile-option__route${route.found ? '' : ' is-blocked'}`} data-testid={`summary-${profile}`}>
                {route.found ? `${routeSummary(HOTEL, route)} · ${formatTime(route.cost)}` : 'No route'}
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

export function ScenarioButtons({ plan, dispatch }: { plan: ScenarioPlan; dispatch: (a: ScenarioAction) => void }) {
  const liftOut = plan.closed.has(LIFT_EDGE)
  return (
    <div className="card actions">
      <button
        type="button"
        className={`toggle${liftOut ? ' is-on' : ''}`}
        aria-pressed={liftOut}
        onClick={() => dispatch({ type: 'toggle-lift' })}
      >
        <span className="toggle__track" aria-hidden="true">
          <span className="toggle__thumb" />
        </span>
        Lift out of service
      </button>
      <button type="button" className="button button--quiet" onClick={() => dispatch({ type: 'reset' })}>
        Reset scenario
      </button>
    </div>
  )
}

export function StatusPanel({
  plan,
  onConfirm,
}: {
  plan: ScenarioPlan
  onConfirm: (room: string) => void
}) {
  const showCandidates = !plan.route.found && plan.state.profile === 'step-free'
  return (
    <section className="card status-card" aria-label="Route status">
      <p role="status" aria-live="polite" aria-atomic="true" className={`status status--${plan.status.tone}`} data-testid="status">
        {plan.status.text}
      </p>
      {plan.ghost && (
        <p className="ghost-note">
          <span className="ghost-note__swatch" aria-hidden="true" /> Ghost trail: the usual {plan.state.profile === 'step-free' ? 'step-free ' : ''}
          route now stops at {HOTEL.nodes[plan.ghost.endsAt].phrase}.
        </p>
      )}
      {showCandidates && (
        <div className="proposal" data-testid="proposal">
          <h2 className="proposal__title">Move the event?</h2>
          <p className="proposal__lead">Checked with the same step-free rules and the lift out:</p>
          <ul className="proposal__list">
            {plan.candidates.map((check) => (
              <li key={check.room} className={check.route.found ? 'is-ok' : 'is-rejected'}>
                <span aria-hidden="true">{check.route.found ? '✓' : '✕'}</span>{' '}
                {HOTEL.nodes[check.room].phrase}:{' '}
                {check.route.found ? `step-free route, ${formatTime(check.route.cost)}` : 'no step-free route'}
              </li>
            ))}
          </ul>
          {plan.proposal ? (
            <button type="button" className="button button--primary" onClick={() => onConfirm(plan.proposal!.room)}>
              Move event to {HOTEL.nodes[plan.proposal.room].label}
            </button>
          ) : (
            <p className="proposal__none">No step-free alternative found.</p>
          )}
        </div>
      )}
    </section>
  )
}
