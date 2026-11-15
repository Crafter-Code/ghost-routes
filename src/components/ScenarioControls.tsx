import { routeSummary } from '../routing/directions'
import { formatTime } from '../routing/format'
import { HOTEL, LIFT_EDGES } from '../routing/hotel'
import { PROFILE_LABELS, PROFILES, type ScenarioPlan } from '../routing/plan'
import type { ScenarioAction } from '../routing/scenario'
import { SCENARIOS } from '../routing/scenarios'
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

/** The closure controls of the current scenario, and Reset. */
export function ScenarioButtons({ plan, dispatch }: { plan: ScenarioPlan; dispatch: (a: ScenarioAction) => void }) {
  const controls = SCENARIOS[plan.state.scenario].controls
  return (
    <section className="card actions" aria-labelledby="actions-title">
      <h2 id="actions-title" className="card__title actions__title">
        Organizer action
      </h2>
      <div className="actions__buttons">
        {controls.map((control) => {
          const on = control.edges.every((id) => plan.closed.has(id))
          return (
            <button
              key={control.id}
              type="button"
              className={`toggle${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => dispatch({ type: 'toggle-closure', id: control.id })}
            >
              <span className="toggle__track" aria-hidden="true">
                <span className="toggle__thumb" />
              </span>
              {control.label}
            </button>
          )
        })}
        <button type="button" className="button button--quiet" onClick={() => dispatch({ type: 'reset' })}>
          Reset scenario
        </button>
      </div>
    </section>
  )
}

function placeWithFloor(nodeId: string): string {
  const node = HOTEL.nodes[nodeId]
  return node.phrase.includes('Floor') ? node.phrase : `${node.phrase} on Floor ${node.floor}`
}

function ghostNote(plan: ScenarioPlan): string | null {
  if (!plan.ghost || !plan.failure) return null
  const kind = plan.state.profile === 'step-free' ? 'step-free ' : ''
  if (plan.ghostDrawn && plan.ghostDrawn.legs.length > 0) {
    return `Ghost trail: the usual ${kind}route now stops at ${HOTEL.nodes[plan.ghost.endsAt].phrase}.`
  }
  // The new route turns away right at the closed door: nothing is dashed, the marker shows the break.
  return `${plan.failure.label} at ${placeWithFloor(plan.failure.at)}. The solid line takes the way round.`
}

function checkedAgainst(plan: ScenarioPlan): string {
  const rules = plan.state.profile === 'step-free' ? 'step-free' : 'steps-allowed'
  const liftOnly = [...plan.closed].every((id) => LIFT_EDGES.includes(id))
  const liftClosed = [...plan.closed].some((id) => LIFT_EDGES.includes(id))
  const what = liftOnly ? 'the lift out' : liftClosed ? 'the closed doors and the lift out' : 'the closed doors'
  return `Checked with the same ${rules} rules and ${what}:`
}

export const MOVE_OPTIONS_ID = 'move-options'

/** Whether the details card has anything to show. */
export function hasStatusDetails(plan: ScenarioPlan): boolean {
  const entrances = plan.entranceChecks.some((check) => plan.closed.has(check.gate))
  return entrances || (!plan.route.found && plan.candidates.length > 0) || plan.otherProfileHint !== null
}

/**
 * The short status: the live region and the note about the ghost trail. Updated in the same render as
 * the state, so text, actions and focus never wait for an animation.
 */
export function StatusSummary({ plan, linkToDetails }: { plan: ScenarioPlan; linkToDetails: boolean }) {
  const note = ghostNote(plan)
  const moveLink = linkToDetails && hasStatusDetails(plan)
  return (
    <section className="card status-card" aria-label="Route status">
      <p role="status" aria-live="polite" aria-atomic="true" className={`status status--${plan.status.tone}`} data-testid="status">
        {plan.status.text}
      </p>
      {note && (
        <p className="ghost-note" data-testid="ghost-note">
          <span className={`ghost-note__swatch${plan.ghostDrawn?.legs.length ? '' : ' ghost-note__swatch--lock'}`} aria-hidden="true" />
          {note}
        </p>
      )}
      {moveLink && (
        <a className="status-card__more" href={`#${MOVE_OPTIONS_ID}`}>
          {plan.proposal ? `Move options below the map (${HOTEL.nodes[plan.proposal.room].label} checked)` : 'Details below the map'}
        </a>
      )}
    </section>
  )
}

/** Entrance check, the relocation proposal and the other-profile hint. */
export function StatusDetails({ plan, onConfirm }: { plan: ScenarioPlan; onConfirm: (room: string) => void }) {
  if (!hasStatusDetails(plan)) return null
  const stepFree = plan.state.profile === 'step-free'
  const showEntrances = plan.entranceChecks.some((check) => plan.closed.has(check.gate))
  return (
    <section className="card status-details" id={MOVE_OPTIONS_ID} aria-label="Move options" tabIndex={-1}>
      {showEntrances && (
        <div className="checks" data-testid="entrance-checks">
          <h2 className="checks__title">Entrances checked</h2>
          <ul className="checks__list">
            {plan.entranceChecks.map((check) => (
              <li key={check.entrance} className={check.route.found ? 'is-ok' : 'is-rejected'}>
                <span aria-hidden="true">{check.route.found ? '✓' : '✕'}</span> {HOTEL.nodes[check.entrance].label}:{' '}
                {check.route.found ? `${stepFree ? 'step-free ' : ''}route, ${formatTime(check.route.cost)}` : check.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!plan.route.found && plan.candidates.length > 0 && (
        <div className="proposal" data-testid="proposal">
          <h2 className="proposal__title">Move the event?</h2>
          <p className="proposal__lead">{checkedAgainst(plan)}</p>
          <ul className="proposal__list">
            {plan.candidates.map((check) => (
              <li key={check.room} className={check.route.found ? 'is-ok' : 'is-rejected'}>
                <span aria-hidden="true">{check.route.found ? '✓' : '✕'}</span> {HOTEL.nodes[check.room].phrase}:{' '}
                {check.route.found
                  ? `${stepFree ? 'step-free ' : ''}route, ${formatTime(check.route.cost)}`
                  : `no ${stepFree ? 'step-free ' : ''}route`}
              </li>
            ))}
          </ul>
          {plan.proposal ? (
            <button type="button" className="button button--primary" onClick={() => onConfirm(plan.proposal!.room)}>
              Move event to {HOTEL.nodes[plan.proposal.room].label}
            </button>
          ) : (
            <p className="proposal__none" data-testid="no-suitable-route">
              {plan.noAlternativeText}
            </p>
          )}
        </div>
      )}
      {plan.otherProfileHint && (
        <p className="other-profile" data-testid="other-profile">
          {plan.otherProfileHint}
        </p>
      )}
    </section>
  )
}
