// Inline peer reality-check shown under an input field: warns when the value is
// an outlier vs the WJCF facility benchmark, or praises a notably good one.
import type { Flag } from '../../insights/benchmark'

export function FieldFlag({ flag }: { flag: Flag | null }) {
  if (!flag) return null
  return <span className={`field-flag ${flag.severity}`}>{flag.text}</span>
}
