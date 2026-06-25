import { useState, useEffect, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, TimerBadge, OptionBtn, ResultScreen, KeyHint, ScoreBar, NavDots, useTimer, useSettingsKeyboard, pick, shuffle, OPTS, KEYS, saveStat } from '../components/Shared.jsx'
import { UNIQUE_WORDS } from '../data/words.js'

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function makeTask() {
  const word = pick(UNIQUE_WORDS); const letters = word.split(''); const correct = word[0]
  const inWord = [...new Set(letters)]; const others = inWord.filter(l => l !== correct)
  const display = shuffle([...letters]); const injectNone = Math.random() < 0.15
  let opts, correctIdx
  if (injectNone) {
    const pool = shuffle(others.length >= 4 ? others : [...others, ...shuffle(ALPHA.filter(l => l !== correct)).slice(0, 4 - others.length)])
    opts = pool.slice(0, 4); correctIdx = 4
  } else {
    const pool = shuffle(others.length >= 3 ? others : [...others, ...shuffle(ALPHA.filter(l => !inWord.includes(l))).slice(0, 3 - others.length)])
    opts = shuffle([...pool.slice(0, 3), correct]); correctIdx = opts.indexOf(correct)
  }
  return { word, display, opts: [...opts, 'keine'], correctIdx }
}

