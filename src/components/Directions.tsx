import { forwardRef, useState } from 'react'
import { buildGuestText, type DirectionStep } from '../routing/directions'
import { HOTEL } from '../routing/hotel'
import { PROFILE_LABELS, type ScenarioPlan } from '../routing/plan'

type CopyState = 'idle' | 'copied' | 'failed'

interface DirectionsProps {
  plan: ScenarioPlan
  /** Built from plan.route in App, the same route the floor plans draw. */
  steps: DirectionStep[]
  selected: number | null
  onSelect: (index: number) => void
}

export const Directions = forwardRef<HTMLHeadingElement, DirectionsProps>(function Directions(
  { plan, steps, selected, onSelect },
  headingRef,
) {
  const [copy, setCopy] = useState<{ state: CopyState; text: string }>({ state: 'idle', text: '' })
  const target = HOTEL.nodes[plan.target]
  const guestText = buildGuestText(HOTEL, plan.route, PROFILE_LABELS[plan.state.profile])
  const currentCopy = copy.text === guestText ? copy.state : 'idle'

  async function handleCopy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(guestText)
      setCopy({ state: 'copied', text: guestText })
    } catch {
      setCopy({ state: 'failed', text: guestText })
    }
  }

  return (
    <section className="card directions" aria-labelledby="directions-title">
      <h2 id="directions-title" className="card__title" tabIndex={-1} ref={headingRef}>
        Directions to {target.label}
      </h2>
      {plan.route.found ? (
        <>
          <p className="directions__meta">
            {PROFILE_LABELS[plan.state.profile]} · Floor {target.floor}
          </p>
          <p className="directions__hint">Select a step to see it on the map.</p>
          <ol className="directions__steps" data-testid="directions">
            {steps.map((step, index) => (
              <li key={index}>
                <button
                  type="button"
                  className={`step${selected === index ? ' is-current' : ''}`}
                  aria-current={selected === index ? 'step' : undefined}
                  onClick={() => onSelect(index)}
                >
                  <span className="step__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="step__text">{step.text}</span>
                  <span className="step__floor" aria-hidden="true">
                    F{step.floor}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="button button--primary" onClick={handleCopy}>
            Copy guest directions
          </button>
          <p className="directions__copy-status" aria-live="polite">
            {currentCopy === 'copied' ? 'Copied: entrance, floor and steps.' : ''}
            {currentCopy === 'failed' ? 'Copy is not available here. Select the text below.' : ''}
          </p>
          {currentCopy === 'failed' && (
            <textarea className="directions__fallback" readOnly value={guestText} rows={8} aria-label="Guest directions" />
          )}
        </>
      ) : (
        <p className="directions__empty">
          There is no {plan.state.profile === 'step-free' ? 'step-free ' : ''}route to {target.label} right now.
        </p>
      )}
    </section>
  )
})
