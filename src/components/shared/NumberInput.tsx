// Formatted number input with optional INR prefix / unit suffix.
// Spec section 7 (shared/NumberInput). Holds raw text locally so the user can
// clear the field and type freely; commits a number on change.
import { useEffect, useState } from 'react'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  id?: string
  ariaLabel?: string
  /** Colour tone: 'req' = required (red), 'opt' = optional/preset (amber). */
  tone?: 'req' | 'opt' | 'none'
}

export function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  id,
  ariaLabel,
  tone = 'none',
}: NumberInputProps) {
  const [text, setText] = useState(String(value))

  // Keep local text in sync when the value is changed externally (e.g. reset).
  useEffect(() => {
    if (Number(text) !== value) setText(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handle(raw: string) {
    setText(raw)
    if (raw.trim() === '' || raw === '-' || raw === '.') {
      onChange(0)
      return
    }
    const n = Number(raw)
    if (!Number.isNaN(n)) onChange(n)
  }

  return (
    <span className={`num-input ${tone === 'req' ? 'req' : tone === 'opt' ? 'opt' : ''}`}>
      {prefix && <span className="prefix">{prefix}</span>}
      <input
        id={id}
        aria-label={ariaLabel}
        type="number"
        inputMode="decimal"
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => handle(e.target.value)}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </span>
  )
}
