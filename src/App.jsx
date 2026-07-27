import { useState, useEffect, useRef } from 'react'
import { T } from './theme.js'
import { navigate, useRoute } from './router.js'
import { getSession, isQuizReady, minutesUntilQuiz } from './allergStore.js'
import { playBeep, getStats } from './components/Shared.jsx'
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
  { path:'/zahlenfolgen',    title:'Zahlenfolgen',           icon:'🔢', desc:'7 Zahlen → 8. und 9. Stelle berechnen',    color:T.blue,   component:Zahlenfolgen },
  { path:'/wortfluessigkeit',title:'Wortflüssigkeit',        icon:'🔤', desc:'Wörter erkennen – Anfangsbuchstabe finden', color:T.mauve,  component:Wortfluessigkeit },
  { path:'/implikationen',   title:'Implikationen erkennen', icon:'🧠', desc:'Zwei Aussagen → logische Schlussfolgerung', color:T.yellow, component:Implikationen },
  { path:'/allergieausweise',title:'Allergieausweise',       icon:'💳', desc:'Ausweise merken und Fragen beantworten',   color:T.green,  component:Allergieausweise },
  { path:'/figuren',         title:'Figuren zusammensetzen', icon:'🔷', desc:'Einzelteile zu einer Figur zusammensetzen', color:T.teal,   component:Figuren },
  { path:'/major-system',   title:'Major-System',            icon:'🔗', desc:'Zahlen mit Bildwörtern verknüpfen', color:T.pink,   component:MajorSystem },
  { path:'/simulation',      title:'Simulation',             icon:'🎓', desc:'Kompletter Testtag – alle 5 Kategorien',   color:T.orange, component:Simulation, noStats:true },
  { path:'/simulationsrechner',title:'Simulationsrechner',      icon:'📝', desc:'Simulationstimer und -Auswertung für externe Simulationen', color:T.orange, component:Simulationsrechner, noStats:true },
]

const goHome = () => navigate('/')

function renderScreen(route) {
  const t = TESTS.find(t => t.path === route)
  if (!t) return null
  const C = t.component
  return <C onBack={goHome}/>
}


