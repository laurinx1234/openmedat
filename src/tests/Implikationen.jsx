import { useState, useEffect, useRef, useId } from 'react'
import { T } from '../theme.js'
import {
  Card,
  BackBtn,
  ProgressBar,
  TimerBadge,
  OptionBtn,
  ResultScreen,
  KeyHint,
  ScoreBar,
  NavDots,
  useTimer,
  useSettingsKeyboard,
  shuffle,
  OPTS,
  KEYS,
  saveStat,
} from '../components/Shared.jsx'
import { NOUNS, VALID_MODI, INVALID_MODI } from '../data/syllogismen.js'

function wPick(items) {
  const tot = items.reduce((s, i) => s + i.w, 0)
  let r = Math.random() * tot
  for (const it of items) {
    r -= it.w
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

function vennLabels(words) {
  const groups = new Map()
  for (const w of words) {
    const k = w.charAt(0)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(w)
  }
  const labels = new Map()
  for (const group of groups.values()) {
    if (group.length === 1) {
      labels.set(group[0], group[0].charAt(0))
      continue
    }
    let n = 1
    const maxLen = Math.max(...group.map((w) => w.length))
    while (n < maxLen && new Set(group.map((w) => w.slice(0, n))).size < group.length) n++
    for (const w of group) labels.set(w, w.slice(0, n))
  }
  return words.map((w) => labels.get(w))
}

function parsePremise(text, S, M, C) {
  const prefix = text.startsWith('Alle ') ? 'Alle' : 'Einige'
  const body = text.slice(prefix.length + 1, text.endsWith('.') ? -1 : undefined)
  const negative = body.includes(' sind keine ')
  const [a, b] = body.split(negative ? ' sind keine ' : ' sind ')
  const roleOf = (noun) => (noun === S ? 'S' : noun === M ? 'M' : noun === C ? 'C' : null)
  const ra = roleOf(a)
  const rb = roleOf(b)
  if (!ra || !rb) return null
  const quant = prefix === 'Alle' ? (negative ? 'none' : 'all') : negative ? 'some_not' : 'some'
  return { quant, a: ra, b: rb }
}

export function makeTask() {
  const isValid = Math.random() < 0.75
  const pool = shuffle([...new Set(NOUNS)])
  const [S, M, C] = pool
  const mod = wPick(isValid ? VALID_MODI : INVALID_MODI)
  const concl = isValid ? mod.concl : 'keine'
  const p1 = mod.p1(S, M, C)
  const p2 = mod.p2(S, M, C)
  const options = [
    `Alle ${S} sind ${C}.`,
    `Einige ${S} sind ${C}.`,
    `Alle ${S} sind keine ${C}.`,
    `Einige ${S} sind keine ${C}.`,
    'Keine Schlussfolgerung ist richtig.',
  ]
  return {
    p1,
    p2,
    S,
    M,
    C,
    concl,
    premises: [parsePremise(p1, S, M, C), parsePremise(p2, S, M, C)].filter(Boolean),
    options,
    correctIdx: { alle: 0, einige: 1, kein: 2, einige_nicht: 3, keine: 4 }[concl],
    modusName: isValid ? mod.name : `Ungültig (${mod.name})`,
  }
}

const VENN_R = 84
const VENN_W = 344
const VENN_H = 292
const VENN_BITS = { S: 1, M: 2, C: 4 }
const VENN_CIRCLES = {
  S: { cx: 130, cy: 118 },
  M: { cx: 214, cy: 118 },
  C: { cx: 172, cy: 192 },
}
const VENN_LABELS = {
  S: { x: 88, y: 72 },
  M: { x: 256, y: 72 },
  C: { x: 172, y: 258 },
}

const VENN_REGION_STATS = (() => {
  const points = Array.from({ length: 8 }, () => [])
  for (let y = 0; y <= VENN_H; y += 2) {
    for (let x = 0; x <= VENN_W; x += 2) {
      let k = 0
      for (const [name, c] of Object.entries(VENN_CIRCLES)) {
        const dx = x - c.cx
        const dy = y - c.cy
        if (dx * dx + dy * dy <= VENN_R * VENN_R) k |= VENN_BITS[name]
      }
      points[k].push([x, y])
    }
  }
  return points.map((pts) => {
    if (!pts.length) return null
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    let best = pts[0]
    let bestD = Infinity
    for (const p of pts) {
      const d = (p[0] - cx) ** 2 + (p[1] - cy) ** 2
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return { x: best[0], y: best[1], n: pts.length }
  })
})()

function applyPremises(premises) {
  const shaded = new Set()
  const existential = []
  for (const p of premises) {
    const a = VENN_BITS[p.a]
    const b = VENN_BITS[p.b]
    if (p.quant === 'all') {
      for (let k = 1; k < 8; k++) if (k & a && !(k & b)) shaded.add(k)
    } else if (p.quant === 'none') {
      for (let k = 1; k < 8; k++) if (k & a && k & b) shaded.add(k)
    } else {
      const wantB = p.quant === 'some'
      const candidates = []
      for (let k = 1; k < 8; k++) {
        if (!(k & a)) continue
        if (Boolean(k & b) === wantB) candidates.push(k)
      }
      existential.push(candidates)
    }
  }
  const marks = []
  for (const candidates of existential) {
    const open = candidates.filter((k) => !shaded.has(k))
    const pool = open.length ? open : candidates
    let best = pool[0]
    for (const k of pool) if (VENN_REGION_STATS[k].n > VENN_REGION_STATS[best].n) best = k
    if (best !== undefined && !marks.includes(best)) marks.push(best)
  }
  return { shaded, marks }
}

function conclusionRegions(concl) {
  if (concl !== 'alle' && concl !== 'einige' && concl !== 'kein' && concl !== 'einige_nicht') return []
  const wantC = concl === 'kein' || concl === 'einige'
  const regions = []
  for (let k = 1; k < 8; k++) {
    if (!(k & VENN_BITS.S)) continue
    if (Boolean(k & VENN_BITS.C) === wantC) regions.push(k)
  }
  return regions
}

export function SyllogismVenn({ task }) {
  const uid = 'venn' + useId().replace(/:/g, '')
  const { shaded, marks } = applyPremises(task.premises || [])
  const conclRegions = conclusionRegions(task.concl)
  const regionIds = [1, 2, 3, 4, 5, 6, 7]
  const [sLabel, mLabel, cLabel] = vennLabels([task.S, task.M, task.C])
  const letters = { S: sLabel, M: mLabel, C: cLabel }

  return (
    <div style={{ marginTop: 16 }}>
      <svg
        viewBox={`0 0 ${VENN_W} ${VENN_H}`}
        role="img"
        aria-label="Venn-Diagramm zu den Prämissen"
        style={{ width: '100%', maxWidth: 344, display: 'block', margin: '0 auto' }}
      >
        <defs>
          <pattern id={`${uid}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke={T.muted} strokeWidth="1.2" />
          </pattern>
          {regionIds.map((k) => (
            <mask key={k} id={`${uid}-m${k}`} maskUnits="userSpaceOnUse" x="0" y="0" width={VENN_W} height={VENN_H}>
              <rect x="0" y="0" width={VENN_W} height={VENN_H} fill="#000" />
              {Object.entries(VENN_CIRCLES).map(([name, c]) =>
                k & VENN_BITS[name] ? <circle key={name} cx={c.cx} cy={c.cy} r={VENN_R} fill="#fff" /> : null
              )}
              {Object.entries(VENN_CIRCLES).map(([name, c]) =>
                !(k & VENN_BITS[name]) ? <circle key={name} cx={c.cx} cy={c.cy} r={VENN_R} fill="#000" /> : null
              )}
            </mask>
          ))}
        </defs>
        {regionIds.map((k) =>
          shaded.has(k) ? (
            <rect
              key={`s${k}`}
              x="0"
              y="0"
              width={VENN_W}
              height={VENN_H}
              fill={`url(#${uid}-hatch)`}
              mask={`url(#${uid}-m${k})`}
            />
          ) : null
        )}
        {conclRegions.map((k) => (
          <rect
            key={`c${k}`}
            x="0"
            y="0"
            width={VENN_W}
            height={VENN_H}
            fill={T.green}
            opacity="0.18"
            mask={`url(#${uid}-m${k})`}
          />
        ))}
        {Object.entries(VENN_CIRCLES).map(([name, c]) => (
          <circle key={name} cx={c.cx} cy={c.cy} r={VENN_R} fill="none" stroke={T.muted} strokeWidth="1.4" />
        ))}
        {Object.entries(VENN_LABELS).map(([name, p]) => (
          <text
            key={name}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={letters[name].length > 4 ? 10 : letters[name].length > 1 ? 12 : 15}
            fontWeight="bold"
            fill={T.text2}
          >
            {letters[name]}
          </text>
        ))}
        {marks.map((k) => (
          <text
            key={`x${k}`}
            x={VENN_REGION_STATS[k].x}
            y={VENN_REGION_STATS[k].y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="21"
            fontWeight="bold"
            fill={T.yellow}
          >
            ×
          </text>
        ))}
      </svg>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '4px 14px',
          color: T.text2,
          fontSize: 12,
          marginTop: 6,
        }}
      >
        <span>
          {letters.S} = {task.S}
        </span>
        <span>
          {letters.M} = {task.M}
        </span>
        <span>
          {letters.C} = {task.C}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '4px 14px',
          color: T.muted,
          fontSize: 11,
          marginTop: 4,
        }}
      >
        <span>▨ ausgeschlossen</span>
        <span style={{ color: T.yellow }}>× mind. ein Element</span>
        {conclRegions.length > 0 && <span style={{ color: T.green }}>■ Schlussfolgerung</span>}
      </div>
      {task.concl === 'keine' && (
        <div style={{ textAlign: 'center', color: T.muted, fontSize: 11, marginTop: 4 }}>
          Mehrere Fälle erfüllen die Prämissen – keine Aussage folgt zwingend.
        </div>
      )}
    </div>
  )
}

