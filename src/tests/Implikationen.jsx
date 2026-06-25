import { useState, useEffect, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, ScoreBar, NavDots, useTimer, useSettingsKeyboard, shuffle, OPTS, KEYS, saveStat } from '../components/Shared.jsx'
import { NOUNS, VALID_MODI, INVALID_MODI } from '../data/syllogismen.js'

function wPick(items) { const tot = items.reduce((s, i) => s + i.w, 0); let r = Math.random() * tot; for (const it of items) { r -= it.w; if (r <= 0) return it } return items[items.length - 1] }

export function makeTask() {
  const isValid = Math.random() < 0.75
  const pool = shuffle([...NOUNS]); const [S, M, C] = pool
  const mod = wPick(isValid ? VALID_MODI : INVALID_MODI)
  const concl = isValid ? mod.concl : 'keine'
  const options = [`Alle ${S} sind ${C}.`, `Einige ${S} sind ${C}.`, `Alle ${S} sind keine ${C}.`, `Einige ${S} sind keine ${C}.`, 'Keine Schlussfolgerung ist richtig.']
  return { p1: mod.p1(S, M, C), p2: mod.p2(S, M, C), S, C, options, correctIdx: { alle: 0, einige: 1, kein: 2, einige_nicht: 3, keine: 4 }[concl], modusName: isValid ? mod.name : `Ungültig (${mod.name})` }
}

export function ImplQuiz({ questions, answers, onAnswer, color }) {
  const [focusedQ, setFocusedQ] = useState(0)
  const questionRefs = useRef({})
  const fqRef = useRef(focusedQ)
  const ansRef = useRef(answers)
  fqRef.current = focusedQ
  ansRef.current = answers

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
        const nx = curAns === null ? 0 : (curAns + 1) % questions[cur].options.length
        onAnswer(cur, nx)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = fqRef.current, curAns = ansRef.current[cur]
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
      <NavDots questions={questions} answers={answers} current={focusedQ} onGo={i => { setFocusedQ(i); questionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }} color={color} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, qi) => {
          const isFocused = focusedQ === qi
          return (
            <div key={qi} ref={el => questionRefs.current[qi] = el} onClick={() => setFocusedQ(qi)} style={{ borderRadius: 12, outline: isFocused ? `2px solid ${color}` : '2px solid transparent', outlineOffset: 2, transition: 'outline 0.15s', cursor: 'pointer' }}>
              <Card>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ color: T.muted, fontSize: 13, minWidth: 22, flexShrink: 0, lineHeight: '20px' }}>{qi + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>Welche Schlussfolgerung ist logisch korrekt?</div>
                    {[q.p1, q.p2].map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', gap: 12, background: T.surf2, borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${color}`, marginBottom: 10 }}>
                        <span style={{ color, fontWeight: 'bold', minWidth: 20 }}>{pi + 1}.</span>
                        <span style={{ color: T.text, fontSize: 16 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {q.options.map((o, i) => (
                  <OptionBtn key={i} label={OPTS[i]} state={answers[qi] === i ? 'selected' : 'idle'} onClick={() => onAnswer(qi, i)} text={o} />
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

  function startGame() {
    const n = endless ? 100 : count
    const qs = Array.from({ length: n }, () => makeTask())
    setQuestions(qs)
    setAnswers(Array(n).fill(null))
    setDone(false)
    resetGame(endless ? 99999 : count * 60)
    setMode('game')
  }

  function finishGame() {
    const sc = answers.filter((a, i) => a === questions[i]?.correctIdx).length
    const tot = questions.length
    if (!endless) saveStat('implikationen', sc, tot)
    setDone(true)
  }

  useEffect(() => { if (mode === 'game' && !endless && gameTimer <= 0 && !done) finishGame() }, [gameTimer, mode, endless, done])

  useEffect(() => {
    if (mode !== 'game' || done) return
    const h = e => { if (e.key === 'Escape') { endless ? finishGame() : setMode('settings') } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, endless])

  function answer(qi, i) {
    if (done) return
    const next = [...answers]
    if (next[qi] === i) { next[qi] = null }
    else { next[qi] = i }
    setAnswers(next)
  }

  const sc = answers.filter((a, i) => a === questions[i]?.correctIdx).length
  const tot = answers.filter(a => a !== null).length

  const skRows = [
    [{ action: () => setCount(10) }, { action: () => setCount(0) }],
  ]
  const { isFocused: skF, isStartFocused: skS } = useSettingsKeyboard(skRows, startGame, onBack, mode === 'settings')
  if (mode === 'settings') return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <BackBtn onBack={onBack} />
      <div style={{ color: T.yellow, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Implikationen erkennen</div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Anzahl Aufgaben:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: 10, l: '10  (10 Min)' }, { v: 0, l: '∞  Endlosmodus' }].map((o, i) => (
              <button key={o.v} onClick={() => setCount(o.v)} style={{ background: count === o.v ? `${T.yellow}25` : T.surf2, border: `1px solid ${count === o.v ? T.yellow : T.border}`, borderRadius: 8, color: count === o.v ? T.yellow : T.text, cursor: 'pointer', padding: '8px 18px', fontSize: 14, boxShadow: skF(0, i) ? `0 0 0 2px ${T.yellow}` : 'none' }}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{ background: T.yellow, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold', boxShadow: skS() ? `0 0 0 3px ${T.yellow}88` : 'none' }}>Starten</button>
        <div style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )
  if (done) return (<div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}><BackBtn onBack={onBack} /><ResultScreen correct={sc} total={tot} onRetry={() => setMode('settings')} onBack={onBack} /></div>)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => endless ? finishGame() : setMode('settings')} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>← Zurück</button>
          <div style={{ color: T.yellow, fontSize: 18, fontWeight: 'bold' }}>Implikationen erkennen</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <ScoreBar score={sc} total={tot} color={T.yellow} />
          {!endless ? <TimerBadge seconds={gameTimer} /> : <span style={{ color: T.muted, fontSize: 13 }}>∞</span>}
        </div>
      </div>
      {!endless && <ProgressBar current={tot + 1} total={count} color={T.yellow} />}
      <ImplQuiz questions={questions} answers={answers} onAnswer={answer} color={T.yellow} />
      <div style={{ marginTop: 12 }}>
        <KeyHint />
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={finishGame} style={{ background: T.yellow, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold' }}>Ergebnis anzeigen ({tot}/{questions.length})</button>
      </div>
    </div>
  )
}
