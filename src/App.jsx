import { useState, useEffect, useRef } from 'react'
import { T } from './theme.js'
import { navigate, useRoute } from './router.js'
import { getSession, isQuizReady, minutesUntilQuiz } from './allergStore.js'
import Zahlenfolgen from './tests/Zahlenfolgen.jsx'
import Wortfluessigkeit from './tests/Wortfluessigkeit.jsx'
import Implikationen from './tests/Implikationen.jsx'
import Allergieausweise from './tests/Allergieausweise.jsx'
import Figuren from './tests/Figuren.jsx'
import Simulation from './tests/Simulation.jsx'

const TESTS = [
  { path:'/zahlenfolgen',    title:'Zahlenfolgen',           icon:'🔢', desc:'7 Zahlen → 8. und 9. Stelle berechnen',    color:T.blue   },
  { path:'/wortfluessigkeit',title:'Wortflüssigkeit',        icon:'🔤', desc:'Wörter erkennen – Anfangsbuchstabe finden', color:T.mauve  },
  { path:'/implikationen',   title:'Implikationen erkennen', icon:'🧠', desc:'Zwei Aussagen → logische Schlussfolgerung', color:T.yellow },
  { path:'/allergieausweise',title:'Allergieausweise',       icon:'💳', desc:'Ausweise merken und Fragen beantworten',   color:T.green  },
  { path:'/figuren',         title:'Figuren zusammensetzen', icon:'🔷', desc:'Einzelteile zu einer Figur zusammensetzen', color:T.teal  },
  { path:'/simulation',      title:'Simulation',             icon:'🎓', desc:'Kompletter Testtag – alle 5 Kategorien',   color:T.orange },
]

const goHome = () => navigate('/')

function renderScreen(route) {
  switch(route) {
    case '/zahlenfolgen':    return <Zahlenfolgen    onBack={goHome}/>
    case '/wortfluessigkeit':return <Wortfluessigkeit onBack={goHome}/>
    case '/implikationen':   return <Implikationen   onBack={goHome}/>
    case '/allergieausweise':return <Allergieausweise onBack={goHome}/>
    case '/figuren':         return <Figuren         onBack={goHome}/>
    case '/simulation':      return <Simulation      onBack={goHome}/>
    default: return null
  }
}


function QuizBadge() {
  const [, forceRender] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n+1), 15000)
    return () => clearInterval(id)
  }, [])
  const session = getSession()
  if (!session) return null
  const ready = isQuizReady()
  const mins = minutesUntilQuiz()
  return (
    <div onClick={() => navigate('/allergieausweise')}
      style={{ background: ready ? `${T.green}22` : `${T.surf}`, border: `1px solid ${ready ? T.green : T.border}`,
        borderRadius: 12, padding: '14px 20px', marginBottom: 20, cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ color: ready ? T.green : T.text, fontWeight: 'bold', marginBottom: 2 }}>
          {ready ? '🔔 Allergieausweise Quiz bereit!' : '⏳ Allergieausweise Merkphase läuft'}
        </div>
        <div style={{ color: T.muted, fontSize: 13 }}>
          {ready ? 'Klicken oder Enter um das Quiz zu starten.' : `Quiz in ca. ${mins} Minute${mins!==1?'n':''}`}
        </div>
      </div>
      <span style={{ color: ready ? T.green : T.muted, fontSize: 20 }}>→</span>
    </div>
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

  useEffect(() => {
    if (route !== '/') return
    const cols = 2
    const h = e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); setFocused(f => Math.min(f+1, TESTS.length-1)) }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); setFocused(f => Math.max(f-1, 0)) }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); setFocused(f => Math.min(f+cols, TESTS.length-1)) }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); setFocused(f => Math.max(f-cols, 0)) }
      else if (e.key === 'Enter')      navigate(TESTS[focused].path)
      else if (e.key >= '1' && e.key <= '6') navigate(TESTS[parseInt(e.key)-1].path)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [route, focused])

  const screen = renderScreen(route)
  if (screen) {
    return (
      <div style={{ minHeight:'100vh', background:T.bg, paddingBottom:60 }}>
        {screen}
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:13, letterSpacing:4, color:T.muted, marginBottom:12 }}>MEDIZINISCHER AUFNAHMETEST</div>
          <div style={{ fontSize:46, fontWeight:'bold', color:T.text, marginBottom:8, letterSpacing:-2 }}>openMedAT</div>
          <div style={{ fontSize:16, color:T.muted }}>Kognitive Fähigkeiten und Fertigkeiten — 5 Testmodule + Simulation</div>
        </div>
        <QuizBadge/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16, marginBottom:48 }}>
          {TESTS.map((t, i) => (
            <TestTile key={t.path} test={t} focused={focused===i}
              onClick={() => navigate(t.path)} />
          ))}
        </div>
        <div style={{ textAlign:'center', color:T.muted, fontSize:13, lineHeight:2 }}>
          <div>Tastatur: <span style={{ color:T.yellow }}>↑ ↓ ← →</span> navigieren · <span style={{ color:T.yellow }}>Enter</span> öffnen · <span style={{ color:T.yellow }}>1–6</span> direkt</div>
          <div>Im Test: <span style={{ color:T.yellow }}>A · S · D · F · G</span> für die fünf Antwortoptionen</div>
          <div style={{ marginTop:8 }}><a href="https://github.com/laurinx1234/openmedat" target="_blank" rel="noreferrer" style={{ color:T.muted, textDecoration:'none' }}>github.com/laurinx1234/openmedat</a></div>
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${T.border}`, fontSize:12, color:T.muted, maxWidth:600, margin:'16px auto 0', lineHeight:1.6 }}>
            openMedAT ist ein inoffizielles Hobbyprojekt und steht in keiner Verbindung zur Medizinischen Universität, dem MedAT oder dessen Veranstaltern. Alle Inhalte dienen ausschließlich der privaten Übung. Irrtümer und Fehler vorbehalten.
          </div>
        </div>
      </div>
    </div>
  )
}