export function ImplQuiz({ questions, answers, onAnswer, color }) {
  const [focusedQ, setFocusedQ] = useState(0)
  const questionRefs = useRef({})
  const fqRef = useRef(focusedQ)
  const ansRef = useRef(answers)
  fqRef.current = focusedQ
  ansRef.current = answers

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        setFocusedQ((x) => {
          const nx = e.shiftKey ? Math.max(x - 1, 0) : Math.min(x + 1, questions.length - 1)
          questionRefs.current[nx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          return nx
        })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const cur = fqRef.current,
          curAns = ansRef.current[cur]
        const nx = curAns === null ? 0 : (curAns + 1) % questions[cur].options.length
        onAnswer(cur, nx)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = fqRef.current,
          curAns = ansRef.current[cur]
        const len = questions[cur].options.length
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
      <NavDots
        questions={questions}
        answers={answers}
        current={focusedQ}
        onGo={(i) => {
          setFocusedQ(i)
          questionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }}
        color={color}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, qi) => {
          const isFocused = focusedQ === qi
          return (
            <div
              key={qi}
              ref={(el) => (questionRefs.current[qi] = el)}
              onClick={() => setFocusedQ(qi)}
              style={{
                borderRadius: 12,
                outline: isFocused ? `2px solid ${color}` : '2px solid transparent',
                outlineOffset: 2,
                transition: 'outline 0.15s',
                cursor: 'pointer',
              }}
            >
              <Card>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ color: T.muted, fontSize: 13, minWidth: 22, flexShrink: 0, lineHeight: '20px' }}>
                    {qi + 1}.
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
                      Welche Schlussfolgerung ist logisch korrekt?
                    </div>
                    {[q.p1, q.p2].map((p, pi) => (
                      <div
                        key={pi}
                        style={{
                          display: 'flex',
                          gap: 12,
                          background: T.surf2,
                          borderRadius: 10,
                          padding: '14px 18px',
                          borderLeft: `3px solid ${color}`,
                          marginBottom: 10,
                        }}
                      >
                        <span style={{ color, fontWeight: 'bold', minWidth: 20 }}>{pi + 1}.</span>
                        <span style={{ color: T.text, fontSize: 16 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {q.options.map((o, i) => (
                  <OptionBtn
                    key={i}
                    label={OPTS[i]}
                    state={answers[qi] === i ? 'selected' : 'idle'}
                    onClick={() => onAnswer(qi, i)}
                    text={o}
                  />
                ))}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Implikationen({ onBack }) {
  const [mode, setMode] = useState('settings')
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [done, setDone] = useState(false)
  const [gameTimer, resetGame] = useTimer(0)
  const endless = count === 0

  // Endless one-at-a-time state
  const [curQ, setCurQ] = useState(null)
  const [selected, setSelected] = useState(null)
  const [showFb, setShowFb] = useState(false)
  const [fbReady, setFbReady] = useState(false)
  const [endlessSc, setEndlessSc] = useState(0)
  const [endlessTot, setEndlessTot] = useState(0)

  function startGame() {
    if (endless) {
      setCurQ(makeTask())
      setSelected(null)
      setShowFb(false)
      setFbReady(false)
      setEndlessSc(0)
      setEndlessTot(0)
      setDone(false)
    } else {
      const n = count
      const qs = Array.from({ length: n }, () => makeTask())
      setQuestions(qs)
      setAnswers(Array(n).fill(null))
      setDone(false)
      resetGame(count * 60)
    }
    setMode('game')
  }

  function finishGame() {
    if (endless) {
      setDone(true)
      return
    }
    const sc = answers.filter((a, i) => a === questions[i]?.correctIdx).length
    const tot = questions.length
    saveStat('implikationen', sc, tot)
    setDone(true)
  }

  // Timer expiry → finish (non-endless only)
  useEffect(() => {
    if (mode === 'game' && !endless && gameTimer <= 0 && !done) finishGame()
  }, [gameTimer, mode, endless, done])

  // Feedback advance in endless mode
  useEffect(() => {
    if (!fbReady) return
    const h = (e) => {
      if (e.key === 'Escape') {
        finishGame()
        return
      }
      nextQ()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fbReady])

  // Answer keys in endless mode
  useEffect(() => {
    if (mode !== 'game' || done || showFb || !endless) return
    const h = (e) => {
      if (e.key === 'Escape') {
        finishGame()
        return
      }
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && i < 5) endlessAnswer(i)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, showFb, endless, curQ])

  // Escape in non-endless game mode
  useEffect(() => {
    if (mode !== 'game' || done || endless) return
    const h = (e) => {
      if (e.key === 'Escape') setMode('settings')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, endless])

  function endlessAnswer(i) {
    if (selected !== null) return
    setSelected(i)
    if (i === curQ.correctIdx) setEndlessSc((s) => s + 1)
    setEndlessTot((t) => t + 1)
    setTimeout(() => {
      setShowFb(true)
      setTimeout(() => setFbReady(true), 200)
    }, 80)
  }

  function nextQ() {
    setFbReady(false)
    setShowFb(false)
    setSelected(null)
    setCurQ(makeTask())
  }

  function answer(qi, i) {
    if (done || endless) return
    const next = [...answers]
    if (next[qi] === i) {
      next[qi] = null
    } else {
      next[qi] = i
    }
    setAnswers(next)
  }

  const sc = endless ? endlessSc : answers.filter((a, i) => a === questions[i]?.correctIdx).length
  const tot = endless ? endlessTot : answers.filter((a) => a !== null).length

  const skRows = [[{ action: () => setCount(10) }, { action: () => setCount(0) }]]
  const { isFocused: skF, isStartFocused: skS } = useSettingsKeyboard(skRows, startGame, onBack, mode === 'settings')
  if (mode === 'settings')
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
        <BackBtn onBack={onBack} />
        <div style={{ color: T.yellow, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>
          Implikationen erkennen
        </div>
        <Card>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Anzahl Aufgaben:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 10, l: '10  (10 Min)' },
                { v: 0, l: '∞  Endlosmodus' },
              ].map((o, i) => (
                <button
                  key={o.v}
                  onClick={() => setCount(o.v)}
                  style={{
                    background: count === o.v ? `${T.yellow}25` : T.surf2,
                    border: `1px solid ${count === o.v ? T.yellow : T.border}`,
                    borderRadius: 8,
                    color: count === o.v ? T.yellow : T.text,
                    cursor: 'pointer',
                    padding: '8px 18px',
                    fontSize: 14,
                    boxShadow: skF(0, i) ? `0 0 0 2px ${T.yellow}` : 'none',
                  }}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={startGame}
            style={{
              background: T.yellow,
              border: 'none',
              borderRadius: 10,
              color: T.onAccent,
              cursor: 'pointer',
              padding: '14px 32px',
              fontSize: 16,
              fontWeight: 'bold',
              boxShadow: skS() ? `0 0 0 3px ${T.yellow}88` : 'none',
            }}
          >
            Starten
          </button>
          <div style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>
            ← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück
          </div>
        </Card>
      </div>
    )
  if (done) {
    const finalSc = endless ? endlessSc : sc
    const finalTot = endless ? endlessTot : tot
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
        <BackBtn onBack={onBack} />
        <ResultScreen correct={finalSc} total={finalTot} onRetry={() => setMode('settings')} onBack={onBack} />
      </div>
    )
  }

  // ── Endless game mode (one-at-a-time) ──
  if (endless && mode === 'game' && curQ) {
    const q = curQ
    const getState = (i) =>
      selected === null ? 'idle' : i === q.correctIdx ? 'correct' : i === selected ? 'wrong' : 'idle'
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              onClick={finishGame}
              style={{
                background: 'none',
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.muted,
                cursor: 'pointer',
                padding: '6px 14px',
                fontSize: 13,
              }}
            >
              ← Beenden
            </button>
            <div style={{ color: T.yellow, fontSize: 18, fontWeight: 'bold' }}>Implikationen erkennen</div>
          </div>
          <ScoreBar score={endlessSc} total={endlessTot} color={T.yellow} />
        </div>
        <Card>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
            Welche Schlussfolgerung ist logisch korrekt?
          </div>
          {[q.p1, q.p2].map((p, pi) => (
            <div
              key={pi}
              style={{
                display: 'flex',
                gap: 12,
                background: T.surf2,
                borderRadius: 10,
                padding: '14px 18px',
                borderLeft: `3px solid ${T.yellow}`,
                marginBottom: 10,
              }}
            >
              <span style={{ color: T.yellow, fontWeight: 'bold', minWidth: 20 }}>{pi + 1}.</span>
              <span style={{ color: T.text, fontSize: 16 }}>{p}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            {q.options.map((o, i) => (
              <OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={() => endlessAnswer(i)} text={o} />
            ))}
          </div>
          {!showFb && <KeyHint />}
          {showFb && (
            <div style={{ marginTop: 16, background: T.surf2, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 6 }}>{q.modusName}</div>
              <div style={{ fontSize: 14, marginBottom: 14 }}>
                {selected === q.correctIdx ? (
                  <span style={{ color: T.green }}>✓ Richtig!</span>
                ) : (
                  <span>
                    Richtige Antwort:{' '}
                    <span style={{ color: T.green, fontWeight: 'bold' }}>{q.options[q.correctIdx]}</span>
                  </span>
                )}
              </div>
              <SyllogismVenn task={q} />
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={nextQ}
                  style={{
                    background: T.yellow,
                    border: 'none',
                    borderRadius: 8,
                    color: T.onAccent,
                    cursor: 'pointer',
                    padding: '8px 20px',
                    fontSize: 14,
                    fontWeight: 'bold',
                  }}
                >
                  Weiter <span style={{ opacity: 0.6, fontSize: 12 }}>(beliebige Taste / Klick)</span>
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    )
  }

  // ── Non-endless game mode (all-at-once) ──
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={() => setMode('settings')}
            style={{
              background: 'none',
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.muted,
              cursor: 'pointer',
              padding: '6px 14px',
              fontSize: 13,
            }}
          >
            ← Zurück
          </button>
          <div style={{ color: T.yellow, fontSize: 18, fontWeight: 'bold' }}>Implikationen erkennen</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <ScoreBar score={sc} total={tot} color={T.yellow} />
          <TimerBadge seconds={gameTimer} />
        </div>
      </div>
      <ProgressBar current={tot + 1} total={count} color={T.yellow} />
      <ImplQuiz questions={questions} answers={answers} onAnswer={answer} color={T.yellow} />
      <div style={{ marginTop: 12 }}>
        <KeyHint />
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={finishGame}
          style={{
            background: T.yellow,
            border: 'none',
            borderRadius: 10,
            color: T.onAccent,
            cursor: 'pointer',
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          Ergebnis anzeigen ({tot}/{questions.length})
        </button>
      </div>
    </div>
  )
}
