import { useState, useEffect } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, ResultScreen, KeyHint, useSettingsKeyboard, rnd, pick, shuffle, OPTS, KEYS } from '../components/Shared.jsx'

// ─── Geometry ──────────────────────────────────────────────────────────────────
function regPoly(n, cx=50, cy=50, r=44) {
  return Array.from({length:n}, (_,i) => {
    const a = -Math.PI/2 + 2*Math.PI*i/n
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)]
  })
}

function clip(poly, nx, ny, d) {
  if (!poly.length) return []
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i+1)%poly.length]
    const da = nx*a[0]+ny*a[1]-d, db = nx*b[0]+ny*b[1]-d
    if (da >= 0) out.push(a)
    if ((da > 0) !== (db > 0)) {
      const t = da/(da-db)
      out.push([a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])])
    }
  }
  return out
}

function polyArea(pts) {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i+1)%pts.length
    a += pts[i][0]*pts[j][1] - pts[j][0]*pts[i][1]
  }
  return Math.abs(a)/2
}

function ptsToPath(pts) {
  return pts.map((p,i) => `${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'
}

function normPts(pts, vb=100, pad=8) {
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1])
  const mnX=Math.min(...xs), mxX=Math.max(...xs)
  const mnY=Math.min(...ys), mxY=Math.max(...ys)
  const w=mxX-mnX||1, h=mxY-mnY||1
  const sc=(vb-2*pad)/Math.max(w,h)
  const oX=(vb-w*sc)/2-mnX*sc, oY=(vb-h*sc)/2-mnY*sc
  return pts.map(([x,y]) => [x*sc+oX, y*sc+oY])
}

function arcPath(cx, cy, r, a0, a1) {
  const sw = ((a1-a0)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)
  if (sw >= 2*Math.PI-0.001) return null
  const x0=cx+r*Math.cos(a0), y0=cy+r*Math.sin(a0)
  const x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1)
  return `M ${cx},${cy} L ${x0.toFixed(2)},${y0.toFixed(2)} A ${r},${r} 0 ${sw>Math.PI?1:0},1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`
}

function tryCut(pieces, totalArea, nx, ny, d, minFrac=0.05) {
  const next = []
  for (const p of pieces) {
    const left  = clip(p,  nx,  ny,  d)
    const right = clip(p, -nx, -ny, -d)
    if (left.length >= 3 && right.length >= 3) {
      if (polyArea(left)  < totalArea * minFrac) return null
      if (polyArea(right) < totalArea * minFrac) return null
      next.push(left, right)
    } else if (left.length >= 3)  { next.push(left)  }
      else if (right.length >= 3) { next.push(right) }
      else                         { next.push(p)     }
  }
  return next.length > pieces.length ? next : null
}

function applyCut(pieces, totalArea, angle, offset) {
  const cx=50, cy=50, r=44
  const nx=Math.sin(angle), ny=-Math.cos(angle)
  for (const frac of [1.0, 0.6, 0.35, 0.0]) {
    const off = offset * frac
    const lx = cx + off*r*Math.cos(angle+Math.PI/2)
    const ly = cy + off*r*Math.sin(angle+Math.PI/2)
    const d = nx*lx+ny*ly
    const result = tryCut(pieces, totalArea, nx, ny, d)
    if (result) return result
  }
  return null
}

function genPolyPieces(sides) {
  const poly = regPoly(sides)
  const totalArea = polyArea(poly)
  const numLines = rnd(4, 7)
  const lines = Array.from({length: numLines}, (_, i) => ({
    angle:  i*(Math.PI/numLines) + (Math.random()-0.5)*(Math.PI/numLines)*0.75,
    offset: (Math.random()*1.2 - 0.6)
  }))
  let pieces = [poly]
  for (const {angle, offset} of lines) {
    if (pieces.length >= 8) break
    const result = applyCut(pieces, totalArea, angle, offset)
    if (result) pieces = result
  }
  const raw = pieces.filter(p => p.length >= 3)
  return { raw, normalized: raw.map(p => normPts(p)) }
}

function genCircPieces(sweep) {
  const cx=50, cy=50, r=44, a0=-Math.PI/2
  const isFullCircle = sweep >= 2*Math.PI - 0.001
  const arcPoly = isFullCircle
    ? Array.from({length:64}, (_,i) => { const a=a0+2*Math.PI*i/64; return [cx+r*Math.cos(a),cy+r*Math.sin(a)] })
    : [...Array.from({length:48}, (_,i) => { const a=a0+sweep*i/47; return [cx+r*Math.cos(a),cy+r*Math.sin(a)] }), [cx,cy]]
  const totalArea = polyArea(arcPoly)
  const numLines = sweep <= Math.PI*0.6 ? rnd(1,2) : rnd(2,4)
  const lines = Array.from({length: numLines}, (_, i) => ({
    angle:  i*(Math.PI/numLines) + (Math.random()-0.5)*(Math.PI/numLines)*0.7,
    offset: (Math.random()*1.0 - 0.5)
  }))
  let pieces = [arcPoly]
  for (const {angle, offset} of lines) {
    if (pieces.length >= 6) break
    const result = applyCut(pieces, totalArea, angle, offset)
    if (result) pieces = result
  }
  const raw = pieces.filter(p => p.length >= 3)
  return { raw, normalized: raw.map(p => normPts(p)) }
}

// ─── Shape definitions ─────────────────────────────────────────────────────────
const POLY_SHAPES = [
  {id:'p5',label:'Fünfeck',  sides:5,family:'polygon'},
  {id:'p6',label:'Sechseck', sides:6,family:'polygon'},
  {id:'p7',label:'Siebeneck',sides:7,family:'polygon'},
  {id:'p8',label:'Achteck',  sides:8,family:'polygon'},
]
const CIRC_SHAPES = [
  {id:'c1',label:'Viertelkreis',     sweep:0.5*Math.PI, family:'circle'},
  {id:'c2',label:'Halbkreis',        sweep:Math.PI,     family:'circle'},
  {id:'c3',label:'Dreiviertelkreis', sweep:1.5*Math.PI, family:'circle'},
  {id:'c4',label:'Ganzer Kreis',     sweep:2*Math.PI,   family:'circle'},
]
const PLACEHOLDER_SHAPES = [
  {id:'ph_tri',  label:'Dreieck',  isPlaceholder:true},
  {id:'ph_sq',   label:'Quadrat',  isPlaceholder:true},
  {id:'ph_rect', label:'Rechteck', isPlaceholder:true},
  {id:'ph_trap', label:'Trapez',   isPlaceholder:true},
]
const WINKEL_DATA = [
  {sides:5, label:'Fünfeck',   deg:72},
  {sides:6, label:'Sechseck',  deg:60},
  {sides:7, label:'Siebeneck', deg:51.4},
  {sides:8, label:'Achteck',   deg:45},
]

// ─── Piece colours (AssembledView only) ────────────────────────────────────────
const PC = ['#89b4fa','#cba6f7','#94e2d5','#a6e3a1','#f9e2af','#fab387','#f38ba8','#f5c2e7','#89dceb']
const PIECE_FILL = '#6b7280'

// ─── Assembled view ────────────────────────────────────────────────────────────
function AssembledView({ task, size=200 }) {
  const raw = task.pieces.raw
  if (!raw || !raw.length) return null
  const allPts = raw.flat()
  const xs=allPts.map(p=>p[0]), ys=allPts.map(p=>p[1])
  const mnX=Math.min(...xs), mxX=Math.max(...xs)
  const mnY=Math.min(...ys), mxY=Math.max(...ys)
  const w=mxX-mnX||1, h=mxY-mnY||1, pad=12
  const sc=(size-2*pad)/Math.max(w,h)
  const oX=(size-w*sc)/2-mnX*sc, oY=(size-h*sc)/2-mnY*sc
  const sp = pts => pts.map(([x,y]) => [x*sc+oX, y*sc+oY])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {raw.map((pts, i) => (
        <path key={i} d={ptsToPath(sp(pts))} fill={`${PC[i%9]}55`} stroke={PC[i%9]} strokeWidth="1.5" strokeLinejoin="round"/>
      ))}
    </svg>
  )
}

// ─── Answer shape SVG ──────────────────────────────────────────────────────────
function AnswerSVG({ shape, size=70 }) {
  const s=size, cx=s/2, cy=s/2, r=s*0.42
  const fill=`${T.teal}55`, stroke=T.teal, sw='1.8'
  if (shape.isPlaceholder) {
    if (shape.id==='ph_tri')  return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><polygon points={`${cx},${s*.1} ${s*.92},${s*.9} ${s*.08},${s*.9}`} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    if (shape.id==='ph_sq')   return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*.1} y={s*.1} width={s*.8} height={s*.8} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    if (shape.id==='ph_rect') return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*.06} y={s*.22} width={s*.88} height={s*.55} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    // ph_trap = Trapez
    return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><polygon points={`${s*.28},${s*.25} ${s*.72},${s*.25} ${s*.9},${s*.78} ${s*.1},${s*.78}`} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
  }
  if (shape.id==='c4') return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
  if (shape.family==='circle') {
    const path = arcPath(cx,cy,r,-Math.PI/2,-Math.PI/2+shape.sweep)
    return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><path d={path} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>
  }
  const pts = regPoly(shape.sides,cx,cy,r)
  return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><path d={ptsToPath(pts)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>
}

// ─── Puzzle piece tile (uniform gray, no colored box) ──────────────────────────
function PieceTile({ data, rotation }) {
  return (
    <svg viewBox="0 0 100 100" width="90" height="90">
      <g transform={`rotate(${rotation},50,50)`}>
        <path d={ptsToPath(data)} fill={PIECE_FILL} stroke={PIECE_FILL} strokeWidth="0.5" strokeLinejoin="round"/>
      </g>
    </svg>
  )
}

// ─── Winkel display ────────────────────────────────────────────────────────────
function WinkelDisplay({ deg, size=200 }) {
  const rad = deg * Math.PI / 180
  const cx = size/2, cy = size/2, r = size*0.42
  const x0 = cx + r, y0 = cy
  const x1 = cx + r * Math.cos(rad), y1 = cy + r * Math.sin(rad)
  const lg = deg > 180 ? 1 : 0
  const lx = cx + r*0.58*Math.cos(rad/2)
  const ly = cy + r*0.58*Math.sin(rad/2)
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <path d={`M ${cx},${cy} L ${x0},${y0} A ${r},${r} 0 ${lg},1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`}
        fill={`${T.teal}44`} stroke={T.teal} strokeWidth="2.5" strokeLinejoin="round"/>
      <text x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
        fill={T.yellow} fontSize={size*0.1} fontWeight="bold">
        {Number.isInteger(deg) ? `${deg}°` : `${deg.toFixed(1)}°`}
      </text>
    </svg>
  )
}

// ─── Task generators ────────────────────────────────────────────────────────────
export function makeTask() {
  const isCircle = Math.random() > 0.5
  const family = isCircle ? CIRC_SHAPES : POLY_SHAPES
  const targetShape = pick(family)
  const pd = targetShape.family === 'polygon'
    ? genPolyPieces(targetShape.sides)
    : genCircPieces(targetShape.sweep)
  const others = shuffle(family.filter(s => s.id !== targetShape.id))
  const injectNone = Math.random() < 0.20

  if (injectNone) {
    const placeholder = pick(PLACEHOLDER_SHAPES)
    const opts4 = shuffle([...others.map(s => ({shape:s})), {shape:placeholder}])
    return { pieces: pd, opts: [...opts4, {shape:null}], correctIdx: 4, targetShape }
  }

  const opts4 = shuffle([...others.map(s => ({shape:s})), {shape:targetShape}])
  const opts = [...opts4, {shape:null}]
  const ci = opts.findIndex(o => o.shape && o.shape.id === targetShape.id)
  return { pieces: pd, opts, correctIdx: ci, targetShape }
}

export function makeWinkelTask() {
  const correct = pick(WINKEL_DATA)
  const others = shuffle(WINKEL_DATA.filter(p => p.sides !== correct.sides))
  const opts4 = shuffle([correct, ...others])
  const opts = [...opts4, null]
  const ci = opts.findIndex(o => o && o.sides === correct.sides)
  return { deg: correct.deg, opts, correctIdx: ci }
}

// ─── Component ─────────────────────────────────────────────────────────────────
function ScoreBar({ score, total, color }) {
  const pct = total > 0 ? Math.round(score/total*100) : 0
  return <span style={{color,fontSize:14}}>{score}/{total} <span style={{color:T.muted}}>({pct}%)</span></span>
}

export default function Figuren({ onBack }) {
  const [mode, setMode] = useState('settings')
  const [count, setCount] = useState(15)
  const [quizType, setQuizType] = useState('figuren')
  const [question, setQuestion] = useState(null)
  const [rotations, setRotations] = useState([])
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [done, setDone] = useState(false)
  const [showFb, setShowFb] = useState(false)
  const [fbReady, setFbReady] = useState(false)
  const endless = count === 0

  function newQ(rem, type) {
    const qt = type ?? quizType
    if (qt === 'winkel') {
      const q = makeWinkelTask()
      setQuestion(q); setRotations(['_']); setSelected(null); setShowFb(false); setFbReady(false)
    } else {
      const q = makeTask()
      setQuestion(q); setSelected(null); setShowFb(false); setFbReady(false)
      setRotations(q.pieces.normalized.map(() => {
        const r = Math.random()
        if (r < 0.15) return rnd(8,35)
        if (r < 0.30) return rnd(325,352)
        if (r < 0.55) return rnd(40,140)
        if (r < 0.80) return rnd(220,320)
        return rnd(145,215)
      }))
    }
    setRemaining(rem)
  }

  function startGame() { setScore(0); setTotal(0); setDone(false); newQ(count, quizType); setMode('game') }

  function answer(i) {
    if (selected !== null) return
    const correct = i === question.correctIdx
    setSelected(i); if (correct) setScore(s=>s+1); setTotal(t=>t+1)
    setTimeout(() => { setShowFb(true); setTimeout(() => setFbReady(true), 200) }, 80)
  }

  function nextQ() {
    setFbReady(false); setShowFb(false); setSelected(null)
    const rem = remaining - 1
    if (!endless && rem <= 0) { setDone(true); return }
    newQ(rem)
  }

  useEffect(() => {
    if (fbReady) {
      const h = e => {
        if (e.key === 'Escape') { endless?setDone(true):setMode('settings'); return }
        nextQ()
      }
      window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
    }
    if (!showFb) {
      const h = e => {
        if (e.key === 'Escape') { endless?setDone(true):setMode('settings'); return }
        const i=KEYS.indexOf(e.key.toLowerCase()); if(i>=0&&i<5) answer(i)
      }
      window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
    }
  }, [answer, showFb, fbReady, endless])

  const skRows=[
    [{action:()=>setCount(15)},{action:()=>setCount(0)}],
    [{action:()=>setQuizType('figuren')},{action:()=>setQuizType('winkel')}],
  ]
  const{isFocused:skF,isStartFocused:skS}=useSettingsKeyboard(skRows,startGame,onBack,mode==='settings')

  // ── Settings ──
  if (mode === 'settings') return (
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={onBack}/>
      <div style={{color:T.teal,fontSize:24,fontWeight:'bold',marginBottom:24}}>Figuren zusammensetzen</div>
      <Card>
        <div style={{marginBottom:20}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:10}}>Anzahl Aufgaben:</div>
          <div style={{display:'flex',gap:8}}>
            {[{v:15,l:'15  (20 Min)'},{v:0,l:'∞  Endlosmodus'}].map((o,i) => (
              <button key={o.v} onClick={() => setCount(o.v)} style={{background:count===o.v?`${T.teal}22`:T.surf2,border:`1px solid ${count===o.v?T.teal:T.border}`,borderRadius:8,color:count===o.v?T.teal:T.text,cursor:'pointer',padding:'8px 18px',fontSize:14,boxShadow:skF(0,i)?`0 0 0 2px ${T.teal}`:'none'}}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{color:T.muted,fontSize:13,marginBottom:10}}>Übungsmodus:</div>
          <div style={{display:'flex',gap:8}}>
            {[{v:'figuren',l:'Figuren zusammensetzen'},{v:'winkel',l:'Winkel üben'}].map((o,i) => (
              <button key={o.v} onClick={() => setQuizType(o.v)} style={{background:quizType===o.v?`${T.teal}22`:T.surf2,border:`1px solid ${quizType===o.v?T.teal:T.border}`,borderRadius:8,color:quizType===o.v?T.teal:T.text,cursor:'pointer',padding:'8px 18px',fontSize:14,boxShadow:skF(1,i)?`0 0 0 2px ${T.teal}`:'none'}}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{background:T.teal,border:'none',borderRadius:10,color:'#000',cursor:'pointer',padding:'14px 32px',fontSize:16,fontWeight:'bold',boxShadow:skS()?`0 0 0 3px ${T.teal}88`:'none'}}>Starten</button>
        <div style={{color:T.muted,fontSize:11,marginTop:12}}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )

  if (done) return (
    <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <BackBtn onBack={onBack}/>
      <ResultScreen correct={score} total={total} onRetry={() => setMode('settings')} onBack={onBack}/>
    </div>
  )

  const q = question; if (!q || !rotations.length) return null
  const getState = i => selected===null?'idle':i===q.correctIdx?'correct':i===selected?'wrong':'idle'

  const optBtn = (o, i) => (
    <button key={i} onClick={() => answer(i)} style={{
      display:'flex',alignItems:'center',gap:14,width:'100%',
      background:selected===null?T.surf2:i===q.correctIdx?`${T.green}22`:i===selected?`${T.red}22`:T.surf2,
      border:`1px solid ${selected===null?T.border:i===q.correctIdx?T.green:i===selected?T.red:T.border}`,
      borderRadius:10,color:T.text,cursor:selected===null?'pointer':'default',
      padding:'10px 16px',fontSize:14,marginBottom:8,transition:'all 0.15s'
    }}>
      <span style={{color:T.yellow,fontWeight:'bold',minWidth:22}}>{OPTS[i]}</span>
      {o
        ? <><AnswerSVG shape={'sides' in o ? (POLY_SHAPES.find(s=>s.sides===o.sides)||POLY_SHAPES[0]) : o.shape} size={56}/><span>{'label' in o ? o.label : o.shape?.label}</span></>
        : <span style={{color:T.muted}}>Keine Antwort ist richtig.</span>}
      {selected!==null && i===q.correctIdx && <span style={{color:T.green,marginLeft:'auto'}}>✓</span>}
      {selected!==null && i===selected && i!==q.correctIdx && <span style={{color:T.red,marginLeft:'auto'}}>✗</span>}
    </button>
  )

  // ── Winkel mode ──
  if (quizType === 'winkel') return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <button onClick={() => endless?setDone(true):setMode('settings')} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Zurück</button>
          <div style={{color:T.teal,fontSize:18,fontWeight:'bold'}}>Winkel üben</div>
        </div>
        <ScoreBar score={score} total={total} color={T.teal}/>
      </div>
      {!endless&&<ProgressBar current={count-remaining+1} total={count} color={T.teal}/>}
      <Card style={{marginBottom:16}}>
        <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Zu welchem regelmäßigen Vieleck gehört dieser Winkel?</div>
        <div style={{display:'flex',justifyContent:'center'}}>
          <WinkelDisplay deg={q.deg}/>
        </div>
      </Card>
      <Card>
        {q.opts.map((o, i) => optBtn(o, i))}
        {!showFb && <KeyHint/>}
        {showFb && (
          <div style={{marginTop:16,background:T.surf2,borderRadius:12,padding:'16px 20px'}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:10}}>
              {q.deg}° = 360° ÷ {Math.round(360/q.deg)} → <span style={{color:T.green,fontWeight:'bold'}}>{WINKEL_DATA.find(w=>Math.abs(w.deg-q.deg)<0.2)?.label}</span>
            </div>
            <button onClick={nextQ} style={{background:T.teal,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'8px 20px',fontSize:14,fontWeight:'bold'}}>
              Weiter <span style={{opacity:0.6,fontSize:12}}>(beliebige Taste)</span>
            </button>
          </div>
        )}
      </Card>
    </div>
  )

  // ── Figuren mode ──
  return (
    <div style={{maxWidth:840,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <button onClick={() => endless?setDone(true):setMode('settings')} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:'pointer',padding:'6px 14px',fontSize:13}}>← Zurück</button>
          <div style={{color:T.teal,fontSize:18,fontWeight:'bold'}}>Figuren zusammensetzen</div>
        </div>
        <ScoreBar score={score} total={total} color={T.teal}/>
      </div>
      {!endless&&<ProgressBar current={count-remaining+1} total={count} color={T.teal}/>}
      <Card style={{marginBottom:16}}>
        <div style={{color:T.muted,fontSize:13,marginBottom:16}}>Welche Figur ergibt sich aus diesen Teilen?</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {q.pieces.normalized.map((p, i) => (
            <PieceTile key={i} data={p} rotation={rotations[i]||0}/>
          ))}
        </div>
      </Card>
      <Card>
        {q.opts.map((o, i) => (
          <button key={i} onClick={() => answer(i)} style={{
            display:'flex',alignItems:'center',gap:14,width:'100%',
            background:selected===null?T.surf2:i===q.correctIdx?`${T.green}22`:i===selected?`${T.red}22`:T.surf2,
            border:`1px solid ${selected===null?T.border:i===q.correctIdx?T.green:i===selected?T.red:T.border}`,
            borderRadius:10,color:T.text,cursor:selected===null?'pointer':'default',
            padding:'10px 16px',fontSize:14,marginBottom:8,transition:'all 0.15s'
          }}>
            <span style={{color:T.yellow,fontWeight:'bold',minWidth:22}}>{OPTS[i]}</span>
            {o.shape ? (<><AnswerSVG shape={o.shape} size={62}/><span>{o.shape.label}</span></>) : <span style={{color:T.muted}}>Keine Antwort ist richtig.</span>}
            {selected!==null && i===q.correctIdx && <span style={{color:T.green,marginLeft:'auto'}}>✓</span>}
            {selected!==null && i===selected && i!==q.correctIdx && <span style={{color:T.red,marginLeft:'auto'}}>✗</span>}
          </button>
        ))}
        {!showFb && <KeyHint/>}
        {showFb && (
          <div style={{marginTop:16,background:T.surf2,borderRadius:12,padding:'16px 20px'}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:12}}>
              {q.correctIdx === 4
                ? `Keine Antwort ist richtig. Die Teile bilden ein ${q.targetShape?.label}, aber diese Option war nicht verfügbar.`
                : `Richtige Antwort: ${q.targetShape?.label}`}
            </div>
            {q.targetShape && (
              <div style={{marginBottom:12}}>
                <div style={{color:T.muted,fontSize:11,marginBottom:6}}>Zusammengesetzt:</div>
                <div style={{background:T.bg,borderRadius:10,padding:8,display:'inline-block'}}>
                  <AssembledView task={q} size={200}/>
                </div>
              </div>
            )}
            <button onClick={nextQ} style={{background:T.teal,border:'none',borderRadius:8,color:'#000',cursor:'pointer',padding:'8px 20px',fontSize:14,fontWeight:'bold'}}>
              Weiter <span style={{opacity:0.6,fontSize:12}}>(beliebige Taste)</span>
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
