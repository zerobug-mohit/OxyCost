export type TabKey =
  | 'guide'
  | 'calculator'
  | 'state'
  | 'methodology'

interface HeaderProps {
  tab: TabKey
  onTab: (t: TabKey) => void
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'guide', label: 'How to use this model' },
  { key: 'calculator', label: 'Facility cost' },
  { key: 'state', label: 'District / State' },
  { key: 'methodology', label: 'Methodology' },
]

export function Header({ tab, onTab }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="container">
        <div className="app-header-inner">
          <h1 className="brand">
            <span className="brand-name">
              Oxy<span className="accent">Cost</span>
            </span>
            <span className="brand-sep">|</span>
            <span className="brand-tag">Facility-level oxygen source costing</span>
          </h1>
        </div>
        <nav className="tab-nav" aria-label="Primary">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => onTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
