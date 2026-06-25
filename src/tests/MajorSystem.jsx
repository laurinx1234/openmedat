import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, OptionBtn, ResultScreen, KeyHint, ScoreBar, useSettingsKeyboard, rnd, OPTS, KEYS } from '../components/Shared.jsx'
import { MAJOR, DIGITS } from '../data/major-system.js'

export function makeTask(dir) {
  const d = dir === 'mixed' ? (Math.random() < 0.5 ? 'numberToWord' : 'wordToNumber') : dir
  const target = rnd(1, 100)
  if (d === 'numberToWord') {
    const correctWord = MAJOR[target]
    const distractors = shuffle(MAJOR.filter((_, i) => i > 0 && i !== target)).slice(0, 4)
    const options = shuffle([correctWord, ...distractors])
    return { category: 'numbers', direction: 'numberToWord', number: target, correctWord, options, correctIdx: options.indexOf(correctWord) }
  } else {
    const correctNumber = String(target)
    const distractors = shuffle(
      Array.from({ length: 99 }, (_, i) => String(i + 1)).filter(n => n !== correctNumber)
    ).slice(0, 4)
    const options = shuffle([correctNumber, ...distractors])
    return { category: 'numbers', direction: 'wordToNumber', number: target, correctWord: MAJOR[target], options, correctIdx: options.indexOf(correctNumber) }
  }
}

export function makeDigitTask(dir) {
  const d = dir === 'mixed' ? (Math.random() < 0.5 ? 'digitToWord' : 'wordToDigit') : dir
  const target = rnd(0, 9)
  const digit = DIGITS[target]
  if (d === 'digitToWord') {
    const distractors = shuffle(DIGITS.filter((_, i) => i !== target)).slice(0, 4).map(x => x.word)
    const options = shuffle([digit.word, ...distractors])
    return { category: 'digits', direction: 'digitToWord', digit: target, consonants: digit.consonants, correctWord: digit.word, options, correctIdx: options.indexOf(digit.word) }
  } else {
    const correctDigit = String(target)
    const distractors = shuffle(
      Array.from({ length: 9 }, (_, i) => String(i + (i >= target ? 1 : 0)))
    ).slice(0, 4)
    const options = shuffle([correctDigit, ...distractors])
    return { category: 'digits', direction: 'wordToDigit', digit: target, consonants: digit.consonants, correctWord: digit.word, options, correctIdx: options.indexOf(correctDigit) }
  }
}


const CATEGORIES = [
  { v: 'numbers', l: 'Zahlen 1–100' },
  { v: 'digits',  l: 'Ziffern 0–9' },
]

const GAMEMODES = [
  { v: 'choice', l: 'Multiple Choice' },
  { v: 'type',   l: 'Eingabe' },
]

const DIRS_NUMBERS = [
  { v: 'numberToWord', l: 'Zahl → Wort' },
  { v: 'wordToNumber', l: 'Wort → Zahl' },
  { v: 'mixed',        l: 'Gemischt' },
]

const DIRS_DIGITS = [
  { v: 'digitToWord', l: 'Ziffer → Wort' },
  { v: 'wordToDigit', l: 'Wort → Ziffer' },
  { v: 'mixed',       l: 'Gemischt' },
]