function QuizBadge() {
  const [, forceRender] = useState(0)
  const beeped = useRef(false)
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n+1), 15000)
    return () => clearInterval(id)
  }, [])
  const session = getSession()
  if (!session) { beeped.current = false; return null }
  const ready = isQuizReady()
  if (ready && !beeped.current) { playBeep(); beeped.current = true
    if('Notification' in window&&Notification.permission==='granted'){new Notification('Bereit zur Abfrage',{body:'Die Wartezeit ist abgelaufen. Du kannst jetzt die Fragen beantworten.'})}
  }
  const mins = minutesUntilQuiz()
  return (
    <button onClick={() => navigate('/allergieausweise')}
      style={{ background: ready ? `${T.green}22` : `${T.surf}`, border: `1px solid ${ready ? T.green : T.border}`,
        borderRadius: 12, padding: '14px 20px', marginBottom: 20, cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit' }}>
      <div>
        <div style={{ color: ready ? T.green : T.text, fontWeight: 'bold', marginBottom: 2 }}>
          {ready ? '🔔 Allergieausweise Quiz bereit!' : '⏳ Allergieausweise Merkphase läuft'}
        </div>
        <div style={{ color: T.muted, fontSize: 13 }}>
          {ready ? 'Klicken oder Enter um das Quiz zu starten.' : `Quiz in ca. ${mins} Minute${mins!==1?'n':''}`}
        </div>
      </div>
      <span style={{ color: ready ? T.green : T.muted, fontSize: 20 }}>→</span>
    </button>
  )
}

function TestTile({ test, focused, onClick }) {
  const ref = useRef(null)
  useEffect(() => { if (focused && ref.current) ref.current.focus() }, [focused])
  return (
    <button ref={ref} onClick={onClick}
      style={{ background:T.surf, border:`2px solid ${focused ? test.color : T.border}`,
        borderRadius:16, padding:'24px 20px', cursor:'pointer', textAlign:'left', color:T.text,
        transition:'all 0.15s', outline:'none', width:'100%',
        boxShadow: focused ? `0 0 0 2px ${test.color}44` : 'none' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
        <span style={{ fontSize:32, lineHeight:1 }}>{test.icon}</span>
        <div>
          <div style={{ color:test.color, fontSize:17, fontWeight:'bold', marginBottom:4 }}>{test.title}</div>
          <div style={{ color:T.text, fontSize:14, lineHeight:1.4 }}>{test.desc}</div>
        </div>
      </div>
    </button>
  )
}

export default function App() {
  const route = useRoute()
  const [focused, setFocused] = useState(0)
  const [showStats, setShowStats] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('openmedat_visited')) setShowOnboarding(true)
  }, [])

  useEffect(() => {
    if (route === '/') return
    const h = e => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [route])

  useEffect(() => {
    if (route !== '/') return
    const cols = 2
    const h = e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); setFocused(f => Math.min(f+1, TESTS.length-1)) }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); setFocused(f => Math.max(f-1, 0)) }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); setFocused(f => Math.min(f+cols, TESTS.length-1)) }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); setFocused(f => Math.max(f-cols, 0)) }
      else if (e.key === 'Enter')      navigate(TESTS[focused].path)
      else if (e.key >= '1' && e.key <= '8') navigate(TESTS[parseInt(e.key)-1].path)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [route, focused])

  const screen = renderScreen(route)
  if (screen) {
    return (
      <div style={{ minHeight:'100vh', background:T.bg, paddingBottom:60 }}>
        {screen}
        <Feedback />
      </div>
    )
  }

  const statTests = TESTS.filter(t => !t.noStats).map(t => ({ id: t.path.slice(1), title: t.title, color: t.color }))

  if (showStats) {
    const allStats = getStats()
    const byTest = {}
    for (const t of statTests) byTest[t.id] = allStats.filter(s => s.test === t.id).slice(-10)
    const hasAny = Object.values(byTest).some(a => a.length)

    return (
      <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>
        <Feedback />
        <div style={{ maxWidth:800, margin:'0 auto', padding:'48px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:32 }}>
            <button onClick={() => setShowStats(false)}
              style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:8, color:T.muted, cursor:'pointer', padding:'8px 16px', fontSize:13 }}>
              ← Hauptmenü
            </button>
            <div style={{ fontSize:24, fontWeight:'bold' }}>📊 Statistik</div>
          </div>
          {!hasAny && (
            <div style={{ color:T.muted, textAlign:'center', padding:'48px 0' }}>
              Noch keine Statistiken vorhanden. Spiele einen Test im Nicht-Endlosmodus, um Ergebnisse zu speichern.
            </div>
          )}
          {statTests.filter(t => byTest[t.id].length).map(t => {
            const entries = byTest[t.id]
            const avgPct = Math.round(entries.reduce((s,e) => s + e.correct/e.total*100, 0) / entries.length)
            const col = t.color
            return (
              <div key={t.id} style={{ marginBottom:32 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
                  <div style={{ color:col, fontSize:17, fontWeight:'bold' }}>{t.title}</div>
                  <div style={{ color:T.muted, fontSize:13 }}>Ø <span style={{ color:col, fontWeight:'bold' }}>{avgPct}%</span> ({entries.length} Tests)</div>
                </div>
                <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
                  {entries.slice().reverse().map((e, i) => {
                    const pct = Math.round(e.correct / e.total * 100)
                    const date = new Date(e.date).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit' })
                    const time = new Date(e.date).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:i<entries.length-1?`1px solid ${T.border}`:'none' }}>
                        <div style={{ color:T.muted, fontSize:12, minWidth:80 }}>{date} {time}</div>
                        <div style={{ flex:1, height:22, background:T.surf2, borderRadius:6, overflow:'hidden', position:'relative' }}>
                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:`${col}44`, borderRadius:6 }}/>
                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:col, borderRadius:6, maxWidth:'100%', opacity:0.35 }}/>
                        </div>
                        <div style={{ color:T.text, fontSize:13, fontWeight:'bold', minWidth:55, textAlign:'right' }}>{e.correct}/{e.total}</div>
                        <div style={{ color:col, fontSize:13, fontWeight:'bold', minWidth:36, textAlign:'right' }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>
      <Feedback />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:13, letterSpacing:4, color:T.muted, marginBottom:12 }}>MEDIZINISCHER AUFNAHMETEST</div>
          <div style={{ fontSize:46, fontWeight:'bold', color:T.text, marginBottom:8, letterSpacing:-2 }}>openMedAT</div>
          <div style={{ fontSize:16, color:T.muted }}>Kognitive Fähigkeiten und Fertigkeiten — 8 Testmodule</div>
        </div>
        <QuizBadge/>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <button onClick={() => setShowStats(true)}
            style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:10, color:T.muted, cursor:'pointer', padding:'10px 24px', fontSize:14 }}>
            📊 Statistik
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16, marginBottom:48 }}>
          {TESTS.map((t, i) => (
            <TestTile key={t.path} test={t} focused={focused===i}
              onClick={() => navigate(t.path)} />
          ))}
        </div>
        <div style={{ textAlign:'center', color:T.muted, fontSize:13, lineHeight:2 }}>
          <div>Tastatur: <span style={{ color:T.yellow }}>↑ ↓ ← →</span> navigieren · <span style={{ color:T.yellow }}>Enter</span> öffnen · <span style={{ color:T.yellow }}>1–8</span> direkt</div>
          <div>Im Test: <span style={{ color:T.yellow }}>A · S · D · F · G</span> für die fünf Antwortoptionen</div>
          <div style={{ marginTop:8 }}><a href="https://github.com/laurinx1234/openmedat" target="_blank" rel="noreferrer" style={{ color:T.muted, textDecoration:'none' }}>github.com/laurinx1234/openmedat</a></div>
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${T.border}`, fontSize:12, color:T.muted, maxWidth:600, margin:'16px auto 0', lineHeight:1.6 }}>
            openMedAT ist ein inoffizielles Hobbyprojekt und steht in keiner Verbindung zur Medizinischen Universität, dem MedAT oder dessen Veranstaltern. Alle Inhalte dienen ausschließlich der privaten Übung. Irrtümer und Fehler vorbehalten.
          </div>
        </div>
        {showOnboarding && (
          <div onClick={() => { localStorage.setItem('openmedat_visited','1'); setShowOnboarding(false) }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:16, padding:'36px 32px', maxWidth:520, width:'90%', maxHeight:'90vh', overflow:'auto' }}>
              <div style={{ fontSize:22, fontWeight:'bold', color:T.text, marginBottom:8 }}>Willkommen bei openMedAT</div>
              <div style={{ color:T.muted, fontSize:14, marginBottom:24 }}>Alles auf dieser Seite funktioniert mit der Tastatur.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:28 }}>
                <div>
                  <div style={{ color:T.yellow, fontSize:13, fontWeight:'bold', marginBottom:4 }}>Hauptmenü</div>
                  <div style={{ color:T.muted, fontSize:13, lineHeight:1.8 }}>
                    <span style={{ color:T.yellow }}>↑ ↓ ← →</span> navigieren &nbsp;·&nbsp;
                    <span style={{ color:T.yellow }}>Enter</span> öffnen &nbsp;·&nbsp;
                    <span style={{ color:T.yellow }}>1–8</span> direkt auswählen
                  </div>
                </div>
                <div>
                  <div style={{ color:T.yellow, fontSize:13, fontWeight:'bold', marginBottom:4 }}>In den Tests</div>
                  <div style={{ color:T.muted, fontSize:13, lineHeight:1.8 }}>
                    <span style={{ color:T.yellow }}>A · S · D · F · G</span> Antworten wählen &nbsp;·&nbsp;
                    <span style={{ color:T.yellow }}>Esc</span> zurück/zum Hauptmenü
                  </div>
                </div>
                <div>
                  <div style={{ color:T.yellow, fontSize:13, fontWeight:'bold', marginBottom:4 }}>Einstellungen vor dem Test</div>
                  <div style={{ color:T.muted, fontSize:13, lineHeight:1.8 }}>
                    <span style={{ color:T.yellow }}>↑ ↓</span> zwischen Zeilen wechseln &nbsp;·&nbsp;
                    <span style={{ color:T.yellow }}>← →</span> Option wählen &nbsp;·&nbsp;
                    <span style={{ color:T.yellow }}>Enter</span> bestätigen
                  </div>
                </div>
              </div>
              <button onClick={() => { localStorage.setItem('openmedat_visited','1'); setShowOnboarding(false) }}
                style={{ background:T.yellow, border:'none', borderRadius:10, color:'#000', cursor:'pointer', padding:'14px 36px', fontSize:16, fontWeight:'bold', width:'100%' }}>
                Los geht's
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
