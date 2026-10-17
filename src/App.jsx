import { useState, useEffect, useRef } from 'react'
import { T, getTheme, toggleTheme } from './theme.js'
import { navigate, useRoute } from './router.js'
import { getSession, isQuizReady, minutesUntilQuiz } from './allergStore.js'
import {
  playBeep,
  getStats,
  getStatsExportJson,
  copyText,
  importStats,
  ThemeToggle,
  SiteFooter,
} from './components/Shared.jsx'
import Zahlenfolgen from './tests/Zahlenfolgen.jsx'
import Wortfluessigkeit from './tests/Wortfluessigkeit.jsx'
import Implikationen from './tests/Implikationen.jsx'
import Allergieausweise from './tests/Allergieausweise.jsx'
import Figuren from './tests/Figuren.jsx'
import MajorSystem from './tests/MajorSystem.jsx'
import Simulation from './tests/Simulation.jsx'
import Simulationsrechner from './tests/Simulationsrechner.jsx'
import Feedback from './components/Feedback.jsx'

const TESTS = [
  {
    path: '/zahlenfolgen',
    title: 'Zahlenfolgen',
    icon: '🔢',
    desc: '7 Zahlen → 8. und 9. Stelle berechnen',
    color: 'blue',
    component: Zahlenfolgen,
  },
  {
    path: '/wortfluessigkeit',
    title: 'Wortflüssigkeit',
    icon: '🔤',
    desc: 'Wörter erkennen – Anfangsbuchstabe finden',
    color: 'mauve',
    component: Wortfluessigkeit,
  },
  {
    path: '/implikationen',
    title: 'Implikationen erkennen',
    icon: '🧠',
    desc: 'Zwei Aussagen → logische Schlussfolgerung',
    color: 'yellow',
    component: Implikationen,
  },
  {
    path: '/allergieausweise',
    title: 'Allergieausweise',
    icon: '💳',
    desc: 'Ausweise merken und Fragen beantworten',
    color: 'green',
    component: Allergieausweise,
  },
  {
    path: '/figuren',
    title: 'Figuren zusammensetzen',
    icon: '🔷',
    desc: 'Einzelteile zu einer Figur zusammensetzen',
    color: 'teal',
    component: Figuren,
  },
  {
    path: '/major-system',
    title: 'Major-System',
    icon: '🔗',
    desc: 'Zahlen mit Bildwörtern verknüpfen',
    color: 'pink',
    component: MajorSystem,
  },
  {
    path: '/simulation',
    title: 'Simulation',
    icon: '🎓',
    desc: 'Komplette KFF-Simulation',
    color: 'orange',
    component: Simulation,
    noStats: true,
  },
  {
    path: '/simulationsrechner',
    title: 'Simulationsrechner',
    icon: '📝',
    desc: 'Simulationstimer und -Auswertung für externe Simulationen',
    color: 'orange',
    component: Simulationsrechner,
    noStats: true,
  },
]

const goHome = () => navigate('/')

function renderScreen(route) {
  const t = TESTS.find((t) => t.path === route)
  if (!t) return null
  const C = t.component
  return <C onBack={goHome} />
}