export function WortQuiz({ questions, answers, onAnswer, color, displayMode }) {
  const mode = displayMode || 'gemischt'
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
          const vok = q.display.filter(l => 'AEIOU'.includes(l))
          const kons = q.display.filter(l => !'AEIOU'.includes(l))
          return (
            <div key={qi} ref={el => questionRefs.current[qi] = el} onClick={() => setFocusedQ(qi)} style={{ borderRadius: 12, outline: isFocused ? `2px solid ${color}` : '2px solid transparent', outlineOffset: 2, transition: 'outline 0.15s', cursor: 'pointer' }}>
              <Card>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ color: T.muted, fontSize: 13, minWidth: 22, flexShrink: 0, lineHeight: '20px' }}>{qi + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>Was ist der Anfangsbuchstabe des Wortes?</div>
                    {mode === 'gemischt' && <div style={{ letterSpacing: 10, fontSize: 32, fontWeight: 'bold', color: T.yellow, textAlign: 'center', padding: '20px 0', background: T.surf2, borderRadius: 10 }}>{q.display.join('  ')}</div>}
                    {mode === 'getrennt' && <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1, background: T.surf2, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                        <div style={{ color: T.muted, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>VOKALE</div>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: T.teal, letterSpacing: 8 }}>{vok.length ? vok.join('  ') : '–'}</div>
                      </div>
                      <div style={{ flex: 1, background: T.surf2, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                        <div style={{ color: T.muted, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>KONSONANTEN</div>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: T.orange, letterSpacing: 8 }}>{kons.length ? kons.join('  ') : '–'}</div>
                      </div>
                    </div>}
                    {mode === 'wolke' && <Buchstabenwolke letters={q.display} />}
                  </div>
                </div>
                {q.opts.map((o, i) => (
                  <OptionBtn key={i} label={OPTS[i]} state={answers[qi] === i ? 'selected' : 'idle'} onClick={() => onAnswer(qi, i)} text={o === 'keine' ? 'Keine Option ist richtig.' : o} />
                ))}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Buchstabenwolke({ letters }) {
  const n = letters.length
  return (
    <div style={{ position: 'relative', height: 190, background: T.surf2, borderRadius: 12, overflow: 'hidden', userSelect: 'none' }}>
      {letters.map((l, i) => {
        const phi = i * 2.399963
        const r = 14 + (i + 0.5) / n * 38
        const x = Math.max(6, Math.min(94, 50 + r * Math.cos(phi)))
        const y = Math.max(8, Math.min(92, 50 + r * 0.55 * Math.sin(phi)))
        const fs = [28, 22, 26, 20, 24][i % 5]
        const col = [T.yellow, T.text, T.mauve, T.yellow, T.text][i % 5]
        return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', fontSize: fs, fontWeight: 'bold', color: col, lineHeight: 1 }}>{l}</div>
      })}
    </div>
  )
}

export default function Wortfluessigkeit({ onBack }) {
  const [mode, setMode] = useState('settings')
  const [count, setCount] = useState(15)
  const [displayMode, setDisplayMode] = useState('gemischt')
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
    resetGame(endless ? 99999 : count * 80)
    setMode('game')
  }

  function finishGame() {
    const sc = answers.filter((a, i) => a === questions[i]?.correctIdx).length
    const tot = questions.length
    if (!endless) saveStat('wortfluessigkeit', sc, tot)
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
    [{ action: () => setCount(15) }, { action: () => setCount(0) }],
    [{ action: () => setDisplayMode('gemischt') }, { action: () => setDisplayMode('getrennt') }, { action: () => setDisplayMode('wolke') }],
  ]
  const { isFocused: skF, isStartFocused: skS } = useSettingsKeyboard(skRows, startGame, onBack, mode === 'settings')
  if (mode === 'settings') return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <BackBtn onBack={onBack} />
      <div style={{ color: T.mauve, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Wortflüssigkeit</div>
      <Card>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Anzahl Aufgaben:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: 15, l: '15  (20 Min)' }, { v: 0, l: '∞  Endlosmodus' }].map((o, i) => (
              <button key={o.v} onClick={() => setCount(o.v)} style={{ background: count === o.v ? `${T.mauve}25` : T.surf2, border: `1px solid ${count === o.v ? T.mauve : T.border}`, borderRadius: 8, color: count === o.v ? T.mauve : T.text, cursor: 'pointer', padding: '8px 18px', fontSize: 14, boxShadow: skF(0, i) ? `0 0 0 2px ${T.mauve}` : 'none' }}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Darstellungsmodus:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ v: 'gemischt', l: 'Gemischt' }, { v: 'getrennt', l: 'Vokale / Konsonanten' }, { v: 'wolke', l: 'Buchstabenwolke' }].map((o, i) => (
              <button key={o.v} onClick={() => setDisplayMode(o.v)} style={{ background: displayMode === o.v ? `${T.mauve}25` : T.surf2, border: `1px solid ${displayMode === o.v ? T.mauve : T.border}`, borderRadius: 8, color: displayMode === o.v ? T.mauve : T.text, cursor: 'pointer', padding: '8px 18px', fontSize: 14, boxShadow: skF(1, i) ? `0 0 0 2px ${T.mauve}` : 'none' }}>{o.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{ background: T.mauve, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold', boxShadow: skS() ? `0 0 0 3px ${T.mauve}88` : 'none' }}>Starten</button>
        <div style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück</div>
      </Card>
    </div>
  )
  if (done) return (<div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}><BackBtn onBack={onBack} /><ResultScreen correct={sc} total={tot} onRetry={() => setMode('settings')} onBack={onBack} /></div>)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => endless ? finishGame() : setMode('settings')} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>← Zurück</button>
          <div style={{ color: T.mauve, fontSize: 18, fontWeight: 'bold' }}>Wortflüssigkeit</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <ScoreBar score={sc} total={tot} color={T.mauve} />
          {!endless ? <TimerBadge seconds={gameTimer} /> : <span style={{ color: T.muted, fontSize: 13 }}>∞</span>}
        </div>
      </div>
      {!endless && <ProgressBar current={tot + 1} total={count} color={T.mauve} />}
      <WortQuiz questions={questions} answers={answers} onAnswer={answer} color={T.mauve} displayMode={displayMode} />
      <div style={{ marginTop: 12 }}>
        <KeyHint />
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={finishGame} style={{ background: T.mauve, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold' }}>Ergebnis anzeigen ({tot}/{questions.length})</button>
      </div>
    </div>
  )
}
