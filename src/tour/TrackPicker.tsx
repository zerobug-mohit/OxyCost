// Shown when the user turns on Tutorial mode: choose which walkthrough to take.
import type { TourTrack } from './tourData'

interface Props {
  onPick: (track: TourTrack) => void
  onClose: () => void
}

export function TrackPicker({ onPick, onClose }: Props) {
  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Choose a tutorial">
      <div className="tour-backdrop" onClick={onClose} />
      <div className="tour-picker">
        <button type="button" className="tour-close" onClick={onClose} title="Close" aria-label="Close">✕</button>
        <div className="tour-picker-kicker">🎓 Tutorial mode</div>
        <h2 className="tour-picker-title">What would you like to learn?</h2>
        <p className="tour-picker-sub">
          We’ll guide you step-by-step through the tool and point out where you can review or change
          the pre-filled defaults. You can exit any time.
        </p>
        <div className="tour-picker-choices">
          <button type="button" className="tour-choice" onClick={() => onPick('facility')}>
            <span className="tour-choice-icon" aria-hidden>🏥</span>
            <span className="tour-choice-title">Facility-level</span>
            <span className="tour-choice-sub">Estimate one facility’s oxygen demand and compare the cost of each source.</span>
          </button>
          <button type="button" className="tour-choice" onClick={() => onPick('state')}>
            <span className="tour-choice-icon" aria-hidden>🗺️</span>
            <span className="tour-choice-title">District / State-level</span>
            <span className="tour-choice-sub">Estimate demand across many facilities and plan the annual oxygen budget.</span>
          </button>
        </div>
      </div>
    </div>
  )
}
