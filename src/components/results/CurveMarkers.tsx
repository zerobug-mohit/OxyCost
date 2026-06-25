// Small inline marker icons for the cost-vs-volume chart, reused in the chart's
// legend key and embedded directly in its "how to read" explanation so the text
// shows the very markers it describes.

/** The ringed operating-point dot (where a source operates now). */
export function RingedDotIcon({ color = '#6a7b83', size = 15 }: { color?: string; size?: number }) {
  const c = size / 2
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      style={{ verticalAlign: 'text-bottom', margin: '0 1px' }}
    >
      <circle cx={c} cy={c} r={size * 0.32} fill={color} stroke="#fff" strokeWidth={2} />
    </svg>
  )
}

/** A numbered priority badge; `partial` renders the dashed partial-coverage style. */
export function PriorityBadgeIcon({
  rank,
  partial = false,
  color,
  size = 17,
}: {
  rank: number
  partial?: boolean
  color?: string
  size?: number
}) {
  const c = size / 2
  const col = color ?? (partial ? '#8a5512' : '#0f7c8b')
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      style={{ verticalAlign: 'text-bottom', margin: '0 1px' }}
    >
      <circle
        cx={c}
        cy={c}
        r={size * 0.44}
        fill={partial ? '#fff' : col}
        stroke={col}
        strokeWidth={2}
        strokeDasharray={partial ? '3 2' : undefined}
      />
      <text
        x={c}
        y={c}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.55}
        fontWeight={700}
        fill={partial ? col : '#fff'}
      >
        {rank}
      </text>
    </svg>
  )
}
