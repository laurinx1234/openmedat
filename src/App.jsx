import { useState } from 'react'
import { T } from './theme.js'
import Zahlenfolgen from './tests/Zahlenfolgen.jsx'
import Wortfluessigkeit from './tests/Wortfluessigkeit.jsx'
import Implikationen from './tests/Implikationen.jsx'
import Allergieausweise from './tests/Allergieausweise.jsx'
import Figuren from './tests/Figuren.jsx'
import Simulation from './tests/Simulation.jsx'

const TESTS = [
  { id:'zahlenfolgen',    title:'Zahlenfolgen',           icon:'🔢', desc:'7 Zahlen → 8. und 9. Stelle berechnen',    color:T.blue   },
  { id:'wortfluessigkeit',title:'Wortflüssigkeit',        icon:'🔤', desc:'Wörter erkennen – Anfangsbuchstabe finden', color:T.mauve  },
  { id:'implikationen',   title:'Implikationen erkennen', icon:'🧠', desc:'Zwei Aussagen → logische Schlussfolgerung', color:T.yellow },
  { id:'allergieausweise',title:'Allergieausweise',       icon:'💳', desc:'Ausweise merken und Fragen beantworten',   color:T.green  },
  { id:'figuren',         title:'Figuren zusammensetzen', icon:'🔷', desc:'Einzelteile zu einer Figur zusammensetzen', color:T.teal  },
  { id:'simulation',      title:'Simulation',             icon:'🎓', desc:'Kompletter Testtag – alle 5 Kategorien',   color:T.orange },
]

function TestTile({ test, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={() => onClick(test.id)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background:hover?T.surf2:T.surf, border:`1px solid ${hover?test.color:T.border}`,
        borderRadius:16, padding:'24px 20px', cursor:'pointer', textAlign:'left', color:T.text,
        transition:'all 0.18s', transform:hover?'translateY(-2px)':'none',
        boxShadow:hover?`0 8px 24px ${test.color}18`:'none' }}>
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

const SCREENS = {
  zahlenfolgen:    (b) => <Zahlenfolgen    onBack={b} />,
  wortfluessigkeit:(b) => <Wortfluessigkeit onBack={b} />,
  implikationen:   (b) => <Implikationen   onBack={b} />,
  allergieausweise:(b) => <Allergieausweise onBack={b} />,
  figuren:         (b) => <Figuren         onBack={b} />,
  simulation:      (b) => <Simulation      onBack={b} />,
}

export default function App() {
  const [screen, setScreen] = useState('menu')
  if (screen !== 'menu') return (
    <div style={{ minHeight:'100vh', background:T.bg, paddingBottom:60 }}>
      {SCREENS[screen](() => setScreen('menu'))}
    </div>
  )
  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:13, letterSpacing:4, color:T.muted, marginBottom:12 }}>MEDIZINISCHER AUFNAHMETEST</div>
          <div style={{ fontSize:46, fontWeight:'bold', color:T.text, marginBottom:8, letterSpacing:-2 }}>openMedAT</div>
          <div style={{ fontSize:16, color:T.muted }}>Kognitive Fähigkeiten und Fertigkeiten — 5 Testmodule + Simulation</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16, marginBottom:48 }}>
          {TESTS.map(t => <TestTile key={t.id} test={t} onClick={setScreen} />)}
        </div>
        <div style={{ textAlign:'center', color:T.muted, fontSize:13 }}>
          Tastatur: <span style={{ color:T.yellow }}>A · S · D · F · G</span> für die fünf Antwortoptionen
          <div style={{ marginTop:8 }}>github.com/laurinx1234/openmedat</div>
        </div>
      </div>
    </div>
  )
}