export default function MajorSystem({ onBack }) {
  const [mode, setMode] = useState('settings')
  const [category, setCategory] = useState('numbers')
  const [gameMode, setGameMode] = useState('choice')
  const [dir, setDir] = useState('numberToWord')
  const [question, setQuestion] = useState(null)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [showFb, setShowFb] = useState(false)
  const [fbReady, setFbReady] = useState(false)
  const [done, setDone] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef(null)

  const isNumbers = category === 'numbers'
  const isTyping = gameMode === 'type'

  function startGame() {
    const t = isNumbers ? makeTask(dir) : makeDigitTask(dir)
    setQuestion(t)
    setScore(0)
    setTotal(0)
    setSelected(null)
    setShowFb(false)
    setDone(false)
    setInputVal('')
    setMode('game')
  }

  // ── Choice mode answer ──
  const answer = useCallback((i) => {
    if (selected !== null || showFb) return
    setSelected(i)
    if (i === question.correctIdx) setScore(s => s + 1)
    setTotal(t => t + 1)
    setTimeout(() => { setShowFb(true); setTimeout(() => setFbReady(true), 250) }, 50)
  }, [selected, showFb, question])

  // ── Typing mode submit ──
  function submitTyped() {
    if (showFb || !question) return
    const raw = inputVal.trim()
    if (!raw) return
    const showNum = question.direction === 'numberToWord' || question.direction === 'digitToWord'
    const correct = showNum
      ? question.correctWord
      : (question.category === 'digits' ? String(question.digit) : String(question.number))
    const isCorrect = showNum
      ? raw.toLowerCase() === correct.toLowerCase()
      : raw === correct
    setSelected(isCorrect ? 0 : -1)
    if (isCorrect) setScore(s => s + 1)
    setTotal(t => t + 1)
    setTimeout(() => { setShowFb(true); setTimeout(() => setFbReady(true), 250) }, 50)
  }

  function nextQ() {
    setFbReady(false)
    setShowFb(false)
    setSelected(null)
    setInputVal('')
    setQuestion(isNumbers ? makeTask(dir) : makeDigitTask(dir))
  }

  // Auto-focus input in typing mode
  useEffect(() => {
    if (mode === 'game' && isTyping && !showFb && inputRef.current) inputRef.current.focus()
  }, [mode, isTyping, showFb, question])

  // Feedback advance key listener (both modes)
  useEffect(() => {
    if (!fbReady) return
    const h = () => nextQ()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fbReady, dir, category])

  // Answer key listener (choice mode only – typing mode uses input)
  useEffect(() => {
    if (showFb || isTyping) return
    const h = e => {
      if (e.key === 'Escape') { setDone(true); return }
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && i < 5) answer(i)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [answer, showFb, isTyping])

  // Escape in typing mode
  useEffect(() => {
    if (!isTyping || showFb) return
    const h = e => { if (e.key === 'Escape') setDone(true) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isTyping, showFb])

  const catRow = CATEGORIES.map(c => ({ action: () => { setCategory(c.v); setDir(isNumbers ? 'numberToWord' : 'digitToWord') } }))
  const modeRow = GAMEMODES.map(m => ({ action: () => setGameMode(m.v) }))
  const dirOpts = isNumbers ? DIRS_NUMBERS : DIRS_DIGITS
  const dirRow = dirOpts.map(d => ({ action: () => setDir(d.v) }))
  const skRows = [catRow, modeRow, dirRow]
  const { isFocused: skF, isStartFocused: skS } = useSettingsKeyboard(skRows, startGame, onBack, mode === 'settings')

  if (mode === 'settings') return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <BackBtn onBack={onBack} />
      <div style={{ color: T.pink, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Major-System</div>
      <Card>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Kategorie:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {CATEGORIES.map((c, i) => (
              <button key={c.v} onClick={() => { setCategory(c.v); setDir(c.v === 'numbers' ? 'numberToWord' : 'digitToWord') }} style={{
                background: category === c.v ? `${T.pink}25` : T.surf2,
                border: `1px solid ${category === c.v ? T.pink : T.border}`,
                borderRadius: 8, color: category === c.v ? T.pink : T.text,
                cursor: 'pointer', padding: '8px 18px', fontSize: 14,
                boxShadow: skF(0, i) ? `0 0 0 2px ${T.pink}` : 'none',
              }}>{c.l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Modus:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {GAMEMODES.map((m, i) => (
              <button key={m.v} onClick={() => setGameMode(m.v)} style={{
                background: gameMode === m.v ? `${T.pink}25` : T.surf2,
                border: `1px solid ${gameMode === m.v ? T.pink : T.border}`,
                borderRadius: 8, color: gameMode === m.v ? T.pink : T.text,
                cursor: 'pointer', padding: '8px 18px', fontSize: 14,
                boxShadow: skF(1, i) ? `0 0 0 2px ${T.pink}` : 'none',
              }}>{m.l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Richtung:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dirOpts.map((d, i) => (
              <button key={d.v} onClick={() => setDir(d.v)} style={{
                background: dir === d.v ? `${T.pink}25` : T.surf2,
                border: `1px solid ${dir === d.v ? T.pink : T.border}`,
                borderRadius: 8, color: dir === d.v ? T.pink : T.text,
                cursor: 'pointer', padding: '10px 16px', fontSize: 14,
                boxShadow: skF(2, i) ? `0 0 0 2px ${T.pink}` : 'none',
              }}>{d.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{
          background: T.pink, border: 'none', borderRadius: 10, color: '#000',
          cursor: 'pointer', padding: '14px 32px', fontSize: 16, fontWeight: 'bold',
          boxShadow: skS() ? `0 0 0 3px ${T.pink}88` : 'none',
        }}>Starten</button>
        <div style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>
          ← → Auswahl · ↑↓ Zeile · Enter bestätigen · Esc zurück
        </div>
      </Card>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <a href="https://de.wikipedia.org/wiki/Major-System" target="_blank" rel="noreferrer" style={{ color: T.muted, fontSize: 12, textDecoration: 'none' }}>
          Wikipedia: Major-System
        </a>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <BackBtn onBack={onBack} />
      <ResultScreen correct={score} total={total} onRetry={() => setMode('settings')} onBack={onBack} />
    </div>
  )

  const q = question
  if (!q) return null
  const showNum = q.direction === 'numberToWord' || q.direction === 'digitToWord'
  const isDigit = q.category === 'digits'
  const promptText = showNum
    ? (isDigit ? 'Welches Bildwort gehört zu dieser Ziffer?' : 'Welches Bildwort gehört zu dieser Zahl?')
    : (isDigit ? 'Zu welcher Ziffer gehört dieses Bildwort?' : 'Zu welcher Zahl gehört dieses Bildwort?')
  const modeLabel = isTyping ? 'Eingabe' : 'Choice'

  // ── Shared header ──
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button onClick={() => setDone(true)} style={{
          background: 'none', border: `1px solid ${T.border}`, borderRadius: 8,
          color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13,
        }}>← Zurück</button>
        <div style={{ color: T.pink, fontSize: 18, fontWeight: 'bold' }}>Major-System</div>
        <span style={{ color: T.muted, fontSize: 13 }}>
          {isDigit ? `Ziffern · ${showNum ? 'Ziffer→Wort' : 'Wort→Ziffer'}` : `Zahlen · ${showNum ? 'Zahl→Wort' : 'Wort→Zahl'}`}
          <span style={{ color: T.muted, opacity: 0.6 }}> · {modeLabel}</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ScoreBar score={score} total={total} color={T.pink} />
        <span style={{ color: T.muted, fontSize: 13 }}>∞</span>
      </div>
    </div>
  )

  // ── Question card (shared) ──
  const questionCard = (
    <Card style={{ marginBottom: 16, textAlign: 'center' }}>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>{promptText}</div>
      <div style={{ color: T.pink, fontSize: 64, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
        {showNum ? (isDigit ? q.digit : q.number) : q.correctWord}
      </div>
    </Card>
  )

  // ── Feedback card (shared) ──
  const typedCorrect = isTyping ? (selected === 0) : null
  const feedbackCard = showFb && (
    <div style={{ marginTop: 16, background: T.surf2, borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 4 }}>
        {isTyping ? (
          typedCorrect
            ? <span style={{ color: T.green, fontWeight: 'bold' }}>✓ Richtig!</span>
            : <span>Deine Eingabe: <span style={{ color: T.red }}>{inputVal}</span> · Richtig: <span style={{ color: T.green, fontWeight: 'bold' }}>{showNum ? q.correctWord : (isDigit ? q.digit : q.number)}</span></span>
        ) : (
          <>Richtige Antwort: <span style={{ color: T.green, fontWeight: 'bold' }}>{showNum ? q.correctWord : (isDigit ? q.digit : q.number)}</span></>
        )}
      </div>
      {isDigit && (
        <div style={{ color: T.muted, fontSize: 14, marginBottom: 6 }}>
          Konsonanten: <span style={{ color: T.text }}>{q.consonants}</span>
        </div>
      )}
      <div style={{ color: T.muted, fontSize: 22, marginBottom: 10 }}>
        <span style={{ color: T.pink, fontWeight: 'bold' }}>{isDigit ? q.digit : q.number}</span> → {q.correctWord}
      </div>
      <button onClick={nextQ} style={{
        background: T.pink, border: 'none', borderRadius: 8, color: '#000',
        cursor: 'pointer', padding: '8px 20px', fontSize: 14, fontWeight: 'bold',
      }}>Weiter → <span style={{ opacity: 0.6, fontSize: 12 }}>(beliebige Taste)</span></button>
    </div>
  )

  // ── Typing mode ──
  if (isTyping) {
    const placeholder = showNum ? 'Bildwort eingeben…' : 'Zahl eingeben…'
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        {header}
        {questionCard}
        <Card>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitTyped() }}
              disabled={showFb}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1, background: T.surf2, border: `1px solid ${showFb ? (typedCorrect ? T.green : T.red) : T.border}`,
                borderRadius: 8, color: T.text, padding: '14px 18px', fontSize: 20,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={submitTyped} disabled={showFb} style={{
              background: T.pink, border: 'none', borderRadius: 8, color: '#000',
              cursor: showFb ? 'default' : 'pointer', padding: '14px 20px', fontSize: 16, fontWeight: 'bold',
              opacity: showFb ? 0.5 : 1,
            }}>⏎</button>
          </div>
          {!showFb && <div style={{ color: T.muted, fontSize: 11, marginTop: 8 }}>Eingabe + Enter · Esc zurück</div>}
          {feedbackCard}
        </Card>
      </div>
    )
  }

  // ── Choice mode ──
  const getState = i => selected === null ? 'idle' : i === q.correctIdx ? 'correct' : i === selected ? 'wrong' : 'idle'
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      {header}
      {questionCard}
      <Card>
        {q.options.map((o, i) => (
          <OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={() => answer(i)} text={o} />
        ))}
        {!showFb && <KeyHint />}
        {feedbackCard}
      </Card>
    </div>
  )
}
