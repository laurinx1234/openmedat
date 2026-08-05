import { useState, useEffect, useRef, useMemo } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, ResultScreen, KeyHint, ScoreBar, NavDots, useSettingsKeyboard, rnd, pick, shuffle, OPTS, KEYS, saveStat } from '../components/Shared.jsx'

// ─── Geometry ──────────────────────────────────────────────────────────────────
export function regPoly(n, cx=50, cy=50, r=44) {
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

export function ptsToPath(pts) {
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

export function arcPath(cx, cy, r, a0, a1) {
  const sw = ((a1-a0)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)
  if (sw >= 2*Math.PI-0.001) return null
  const x0=cx+r*Math.cos(a0), y0=cy+r*Math.sin(a0)
  const x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1)
  return `M ${cx},${cy} L ${x0.toFixed(2)},${y0.toFixed(2)} A ${r},${r} 0 ${sw>Math.PI?1:0},1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`
}

function tryCutPiece(pieces, targetIdx, totalArea, nx, ny, d, minFrac=0.05) {
  const p = pieces[targetIdx]
  const left  = clip(p,  nx,  ny,  d)
  const right = clip(p, -nx, -ny, -d)
  if (left.length < 3 || right.length < 3) return null
  if (polyArea(left)  < totalArea * minFrac) return null
  if (polyArea(right) < totalArea * minFrac) return null
  return [...pieces.slice(0,targetIdx), left, right, ...pieces.slice(targetIdx+1)]
}

function pickByArea(pieces) {
  const areas = pieces.map(p => polyArea(p))
  const tot = areas.reduce((s,a)=>s+a,0)
  let r = Math.random() * tot
  for (let i=0; i<areas.length; i++) { r -= areas[i]; if (r<=0) return i }
  return areas.length-1
}

function applyCutToPiece(pieces, targetIdx, totalArea, angle, offset) {
  const cx=50, cy=50, r=44
  const nx=Math.sin(angle), ny=-Math.cos(angle)
  for (const frac of [1.0, 0.6, 0.35, 0.0]) {
    const off = offset * frac
    const lx = cx + off*r*Math.cos(angle+Math.PI/2)
    const ly = cy + off*r*Math.sin(angle+Math.PI/2)
    const d = nx*lx+ny*ly
    const result = tryCutPiece(pieces, targetIdx, totalArea, nx, ny, d)
    if (result) return result
  }
  return null
}

function applyDoubleCut(pieces, targetIdx, totalArea) {
  const angle1 = Math.random() * Math.PI
  const offset1 = Math.random() * 1.2 - 0.6
  const result1 = applyCutToPiece(pieces, targetIdx, totalArea, angle1, offset1)
  if (!result1) return null
  const areaA = polyArea(result1[targetIdx])
  const areaB = polyArea(result1[targetIdx + 1])
  const secondTarget = areaA >= areaB ? targetIdx : targetIdx + 1
  const angle2 = angle1 + (Math.random() * 0.55 + 0.5) * (Math.random() < 0.5 ? 1 : -1)
  const offset2 = Math.random() * 1.0 - 0.5
  const result2 = applyCutToPiece(result1, secondTarget, totalArea, angle2, offset2)
  return result2 || result1
}

function genPolyPieces(sides) {
  const poly = regPoly(sides)
  const totalArea = polyArea(poly)
  let pieces = [poly]
  for (let cut = 0; cut < rnd(5,9); cut++) {
    if (pieces.length >= 9) break
    const useDouble = Math.random() < 0.3
    const result = useDouble
      ? applyDoubleCut(pieces, pickByArea(pieces), totalArea)
      : applyCutToPiece(pieces, pickByArea(pieces), totalArea, Math.random()*Math.PI, Math.random()*1.2-0.6)
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
  const numCuts = sweep <= Math.PI*0.6 ? rnd(2,3) : rnd(3,5)
  let pieces = [arcPoly]
  for (let cut = 0; cut < numCuts; cut++) {
    if (pieces.length >= 6) break
    const useDouble = Math.random() < 0.3
    const result = useDouble
      ? applyDoubleCut(pieces, pickByArea(pieces), totalArea)
      : applyCutToPiece(pieces, pickByArea(pieces), totalArea, Math.random()*Math.PI, Math.random()*1.0-0.5)
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
const WINKEL_POLYGONS = [
  {sides:5, label:'Fünfeck'},
  {sides:6, label:'Sechseck'},
  {sides:7, label:'Siebeneck'},
  {sides:8, label:'Achteck'},
]
const WINKEL_DATA = [
  {sides:5, label:'Fünfeck',   type:'innen',  deg:108},
  {sides:6, label:'Sechseck',  type:'innen',  deg:120},
  {sides:7, label:'Siebeneck', type:'innen',  deg:128.57},
  {sides:8, label:'Achteck',   type:'innen',  deg:135},
  {sides:5, label:'Fünfeck',   type:'spitze', deg:36},
  {sides:6, label:'Sechseck',  type:'spitze', deg:60},
  {sides:7, label:'Siebeneck', type:'spitze', deg:77.14},
  {sides:8, label:'Achteck',   type:'spitze', deg:90},
]

export const PC = ['#89b4fa','#cba6f7','#94e2d5','#a6e3a1','#f9e2af','#fab387','#f38ba8','#f5c2e7','#89dceb']

// ─── Answer shape SVG ──────────────────────────────────────────────────────────
function AnswerSVG({ shape, size=70 }) {
  const s=size, cx=s/2, cy=s/2, r=s*0.42
  const fill=`${T.teal}55`, stroke=T.teal, sw='1.8'
  if (shape.isPlaceholder) {
    if (shape.id==='ph_tri')  return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><polygon points={`${cx},${s*.1} ${s*.92},${s*.9} ${s*.08},${s*.9}`} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    if (shape.id==='ph_sq')   return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*.1} y={s*.1} width={s*.8} height={s*.8} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
    if (shape.id==='ph_rect') return <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s}><rect x={s*.06} y={s*.22} width={s*.88} height={s*.55} fill={fill} stroke={stroke} strokeWidth={sw}/></svg>
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

// ─── Puzzle piece tile ─────────────────────────────────────────────────────────
function PieceTile({ data, rotation, color }) {
  return (
    <svg viewBox="0 0 100 100" width="90" height="90">
      <g transform={`rotate(${rotation},50,50)`}>
        <path d={ptsToPath(data)} fill={`${color}55`} stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      </g>
    </svg>
  )
}

function genRotations(pieces) {
  return pieces.map(() => {
    const r = Math.random()
    if (r < 0.15) return rnd(8, 35)
    if (r < 0.30) return rnd(325, 352)
    if (r < 0.55) return rnd(40, 140)
    if (r < 0.80) return rnd(220, 320)
    return rnd(145, 215)
  })
}

// ─── Winkel display ────────────────────────────────────────────────────────────
function WinkelDisplay({ deg, display={}, size=200 }) {
  const { rotation=0, cx=size/2, cy=size*0.72, rayLen=size*0.44 } = display
  const rad = deg * Math.PI / 180
  const halfRad = rad / 2
  const x0 = cx + rayLen * Math.sin(halfRad), y0 = cy - rayLen * Math.cos(halfRad)
  const x1 = cx - rayLen * Math.sin(halfRad), y1 = cy - rayLen * Math.cos(halfRad)
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
        <line x1={cx} y1={cy} x2={x0.toFixed(1)} y2={y0.toFixed(1)} stroke={T.teal} strokeWidth="3" strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={x1.toFixed(1)} y2={y1.toFixed(1)} stroke={T.teal} strokeWidth="3" strokeLinecap="round"/>
      </g>
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

  let wrongOpts = others.map(s => ({shape:s}))
  if (Math.random() < 0.30) {
    const phIdx = Math.floor(Math.random() * wrongOpts.length)
    wrongOpts[phIdx] = {shape: pick(PLACEHOLDER_SHAPES)}
  }
  const opts4 = shuffle([...wrongOpts, {shape:targetShape}])
  const opts = [...opts4, {shape:null}]
  const ci = opts.findIndex(o => o.shape && o.shape.id === targetShape.id)
  return { pieces: pd, opts, correctIdx: ci, targetShape }
}

export function makeWinkelTask(prevDeg) {
  const type = Math.random() < 0.5 ? 'innen' : 'spitze'
  const pool = WINKEL_DATA.filter(p => p.type === type && p.deg !== prevDeg)
  const correct = pick(pool)
  const otherPolygons = shuffle(WINKEL_POLYGONS.filter(p => p.sides !== correct.sides))
  const correctPolygon = WINKEL_POLYGONS.find(p => p.sides === correct.sides)
  const opts = [...shuffle([correctPolygon, ...otherPolygons]), null]
  const ci = opts.findIndex(o => o && o.sides === correct.sides)
  return { deg: correct.deg, sides: correct.sides, type: correct.type, opts, correctIdx: ci }
}

// ─── FigurenQuiz component ─────────────────────────────────────────────────────
export function FigurenQuiz({ questions, answers, onAnswer, color }) {
  const [focusedQ, setFocusedQ] = useState(0)
  const questionRefs = useRef({})
  const fqRef = useRef(focusedQ)
  const ansRef = useRef(answers)
  fqRef.current = focusedQ
  ansRef.current = answers

  const rotations = useMemo(() =>
    questions.map(q => genRotations(q.pieces.normalized || [])),
    [questions]
  )

  useEffect(() => {
    const h = e => {
      if (e.key === 'Tab') {
        e.preventDefault()
        setFocusedQ(x => {
          const nx = e.shiftKey ? Math.max(x - 1, 0) : Math.min(x + 1, questions.length - 1)
          questionRefs.current[nx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          return nx
        })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const cur = fqRef.current, curAns = ansRef.current[cur]
        const nx = curAns === null ? 0 : (curAns + 1) % questions[cur].opts.length
        onAnswer(cur, nx)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = fqRef.current, curAns = ansRef.current[cur]
        const len = questions[cur].opts.length
        const nx = curAns === null ? len - 1 : (curAns - 1 + len) % len
        onAnswer(cur, nx)
      } else {
        const i = KEYS.indexOf(e.key.toLowerCase())
        if (i >= 0 && i < 5) onAnswer(fqRef.current, i)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onAnswer, questions])

  return (
    <div>
      <NavDots questions={questions} answers={answers} current={focusedQ} onGo={i => { setFocusedQ(i); questionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }} color={color} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, qi) => {
          const isFocused = focusedQ === qi
          const rots = rotations[qi] || []
          return (
            <div key={qi} ref={el => questionRefs.current[qi] = el} onClick={() => setFocusedQ(qi)} style={{ borderRadius: 12, outline: isFocused ? `2px solid ${color}` : '2px solid transparent', outlineOffset: 2, transition: 'outline 0.15s', cursor: 'pointer' }}>
              <Card>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ color: T.muted, fontSize: 13, minWidth: 22, flexShrink: 0, lineHeight: '20px' }}>{qi + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>Welche Figur ergibt sich aus diesen Teilen?</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(q.pieces.normalized || []).map((p, i) => (
                        <PieceTile key={i} data={p} rotation={rots[i] || 0} color={PC[i % 9]} />
                      ))}
                    </div>
                  </div>
                </div>
                {q.opts.map((o, i) => {
                  const sel = answers[qi] === i
                  return (
                    <button key={i} onClick={() => onAnswer(qi, i)} style={{
                      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                      background: sel ? `${color}22` : T.surf2,
                      border: `1px solid ${sel ? color : T.border}`, borderRadius: 10,
                      color: T.text, cursor: 'pointer', padding: '10px 16px', fontSize: 14,
                      marginBottom: 8, transition: 'all 0.15s'
                    }}>
                      <span style={{ color: T.yellow, fontWeight: 'bold', minWidth: 22 }}>{OPTS[i]}</span>
                      {o.shape ? (<><AnswerSVG shape={o.shape} size={56} /><span>{o.shape.label}</span></>) : <span style={{ color: T.muted }}>Keine der Figuren ist richtig.</span>}
                      {sel && <span style={{ color, marginLeft: 'auto' }}>✓</span>}
                    </button>
                  )
                })}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function Figuren({ onBack }) {
  const [mode, setMode] = useState('settings')
  const [count, setCount] = useState(15)
  const [quizType, setQuizType] = useState('figuren')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [done, setDone] = useState(false)
  // Winkel one-at-a-time state
  const [showFb, setShowFb] = useState(false)
  const [fbReady, setFbReady] = useState(false)
  const [selected, setSelected] = useState(null)
  const [question, setQuestion] = useState(null)
  const [remaining, setRemaining] = useState(0)
  const [winkelScore, setWinkelScore] = useState(0)
  const [winkelTotal, setWinkelTotal] = useState(0)
  const lastWinkelDeg = useRef(null)
  const endless = count === 0

  // Figuren endless one-at-a-time state
  const [figCurQ, setFigCurQ] = useState(null)
  const [figSelected, setFigSelected] = useState(null)
  const [figShowFb, setFigShowFb] = useState(false)
  const [figFbReady, setFigFbReady] = useState(false)
  const [figEndlessSc, setFigEndlessSc] = useState(0)
  const [figEndlessTot, setFigEndlessTot] = useState(0)
  // Memoize rotations for single endless question
  const figRotations = useMemo(() => figCurQ ? genRotations(figCurQ.pieces.normalized || []) : [], [figCurQ])

  function startGame() {
    if (quizType === 'figuren') {
      if (endless) {
        setFigCurQ(makeTask())
        setFigSelected(null); setFigShowFb(false); setFigFbReady(false)
        setFigEndlessSc(0); setFigEndlessTot(0); setDone(false)
        setMode('game')
      } else {
        const n = count
        const qs = Array.from({ length: n }, () => makeTask())
        setQuestions(qs)
        setAnswers(Array(n).fill(null))
        setDone(false)
        setMode('game')
      }
    } else {
      setWinkelScore(0); setWinkelTotal(0); setDone(false); lastWinkelDeg.current = null
      const q = makeWinkelTask(null)
      lastWinkelDeg.current = q.deg
      q.display = { rotation: rnd(0, 359), cx: rnd(75, 125), cy: rnd(85, 140), rayLen: rnd(55, 85) }
      setQuestion(q); setSelected(null); setShowFb(false); setFbReady(false)
      setRemaining(count); setMode('winkel')
    }
  }

  function finishFiguren() {
    if (endless && quizType === 'figuren') { setDone(true); return }
    const sc = answers.filter((a, i) => a === questions[i]?.correctIdx).length
    const tot = questions.length
    saveStat('figuren', sc, tot)
    setDone(true)
  }

  // Escape key for non-endless Figuren game mode
  useEffect(() => {
    if (mode !== 'game' || done) return
    if (endless && quizType === 'figuren') return // handled separately
    const h = e => { if (e.key === 'Escape') setMode('settings') }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, endless, quizType])

  // Figuren endless: feedback advance
  useEffect(() => {
    if (!figFbReady) return
    const h = e => { if (e.key === 'Escape') { finishFiguren(); return }; figNextQ() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [figFbReady])

  // Figuren endless: answer keys
  useEffect(() => {
    if (mode !== 'game' || done || figShowFb || !endless || quizType !== 'figuren') return
    const h = e => {
      if (e.key === 'Escape') { finishFiguren(); return }
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && i < 5) figEndlessAnswer(i)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, figShowFb, endless, quizType, figCurQ])

  function figEndlessAnswer(i) {
    if (figSelected !== null) return
    setFigSelected(i)
    if (i === figCurQ.correctIdx) setFigEndlessSc(s => s + 1)
    setFigEndlessTot(t => t + 1)
    setTimeout(() => { setFigShowFb(true); setTimeout(() => setFigFbReady(true), 200) }, 80)
  }

  function figNextQ() {
    setFigFbReady(false); setFigShowFb(false); setFigSelected(null)
    setFigCurQ(makeTask())
  }

  // Winkel answer/next
  const advanceRef = useRef(null)

  function winkelAnswer(i) {
    if (selected !== null) return
    const correct = i === question.correctIdx
    setSelected(i); if (correct) setWinkelScore(s => s + 1); setWinkelTotal(t => t + 1)
    if (endless) setTimeout(() => { setShowFb(true); setTimeout(() => setFbReady(true), 200) }, 80)
    else advanceRef.current = setTimeout(() => winkelNextQ(), 300)
  }

  function winkelNextQ() {
    setFbReady(false); setShowFb(false); setSelected(null)
    const rem = remaining - 1
    if (!endless && rem <= 0) {
      saveStat('figuren', winkelScore, winkelTotal)
      setDone(true); return
    }
    const q = makeWinkelTask(lastWinkelDeg.current)
    lastWinkelDeg.current = q.deg
    q.display = { rotation: rnd(0, 359), cx: rnd(75, 125), cy: rnd(85, 140), rayLen: rnd(55, 85) }
    setQuestion(q); setSelected(null); setShowFb(false); setFbReady(false)
    setRemaining(rem)
  }

  // Winkel keyboard effects
  useEffect(() => {
    if (fbReady) {
      const h = e => {
        if (e.key === 'Escape') { endless ? setDone(true) : setMode('settings'); return }
        winkelNextQ()
      }
      window.addEventListener('keydown', h)
      return () => window.removeEventListener('keydown', h)
    }
    if (!showFb && mode === 'winkel') {
      const h = e => {
        if (e.key === 'Escape') { endless ? setDone(true) : setMode('settings'); return }
        if (!endless && selected !== null) { clearTimeout(advanceRef.current); winkelNextQ(); return }
        const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0 && i < 5) winkelAnswer(i)
      }
      window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
    }
  }, [mode, showFb, fbReady, endless, selected, question, remaining])

  function figurenAnswer(qi, i) {
    if (done || endless) return
    const next = [...answers]
    if (next[qi] === i) { next[qi] = null }
    else { next[qi] = i }
    setAnswers(next)
  }

  const figSc = endless ? figEndlessSc : answers.filter((a, i) => a === questions[i]?.correctIdx).length
  const figTot = endless ? figEndlessTot : answers.filter(a => a !== null).length

  const skRows = [
    [{ action: () => setCount(15) }, { action: () => setCount(0) }],
    [{ action: () => setQuizType('figuren') }, { action: () => setQuizType('winkel') }],
  ]
  const { isFocused: skF, isStartFocused: skS } = useSettingsKeyboard(skRows, startGame, onBack, mode === 'settings')

  if (mode === 'settings') return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <BackBtn onBack={onBack} />
      <div style={{ color: T.teal, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Figuren zusammensetzen</div>
      <Card>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Anzahl Aufgaben:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: 15, l: '15  (20 Min)' }, { v: 0, l: '∞  Endlosmodus' }].map((o, i) => (
              <button key={o.v} onClick={() => setCount(o.v)} style={{ background: count === o.v ? `${T.teal}22` : T.surf2, border: `1px solid ${count === o.v ? T.teal : T.border}`, borderRadius: 8, color: count === o.v ? T.teal : T.text, cursor: 'pointer', padding: '8px 18px', fontSize: 14, boxShadow: skF(0, i) ? `0 0 0 2px ${T.teal}` : 'none' }}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Übungsmodus:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: 'figuren', l: 'Figuren zusammensetzen' }, { v: 'winkel', l: 'Winkel üben' }].map((o, i) => (
              <button key={o.v} onClick={() => setQuizType(o.v)} style={{ background: quizType === o.v ? `${T.teal}22` : T.surf2, border: `1px solid ${quizType === o.v ? T.teal : T.border}`, borderRadius: 8, color: quizType === o.v ? T.teal : T.text, cursor: 'pointer', padding: '8px 18px', fontSize: 14, boxShadow: skF(1, i) ? `0 0 0 2px ${T.teal}` : 'none' }}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{ background: T.teal, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold', boxShadow: skS() ? `0 0 0 3px ${T.teal}88` : 'none' }}>Starten</button>
        <div style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )

  if (done) {
    const finalSc = quizType === 'figuren' || mode === 'game' ? figSc : winkelScore
    const finalTot = quizType === 'figuren' || mode === 'game' ? figTot : winkelTotal
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
        <BackBtn onBack={onBack} />
        <ResultScreen correct={finalSc} total={finalTot} onRetry={() => setMode('settings')} onBack={onBack} />
      </div>
    )
  }

  // ── Figuren endless mode (one-at-a-time) ──
  if (mode === 'game' && endless && quizType === 'figuren' && figCurQ) {
    const q = figCurQ
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button onClick={finishFiguren} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>← Beenden</button>
            <div style={{ color: T.teal, fontSize: 18, fontWeight: 'bold' }}>Figuren zusammensetzen</div>
          </div>
          <ScoreBar score={figEndlessSc} total={figEndlessTot} color={T.teal} />
        </div>
        <Card>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>Welche Figur ergibt sich aus diesen Teilen?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {(q.pieces.normalized || []).map((p, i) => (
              <PieceTile key={i} data={p} rotation={figRotations[i] || 0} color={PC[i % 9]} />
            ))}
          </div>
          {q.opts.map((o, i) => {
            const isCorrect = figSelected !== null && i === q.correctIdx
            const isWrong = figSelected !== null && i === figSelected && i !== q.correctIdx
            const bg = isCorrect ? `${T.green}22` : isWrong ? `${T.red}22` : T.surf2
            const border = isCorrect ? T.green : isWrong ? T.red : T.border
            return (
              <button key={i} onClick={() => figEndlessAnswer(i)} style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                background: bg, border: `1px solid ${border}`, borderRadius: 10,
                color: T.text, cursor: figSelected !== null ? 'default' : 'pointer',
                padding: '10px 16px', fontSize: 14, marginBottom: 8, transition: 'all 0.15s'
              }}>
                <span style={{ color: T.yellow, fontWeight: 'bold', minWidth: 22 }}>{OPTS[i]}</span>
                {o.shape ? (<><AnswerSVG shape={o.shape} size={56} /><span>{o.shape.label}</span></>) : <span style={{ color: T.muted }}>Keine der Figuren ist richtig.</span>}
                {isCorrect && <span style={{ color: T.green, marginLeft: 'auto' }}>✓</span>}
                {isWrong && <span style={{ color: T.red, marginLeft: 'auto' }}>✗</span>}
              </button>
            )
          })}
          {!figShowFb && <KeyHint />}
          {figShowFb && (
            <div style={{ marginTop: 16, background: T.surf2, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                {figSelected === q.correctIdx
                  ? <span style={{ color: T.green }}>✓ Richtig!</span>
                  : <span>Richtige Antwort: <span style={{ color: T.green, fontWeight: 'bold' }}>{q.opts[q.correctIdx].shape ? q.opts[q.correctIdx].shape.label : 'Keine der Figuren ist richtig.'}</span></span>
                }
              </div>
              {q.targetShape && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <svg viewBox="0 0 100 100" width="120" height="120">
                    {(q.pieces.raw || []).map((p, i) => (
                      <path key={i} d={ptsToPath(p)} fill={`${PC[i % 9]}55`} stroke={PC[i % 9]} strokeWidth="1.5" strokeLinejoin="round" />
                    ))}
                  </svg>
                  <span style={{ color: T.teal, fontWeight: 'bold', fontSize: 16 }}>{q.targetShape.label}</span>
                </div>
              )}
              <button onClick={figNextQ} style={{ background: T.teal, border: 'none', borderRadius: 8, color: '#000', cursor: 'pointer', padding: '8px 20px', fontSize: 14, fontWeight: 'bold' }}>
                Weiter <span style={{ opacity: 0.6, fontSize: 12 }}>(beliebige Taste / Klick)</span>
              </button>
            </div>
          )}
        </Card>
      </div>
    )
  }

  // ── Figuren mode: vertical scroll (non-endless) ──
  if (mode === 'game') return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => setMode('settings')} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>← Zurück</button>
          <div style={{ color: T.teal, fontSize: 18, fontWeight: 'bold' }}>Figuren zusammensetzen</div>
        </div>
        <ScoreBar score={figSc} total={figTot} color={T.teal} />
      </div>
      <ProgressBar current={figTot + 1} total={count} color={T.teal} />
      <FigurenQuiz questions={questions} answers={answers} onAnswer={figurenAnswer} color={T.teal} />
      <div style={{ marginTop: 12 }}>
        <KeyHint />
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={finishFiguren} style={{ background: T.teal, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold' }}>Ergebnis anzeigen ({figTot}/{questions.length})</button>
      </div>
    </div>
  )

  // ── Winkel mode (one-at-a-time) ──
  const q = question; if (!q) return null
  const getState = i => selected === null ? 'idle' : i === q.correctIdx ? 'correct' : i === selected ? 'wrong' : 'idle'
  const btnStyle = i => ({
    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
    background: selected === null ? T.surf2 : i === q.correctIdx ? `${T.green}22` : i === selected ? `${T.red}22` : T.surf2,
    border: `1px solid ${selected === null ? T.border : i === q.correctIdx ? T.green : i === selected ? T.red : T.border}`,
    borderRadius: 10, color: T.text, cursor: selected === null ? 'pointer' : 'default',
    padding: '10px 16px', fontSize: 14, marginBottom: 8, transition: 'all 0.15s'
  })
  const wFb = WINKEL_DATA.find(w => w.deg === q.deg)
  const wInnen = WINKEL_DATA.filter(w => w.type === 'innen')
  const wSpitze = WINKEL_DATA.filter(w => w.type === 'spitze')
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => endless ? setDone(true) : setMode('settings')} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>← Zurück</button>
          <div style={{ color: T.teal, fontSize: 18, fontWeight: 'bold' }}>Winkel üben</div>
        </div>
        <ScoreBar score={winkelScore} total={winkelTotal} color={T.teal} />
      </div>
      {!endless && <ProgressBar current={count - remaining + 1} total={count} color={T.teal} />}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>Zu welchem regelmäßigen Vieleck gehört dieser Winkel?</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WinkelDisplay deg={q.deg} display={q.display} />
        </div>
      </Card>
      <Card>
        {q.opts.map((o, i) => (
          <button key={i} onClick={() => winkelAnswer(i)} style={btnStyle(i)}>
            <span style={{ color: T.yellow, fontWeight: 'bold', minWidth: 22 }}>{OPTS[i]}</span>
            {o ? <span>{o.label}</span> : <span style={{ color: T.muted }}>Keine Antwort ist richtig.</span>}
            {selected !== null && i === q.correctIdx && <span style={{ color: T.green, marginLeft: 'auto' }}>✓</span>}
            {selected !== null && i === selected && i !== q.correctIdx && <span style={{ color: T.red, marginLeft: 'auto' }}>✗</span>}
          </button>
        ))}
        {(!showFb || !endless) && selected === null && <KeyHint />}
        {showFb && endless && (
          <div style={{ marginTop: 16, background: T.surf2, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              <span style={{ color: T.muted }}>Dieser Winkel ({q.deg}°) ist der {q.type === 'innen' ? 'Innenwinkel' : 'Spitzenwinkel'} eines </span>
              <span style={{ color: T.green, fontWeight: 'bold' }}>{wFb?.label}</span>
            </div>
            <div style={{ color: T.muted, fontSize: 12, fontFamily: 'monospace', marginBottom: 14 }}>
              {q.type === 'innen'
                ? `(${q.sides}−2) × 180° ÷ ${q.sides} = ${(q.sides - 2) * 180}° ÷ ${q.sides} = ${q.deg}°`
                : `180° − 720° ÷ ${q.sides} = 180° − ${Math.round(720 / q.sides * 100) / 100}° = ${q.deg}°`}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
                <span style={{ color: T.muted, fontSize: 10, minWidth: 90 }}>Innenwinkel:</span>
                {wInnen.map(w => (
                  <span key={w.deg} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: w.deg === q.deg ? `${T.teal}22` : T.bg, color: w.deg === q.deg ? T.teal : T.muted, border: `1px solid ${w.deg === q.deg ? T.teal : T.border}` }}>
                    {w.label}: {w.deg}°
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: T.muted, fontSize: 10, minWidth: 90 }}>Spitzenwinkel:</span>
                {wSpitze.map(w => (
                  <span key={w.deg} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: w.deg === q.deg ? `${T.teal}22` : T.bg, color: w.deg === q.deg ? T.teal : T.muted, border: `1px solid ${w.deg === q.deg ? T.teal : T.border}` }}>
                    {w.label}: {w.deg}°
                  </span>
                ))}
              </div>
            </div>
            <button onClick={winkelNextQ} style={{ background: T.teal, border: 'none', borderRadius: 8, color: '#000', cursor: 'pointer', padding: '8px 20px', fontSize: 14, fontWeight: 'bold' }}>
              Weiter <span style={{ opacity: 0.6, fontSize: 12 }}>(beliebige Taste / Klick)</span>
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
