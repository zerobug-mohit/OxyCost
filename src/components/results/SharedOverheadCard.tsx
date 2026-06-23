// Facility shared overhead (HR + MGPS) shown separately from the per-source
// comparison, with its allocation across delivered oxygen. Bare content —
// wrapped in a collapsible section card by the parent.
import type { ComparisonResult } from '../../engine'
import { formatINR, formatRate } from '../../utils/format'

interface Props {
  result: ComparisonResult
}

export function SharedOverheadCard({ result }: Props) {
  if (result.shared_overhead_monthly <= 0) {
    return (
      <p className="muted small" style={{ margin: 0 }}>
        No shared facility costs entered. Add technician/HR or MGPS costs in{' '}
        <strong>Shared facility costs</strong> (Step 3) and they will be allocated
        across all delivered oxygen here.
      </p>
    )
  }
  return (
    <>
      <p style={{ margin: '0 0 6px' }}>
        <strong>{formatINR(result.shared_overhead_monthly, 0)}/month</strong> ·
        allocated at <strong>{formatRate(result.shared_overhead_per_cu_m)}</strong> across{' '}
        delivered oxygen.
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        Add this to any source&apos;s per-cu-m figure for the all-in cost. It applies
        equally to every source, so the comparison ranking is unaffected.
      </p>
    </>
  )
}