function QuizBadge() {
  const [, forceRender] = useState(0)
  const beeped = useRef(false)
  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 15000)
    return () => clearInterval(id)
  }, [])
  const session = getSession()
  if (!session || session.status === 'learn') {
    beeped.current = false
    return null
  }
  const ready = isQuizReady()
  if (ready && !beeped.current) {
    playBeep()
    beeped.current = true
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Bereit zur Abfrage', {
        body: 'Die Wartezeit ist abgelaufen. Du kannst jetzt die Fragen beantworten.',
      })
    }
  }
  const mins = minutesUntilQuiz()
  return (
    <button
      onClick={() => navigate('/allergieausweise')}
      style={{
        background: ready ? `${T.green}22` : `${T.surf}`,
        border: `1px solid ${ready ? T.green : T.border}`,
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 20,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <div>
        <div style={{ color: ready ? T.green : T.text, fontWeight: 'bold', marginBottom: 2 }}>
          {ready ? '🔔 Allergieausweise Quiz bereit!' : '⏳ Allergieausweise Merkphase läuft'}
        </div>
        <div style={{ color: T.muted, fontSize: 13 }}>
          {ready ? 'Klicken oder Enter um das Quiz zu starten.' : `Quiz in ca. ${mins} Minute${mins !== 1 ? 'n' : ''}`}
        </div>
      </div>
      <span style={{ color: ready ? T.green : T.muted, fontSize: 20 }}>→</span>
    </button>
  )
}

function TestTile({ test, focused, onClick }) {
  const ref = useRef(null)
  const color = T[test.color]
  useEffect(() => {
    if (focused && ref.current) ref.current.focus()
  }, [focused])
  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        background: T.surf,
        border: `1px solid ${focused ? color : T.border}`,
        borderRadius: 20,
        padding: '22px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        color: T.text,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
        width: '100%',
        height: '100%',
        boxShadow: focused ? T.shadow : T.shadowSm,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span
          style={{
            display: 'flex',
            flex: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 13,
            background: `${color}16`,
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          {test.icon}
        </span>
        <div>
          <div style={{ color, fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>
            {test.title}
          </div>
          <div style={{ color: T.text2, fontSize: 14, lineHeight: 1.45 }}>{test.desc}</div>
        </div>
      </div>
    </button>
  )
}

function StatsImportDialog({ validIds, onClose, onImported }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const submit = (e) => {
    e.preventDefault()
    const result = importStats(text, validIds)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onImported(result)
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Statistik importieren"
        style={{
          background: T.surf,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: T.text,
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Statistik importieren</h2>
        <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
          JSON aus einem früheren Export einfügen. Vorhandene Einträge bleiben erhalten, Duplikate werden übersprungen.
        </p>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError('')
          }}
          aria-label="Statistik-JSON"
          placeholder="Statistik-JSON hier einfügen …"
          style={{
            width: '100%',
            minHeight: 160,
            resize: 'vertical',
            background: T.surf2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text,
            padding: '10px 12px',
            fontSize: 12.5,
            fontFamily: 'monospace',
            lineHeight: 1.5,
          }}
        />
        {error && (
          <div role="alert" style={{ color: T.red, fontSize: 13, marginTop: 10 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.muted,
              cursor: 'pointer',
              padding: '10px 16px',
              fontSize: 13,
            }}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            style={{
              background: T.blue,
              border: 'none',
              borderRadius: 8,
              color: T.onAccent,
              cursor: 'pointer',
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Importieren
          </button>
        </div>
      </form>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const [focused, setFocused] = useState(0)
  const showStats = route === '/statistik'
  const [stats, setStats] = useState(getStats)
  const [showImport, setShowImport] = useState(false)
  const [notice, setNotice] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [theme, setThemeState] = useState(getTheme)

  const handleToggleTheme = () => setThemeState(toggleTheme())

  useEffect(() => {
    if (!localStorage.getItem('openmedat_visited')) setShowOnboarding(true)
  }, [])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 3000)
    return () => clearTimeout(id)
  }, [notice])

  useEffect(() => {
    if (!showStats) {
      setShowImport(false)
      return
    }
    setStats(getStats())
    setNotice(null)
  }, [showStats])

  useEffect(() => {
    if (route === '/') return
    const h = (e) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [route])

  useEffect(() => {
    if (route !== '/' || showStats) return
    const cols = 2
    const h = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocused((f) => Math.min(f + 1, TESTS.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocused((f) => Math.max(f - 1, 0))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocused((f) => Math.min(f + cols, TESTS.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocused((f) => Math.max(f - cols, 0))
      } else if (e.key === 'Enter') navigate(TESTS[focused].path)
      else if (e.key >= '1' && e.key <= '8') navigate(TESTS[parseInt(e.key) - 1].path)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [route, focused, showStats])

  const screen = renderScreen(route)
  if (screen) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: T.bg,
          color: T.text,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1 }}>{screen}</div>
        <SiteFooter />
        <Feedback />
      </div>
    )
  }

  const statTests = TESTS.filter((t) => !t.noStats).map((t) => ({
    id: t.path.slice(1),
    title: t.title,
    color: T[t.color],
  }))

  async function handleExportStats() {
    const ok = await copyText(getStatsExportJson())
    setNotice(
      ok ? { ok: true, text: 'In die Zwischenablage kopiert ✓' } : { ok: false, text: 'Kopieren fehlgeschlagen.' }
    )
  }

  function handleImportedStats(result) {
    setShowImport(false)
    setStats(getStats())
    let text
    if (result.imported === 0) {
      text = `Keine neuen Einträge${result.duplicates ? ` (${result.duplicates} Duplikate)` : ''}.`
    } else {
      text = `${result.imported} Einträge importiert`
      if (result.duplicates) text += ` · ${result.duplicates} Duplikate`
      if (result.rejected) text += ` · ${result.rejected} ungültig`
      if (result.trimmed) text += ` · ${result.trimmed} wegen Limit verworfen`
    }
    setNotice({ ok: true, text })
  }

  if (showStats) {
    const allStats = stats
    const statsActionStyle = {
      minHeight: 36,
      background: T.surf,
      border: `1px solid ${T.border}`,
      borderRadius: 999,
      color: T.text,
      cursor: 'pointer',
      padding: '0 16px',
      fontSize: 13,
      fontWeight: 700,
      boxShadow: T.shadowSm,
    }
    const byTest = {}
    for (const t of statTests) byTest[t.id] = allStats.filter((s) => s.test === t.id).slice(-10)
    const hasAny = Object.values(byTest).some((a) => a.length)

    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', flexDirection: 'column' }}>
        <Feedback />
        <div style={{ flex: 1, width: '100%', maxWidth: 800, margin: '0 auto', padding: '48px 24px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: notice ? 10 : 32,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: T.surf,
                  border: `1px solid ${T.border}`,
                  borderRadius: 999,
                  color: T.muted,
                  cursor: 'pointer',
                  padding: '8px 16px',
                  fontSize: 13,
                  boxShadow: T.shadowSm,
                }}
              >
                ← Hauptmenü
              </button>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Statistik</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleExportStats} style={statsActionStyle}>
                Exportieren
              </button>
              <button onClick={() => setShowImport(true)} style={statsActionStyle}>
                Importieren
              </button>
            </div>
          </div>
          {notice && (
            <div role="status" style={{ color: notice.ok ? T.green : T.red, fontSize: 13, marginBottom: 22 }}>
              {notice.text}
            </div>
          )}
          {!hasAny && (
            <div style={{ color: T.muted, textAlign: 'center', padding: '48px 0' }}>
              Noch keine Statistiken vorhanden. Spiele einen Test im Nicht-Endlosmodus, um Ergebnisse zu speichern.
            </div>
          )}
          {statTests
            .filter((t) => byTest[t.id].length)
            .map((t) => {
              const entries = byTest[t.id]
              const avgPct = Math.round(entries.reduce((s, e) => s + (e.correct / e.total) * 100, 0) / entries.length)
              const col = t.color
              return (
                <div key={t.id} style={{ marginBottom: 32 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ color: col, fontSize: 17, fontWeight: 'bold' }}>{t.title}</div>
                    <div style={{ color: T.muted, fontSize: 13 }}>
                      Ø <span style={{ color: col, fontWeight: 'bold' }}>{avgPct}%</span> ({entries.length} Tests)
                    </div>
                  </div>
                  <div
                    style={{
                      background: T.surf,
                      border: `1px solid ${T.border}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    {entries
                      .slice()
                      .reverse()
                      .map((e, i) => {
                        const pct = Math.round((e.correct / e.total) * 100)
                        const date = new Date(e.date).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })
                        const time = new Date(e.date).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 16px',
                              borderBottom: i < entries.length - 1 ? `1px solid ${T.border}` : 'none',
                            }}
                          >
                            <div style={{ color: T.muted, fontSize: 12, minWidth: 80 }}>
                              {date} {time}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                height: 22,
                                background: T.surf2,
                                borderRadius: 6,
                                overflow: 'hidden',
                                position: 'relative',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${pct}%`,
                                  background: `${col}44`,
                                  borderRadius: 6,
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${pct}%`,
                                  background: col,
                                  borderRadius: 6,
                                  maxWidth: '100%',
                                  opacity: 0.35,
                                }}
                              />
                            </div>
                            <div
                              style={{
                                color: T.text,
                                fontSize: 13,
                                fontWeight: 'bold',
                                minWidth: 55,
                                textAlign: 'right',
                              }}
                            >
                              {e.correct}/{e.total}
                            </div>
                            <div
                              style={{ color: col, fontSize: 13, fontWeight: 'bold', minWidth: 36, textAlign: 'right' }}
                            >
                              {pct}%
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })}
        </div>
        <SiteFooter />
        {showImport && (
          <StatsImportDialog
            validIds={statTests.map((t) => t.id)}
            onClose={() => setShowImport(false)}
            onImported={handleImportedStats}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', flexDirection: 'column' }}>
      <Feedback />
      <div style={{ flex: 1, width: '100%', maxWidth: 900, margin: '0 auto', padding: '48px 24px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.text }}>
            openMedAT
          </h1>
          <div style={{ display: 'flex', flex: 'none', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('/statistik')}
              style={{
                minHeight: 44,
                background: T.surf,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                color: T.text,
                cursor: 'pointer',
                padding: '0 20px',
                fontSize: 13.5,
                fontWeight: 700,
                boxShadow: T.shadowSm,
              }}
            >
              Statistik
            </button>
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          </div>
        </div>
        <QuizBadge />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gridAutoRows: '1fr',
            gap: 16,
            marginBottom: 48,
          }}
        >
          {TESTS.map((t, i) => (
            <TestTile key={t.path} test={t} focused={focused === i} onClick={() => navigate(t.path)} />
          ))}
        </div>
        <div style={{ textAlign: 'center', color: T.muted, fontSize: 13, lineHeight: 2 }}>
          <div>
            Tastatur: <span style={{ color: T.yellow }}>↑ ↓ ← →</span> navigieren ·{' '}
            <span style={{ color: T.yellow }}>Enter</span> öffnen · <span style={{ color: T.yellow }}>1–8</span> direkt
          </div>
          <div>
            Im Test: <span style={{ color: T.yellow }}>A · S · D · F · G</span> für die fünf Antwortoptionen
          </div>
        </div>
        {showOnboarding && (
          <div
            onClick={() => {
              localStorage.setItem('openmedat_visited', '1')
              setShowOnboarding(false)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: T.surf,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: '36px 32px',
                maxWidth: 520,
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 'bold', color: T.text, marginBottom: 8 }}>
                Willkommen bei openMedAT
              </div>
              <div style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>
                Alles auf dieser Seite funktioniert mit der Tastatur.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
                <div>
                  <div style={{ color: T.yellow, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>Hauptmenü</div>
                  <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.8 }}>
                    <span style={{ color: T.yellow }}>↑ ↓ ← →</span> navigieren &nbsp;·&nbsp;
                    <span style={{ color: T.yellow }}>Enter</span> öffnen &nbsp;·&nbsp;
                    <span style={{ color: T.yellow }}>1–8</span> direkt auswählen
                  </div>
                </div>
                <div>
                  <div style={{ color: T.yellow, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>In den Tests</div>
                  <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.8 }}>
                    <span style={{ color: T.yellow }}>A · S · D · F · G</span> Antworten wählen &nbsp;·&nbsp;
                    <span style={{ color: T.yellow }}>Esc</span> zurück/zum Hauptmenü
                  </div>
                </div>
                <div>
                  <div style={{ color: T.yellow, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
                    Einstellungen vor dem Test
                  </div>
                  <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.8 }}>
                    <span style={{ color: T.yellow }}>↑ ↓</span> zwischen Zeilen wechseln &nbsp;·&nbsp;
                    <span style={{ color: T.yellow }}>← →</span> Option wählen &nbsp;·&nbsp;
                    <span style={{ color: T.yellow }}>Enter</span> bestätigen
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('openmedat_visited', '1')
                  setShowOnboarding(false)
                }}
                style={{
                  background: T.yellow,
                  border: 'none',
                  borderRadius: 14,
                  color: T.onAccent,
                  cursor: 'pointer',
                  padding: '14px 36px',
                  fontSize: 16,
                  fontWeight: 700,
                  width: '100%',
                }}
              >
                Los geht's
              </button>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
