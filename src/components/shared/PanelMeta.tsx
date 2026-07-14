// Per-panel meta shown at the top of each source instance: a GST-inclusive
// note (requirement 3) and, when known, this unit's contribution toward the
// monthly demand (requirement 4).
import type { SourceType } from '../../engine'
import { SOURCE_COLOR } from './sourceColors'
import { formatNumber } from '../../utils/format'
import { Tooltip } from './Tooltip'

interface Props {
  source: SourceType
  outputCuM: number
  demand: number
}

export function PanelMeta({ source, outputCuM, demand }: Props) {
  const pct = demand > 0 && Number.isFinite(outputCuM) ? (outputCuM / demand) * 100 : 0
  const color = SOURCE_COLOR[source]
  return (
    <div className="panel-meta">
      <div className="contribution" style={{ flex: 1, minWidth: 180 }}>
        Supplies <strong>{formatNumber(outputCuM)} cu m</strong>
        {demand > 0 && <> &middot; {pct.toFixed(0)}% of demand</>}
        <div className="bar">
          <span style={{ width: `${Math.min(100, pct)}%`, background: color }} />
        </div>
      </div>
      <span className="gst-note">
        GST-inclusive
        <Tooltip text="Please enter every cost inclusive of GST. The pre-filled defaults are already GST-inclusive. If your quotation is pre-GST, gross it up before entering — for LMO refilling & handling you can instead set the GST % in the LMO panel." />
      </span>
    </div>
  )
}
