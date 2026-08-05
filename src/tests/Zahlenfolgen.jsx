import { useState, useEffect, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, ScoreBar, NavDots, useTimer, useSettingsKeyboard, OPTS, KEYS, saveStat } from '../components/Shared.jsx'
import { makeTask } from '../data/gens/index.js'

export function fmtChoice(c) {
  if (c === 'keine') return 'Keine Option ist richtig.'
  return Array.isArray(c) ? `${c[0]}  ,  ${c[1]}` : `${c}  ,  `
}

export function ZahlenQuiz({ questions, answers, onAnswer, color }) {
  const [focusedQ, setFocusedQ] = useState(0)
  const questionRefs = useRef({})
  const fqRef = useRef(focusedQ)
  const ansRef = useRef(answers)
  useEffect(() => { fqRef.current = focusedQ; ansRef.current = answers })

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
        const nx = curAns === null ? 0 : (curAns + 1) % questions[cur].choices.length
        onAnswer(cur, nx)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = fqRef.current, curAns = ansRef.current[cur]
        const len = questions[cur].choices.length
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
                    <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>Welche zwei Zahlen kommen als 8. und 9. Stelle?</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {q.visible.map((v, vi) => (
                        <div key={vi} style={{ minWidth: 56, padding: '12px 8px', background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 8, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: T.text }}>{v}</div>
                      ))}
                      {[0, 1].map(i => (<div key={`q${i}`} style={{ minWidth: 56, padding: '12px 8px', background: `${T.yellow}18`, border: `1px solid ${T.yellow}`, borderRadius: 8, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: T.yellow }}>?</div>))}
                    </div>
                  </div>
                </div>
                {q.choices.map((c, i) => (
                  <OptionBtn key={i} label={OPTS[i]} state={answers[qi] === i ? 'selected' : 'idle'} onClick={() => onAnswer(qi, i)} text={fmtChoice(c)} />
                ))}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Zahlenfolgen({ onBack }) {
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
      setSelected(null); setShowFb(false); setFbReady(false)
      setEndlessSc(0); setEndlessTot(0); setDone(false)
    } else {
      const qs = Array.from({ length: count }, () => makeTask())
      setQuestions(qs)
      setAnswers(Array(count).fill(null))
      setDone(false)
      resetGame(count * 90)
    }
    setMode('game')
  }

  function finishGame() {
    if (endless) { setDone(true); return }
    const sc = answers.filter((a, i) => a === questions[i]?.correctIdx).length
    const tot = questions.length
    saveStat('zahlenfolgen', sc, tot)
    setDone(true)
  }

  // Timer expiry → finish (non-endless only)
  useEffect(() => { if (mode === 'game' && !endless && gameTimer <= 0 && !done) finishGame() }, [gameTimer, mode, endless, done])

  // Feedback advance in endless mode
  useEffect(() => {
    if (!fbReady) return
    const h = e => { if (e.key === 'Escape') { finishGame(); return }; nextQ() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fbReady])

  // Answer keys in endless mode
  useEffect(() => {
    if (mode !== 'game' || done || showFb || !endless) return
    const h = e => {
      if (e.key === 'Escape') { finishGame(); return }
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && i < 5) endlessAnswer(i)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, showFb, endless, curQ])

  // Escape in non-endless game mode
  useEffect(() => {
    if (mode !== 'game' || done || endless) return
    const h = e => { if (e.key === 'Escape') setMode('settings') }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, endless])

  function endlessAnswer(i) {
    if (selected !== null) return
    setSelected(i)
    if (i === curQ.correctIdx) setEndlessSc(s => s + 1)
    setEndlessTot(t => t + 1)
    setTimeout(() => { setShowFb(true); setTimeout(() => setFbReady(true), 200) }, 80)
  }

  function nextQ() {
    setFbReady(false); setShowFb(false); setSelected(null)
    setCurQ(makeTask())
  }

  function answer(qi, i) {
    if (done || endless) return
    const next = [...answers]
    if (next[qi] === i) { next[qi] = null }
    else { next[qi] = i }
    setAnswers(next)
  }

  const sc = endless ? endlessSc : answers.filter((a, i) => a === questions[i]?.correctIdx).length
  const tot = endless ? endlessTot : answers.filter(a => a !== null).length

  const skRows = [
    [{ action: () => setCount(10) }, { action: () => setCount(0) }],
  ]
  const { isFocused: skF, isStartFocused: skS } = useSettingsKeyboard(skRows, startGame, onBack, mode === 'settings')
  if (mode === 'settings') return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <BackBtn onBack={onBack} />
      <div style={{ color: T.blue, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Zahlenfolgen</div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Anzahl Aufgaben:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: 10, l: '10  (15 Min)' }, { v: 0, l: '∞  Endlosmodus' }].map((o, i) => (
              <button key={o.v} onClick={() => setCount(o.v)} style={{ background: count === o.v ? `${T.blue}25` : T.surf2, border: `1px solid ${count === o.v ? T.blue : T.border}`, borderRadius: 8, color: count === o.v ? T.blue : T.text, cursor: 'pointer', padding: '8px 18px', fontSize: 14, boxShadow: skF(0, i) ? `0 0 0 2px ${T.blue}` : 'none' }}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{ background: T.blue, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold', boxShadow: skS() ? `0 0 0 3px ${T.blue}88` : 'none' }}>Starten</button>
        <div style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )
  if (done) {
    const finalSc = endless ? endlessSc : sc
    const finalTot = endless ? endlessTot : tot
    return (<div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}><BackBtn onBack={onBack} /><ResultScreen correct={finalSc} total={finalTot} onRetry={() => setMode('settings')} onBack={onBack} /></div>)
  }

  // ── Endless game mode (one-at-a-time) ──
  if (endless && mode === 'game' && curQ) {
    const q = curQ
    const getState = i => selected === null ? 'idle' : i === q.correctIdx ? 'correct' : i === selected ? 'wrong' : 'idle'
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button onClick={finishGame} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>← Beenden</button>
            <div style={{ color: T.blue, fontSize: 18, fontWeight: 'bold' }}>Zahlenfolgen</div>
          </div>
          <ScoreBar score={endlessSc} total={endlessTot} color={T.blue} />
        </div>
        <Card>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>Welche zwei Zahlen kommen als 8. und 9. Stelle?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {q.visible.map((v, vi) => (
              <div key={vi} style={{ minWidth: 56, padding: '12px 8px', background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 8, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: T.text }}>{v}</div>
            ))}
            {[0, 1].map(i => (<div key={`q${i}`} style={{ minWidth: 56, padding: '12px 8px', background: `${T.yellow}18`, border: `1px solid ${T.yellow}`, borderRadius: 8, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: T.yellow }}>?</div>))}
          </div>
          {q.choices.map((c, i) => (
            <OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={() => endlessAnswer(i)} text={fmtChoice(c)} />
          ))}
          {!showFb && <KeyHint />}
          {showFb && (
            <div style={{ marginTop: 16, background: T.surf2, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                {selected === q.correctIdx
                  ? <span style={{ color: T.green }}>✓ Richtig!</span>
                  : <span>Richtige Antwort: <span style={{ color: T.green, fontWeight: 'bold' }}>{fmtChoice(q.choices[q.correctIdx])}</span></span>
                }
              </div>
              {q.label && <div style={{ color: T.muted, fontSize: 13, marginBottom: 14, fontStyle: 'italic' }}>{q.label}</div>}
              <button onClick={nextQ} style={{ background: T.blue, border: 'none', borderRadius: 8, color: '#000', cursor: 'pointer', padding: '8px 20px', fontSize: 14, fontWeight: 'bold' }}>
                Weiter <span style={{ opacity: 0.6, fontSize: 12 }}>(beliebige Taste / Klick)</span>
              </button>
            </div>
          )}
        </Card>
      </div>
    )
  }

  // ── Non-endless game mode (all-at-once) ──
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => setMode('settings')} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>← Zurück</button>
          <div style={{ color: T.blue, fontSize: 18, fontWeight: 'bold' }}>Zahlenfolgen</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <ScoreBar score={sc} total={tot} color={T.blue} />
          <TimerBadge seconds={gameTimer} />
        </div>
      </div>
      <ProgressBar current={tot + 1} total={count} color={T.blue} />
      <ZahlenQuiz questions={questions} answers={answers} onAnswer={answer} color={T.blue} />
      <div style={{ marginTop: 12 }}>
        <KeyHint />
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={finishGame} style={{ background: T.blue, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold' }}>Ergebnis anzeigen ({tot}/{questions.length})</button>
      </div>
    </div>
  )
}
