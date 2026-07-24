export type TabKey =
  | 'guide'
  | 'calculator'
  | 'state'
  | 'methodology'

interface HeaderProps {
  tab: TabKey
  onTab: (t: TabKey) => void
  tutorialOn: boolean
  onToggleTutorial: () => void
  lang: 'en' | 'hi'
  onToggleLang: () => void
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'guide', label: 'How to use this model' },
  { key: 'calculator', label: 'Facility cost' },
  { key: 'state', label: 'District / State' },
  { key: 'methodology', label: 'Methodology' },
]

export function Header({ tab, onTab, tutorialOn, onToggleTutorial, lang, onToggleLang }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="container">
        <div className="app-header-inner">
          <h1 className="brand">
            <span className="brand-name" data-no-i18n translate="no">
              Oxy<span className="accent">Cost</span>
            </span>
            <span className="brand-sep">|</span>
            <span className="brand-tag">Oxygen demand &amp; costing — facility and district / state</span>
          </h1>
          <div className="header-actions">
            <button
              type="button"
              className={`tutorial-toggle lang-toggle${lang === 'hi' ? ' on' : ''}`}
              onClick={onToggleLang}
              aria-pressed={lang === 'hi'}
              title="Switch language · भाषा बदलें"
            >
              🌐
              <span className="tutorial-toggle-state">{lang === 'hi' ? 'हिंदी' : 'English'}</span>
            </button>
            <button
              type="button"
              className={`tutorial-toggle${tutorialOn ? ' on' : ''}`}
              onClick={onToggleTutorial}
              aria-pressed={tutorialOn}
              title="Step-by-step guided walkthrough"
            >
              🎓 Tutorial
              <span className="tutorial-toggle-state">{tutorialOn ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
        <nav className="tab-nav" aria-label="Primary">
          {TABS.map((t) => (
            <button
              key={t.key}
              data-tour={`tab-${t.key}`}
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
