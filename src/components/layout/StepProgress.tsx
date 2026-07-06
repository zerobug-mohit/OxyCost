// Guided progress tracker for the Inputs column: three numbered steps, showing
// which are done (✓), which is open now, and what's still to do. Clicking a
// step opens it. Gives non-technical users a clear "Step 1 of 3" sense of place.

interface StepInfo {
  n: number
  label: string
  complete: boolean
}

interface Props {
  steps: StepInfo[]
  current: number | null
  onGo: (n: number) => void
}

export function StepProgress({ steps, current, onGo }: Props) {
  const doneCount = steps.filter((s) => s.complete).length
  return (
    <div className="step-progress" role="group" aria-label="Progress through the steps">
      <div className="step-progress-caption">
        {doneCount === steps.length
          ? 'All steps done — your results are on the right.'
          : `Step ${current ?? doneCount + 1} of ${steps.length} · fill these in order`}
      </div>
      <ol className="step-progress-track">
        {steps.map((s, i) => {
          const state = s.complete ? 'done' : current === s.n ? 'active' : 'todo'
          return (
            <li key={s.n} className={`step-node ${state}`}>
              {i > 0 && <span className="step-connector" aria-hidden />}
              <button
                type="button"
                className="step-dot-btn"
                onClick={() => onGo(s.n)}
                aria-current={current === s.n ? 'step' : undefined}
              >
                <span className="step-dot">{s.complete ? '✓' : s.n}</span>
                <span className="step-node-label">{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
