// Back / Next footer shown at the bottom of each input step, so users are
// walked through the flow in order without hunting for the next accordion.
// The Next button turns green once the current step is complete.

interface Props {
  onBack?: () => void
  backLabel?: string
  onNext: () => void
  nextLabel: string
  /** Current step is finished — style Next as the confident "go" action. */
  ready?: boolean
  /** Plain hint shown when the step isn't complete yet. */
  todoHint?: string
}

export function StepNav({ onBack, backLabel, onNext, nextLabel, ready, todoHint }: Props) {
  return (
    <div className="step-nav">
      {onBack ? (
        <button type="button" className="step-nav-back" onClick={onBack}>
          ← {backLabel}
        </button>
      ) : (
        <span />
      )}
      <div className="step-nav-right">
        {!ready && todoHint && <span className="step-nav-hint">{todoHint}</span>}
        <button
          type="button"
          className={`step-nav-next${ready ? ' ready' : ''}`}
          onClick={onNext}
        >
          {nextLabel} →
        </button>
      </div>
    </div>
  )
}
