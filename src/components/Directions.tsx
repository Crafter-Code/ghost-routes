import { forwardRef, useState } from 'react'
import { buildDirections, buildGuestText } from '../routing/directions'
import { HOTEL } from '../routing/hotel'
import { PROFILE_LABELS, type ScenarioPlan } from '../routing/plan'

type CopyState = 'idle' | 'copied' | 'failed'

export const Directions = forwardRef<HTMLHeadingElement, { plan: ScenarioPlan }>(function Directions({ plan }, headingRef) {
  const [copy, setCopy] = useState<{ state: CopyState; text: string }>({ state: 'idle', text: '' })
  const target = HOTEL.nodes[plan.target]
  // Same route object the floor plans draw.
  const steps = buildDirections(HOTEL, plan.route)
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
          <ol className="directions__steps" data-testid="directions">
            {steps.map((step, index) => (
              <li key={index}>{step.text}</li>
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
