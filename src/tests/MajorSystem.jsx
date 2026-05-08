import { useState, useEffect, useCallback } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, OptionBtn, ResultScreen, KeyHint, useSettingsKeyboard, rnd, shuffle, OPTS, KEYS } from '../components/Shared.jsx'

const MAJOR = [
  null,
  "Tee", "Noah", "Mai", "Reh", "Lee", "Schi", "Kuh", "Fee", "Po",
  "Tasse", "Tod", "Tanne", "Dom", "Teer", "Tal", "Tasche", "Theke", "TÜV", "Taube",
  "Nase", "Note", "Nonne", "Nemo", "Nero", "Nil", "Nische", "Nike", "Nivea", "Neubau",
  "Maus", "Motte", "Mohn", "Mama", "Meer", "Mehl", "Muschi", "Mücke", "Mofa", "Mopp",
  "Rose", "Radio", "Ruine", "Rama", "Rohr", "Rollo", "Rauch", "Rock", "Reif", "Rabe",
  "Lasso", "Latte", "Linie", "Lama", "Leier", "Lilie", "Loch", "Lok", "Lava", "Lupe",
  "Schuss", "Schotte", "Scheune", "Schaum", "Schere", "Schal", "Schach", "Scheck", "Schaf", "Scheibe",
  "Käse", "Kette", "Kinn", "Kamm", "Karre", "Kohle", "Koch", "Geige", "Kaffee", "Kappe",
  "Fass", "Foto", "Fahne", "Vim", "Feuer", "Fell", "Fisch", "Waage", "VW", "Wabe",
  "Bus", "Bett", "Bahn", "Baum", "Bär", "Ball", "Buch", "Pauke", "Pfau", "Papa",
  "Theseus",
]

const DIGITS = [
  { consonants: "s, ß, ss, z",  word: "Sau" },
  { consonants: "t, d",         word: "Tee" },
  { consonants: "n",            word: "Noah" },
  { consonants: "m",            word: "Mai" },
  { consonants: "r",            word: "Reh" },
  { consonants: "l",            word: "Lee" },
  { consonants: "sch, sh, ch, j", word: "Schi" },
  { consonants: "k, ck, g",     word: "Kuh" },
  { consonants: "f, ph, v, w",  word: "Fee" },
  { consonants: "p, b",         word: "Po" },
]

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

function ScoreBar({ score, total, color }) {
  const pct = total > 0 ? Math.round(score / total * 100) : 0
  return <span style={{ color, fontSize: 14 }}>{score}/{total} <span style={{ color: T.muted }}>({pct}%)</span></span>
}

const CATEGORIES = [
  { v: 'numbers', l: 'Zahlen 1–100' },
  { v: 'digits',  l: 'Ziffern 0–9' },
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
  const [dir, setDir] = useState('numberToWord')
  const [question, setQuestion] = useState(null)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [showFb, setShowFb] = useState(false)
  const [fbReady, setFbReady] = useState(false)
  const [done, setDone] = useState(false)

  const isNumbers = category === 'numbers'

  function startGame() {
    const t = isNumbers ? makeTask(dir) : makeDigitTask(dir)
    setQuestion(t)
    setScore(0)
    setTotal(0)
    setSelected(null)
    setShowFb(false)
    setDone(false)
    setMode('game')
  }

  const answer = useCallback((i) => {
    if (selected !== null || showFb) return
    setSelected(i)
    if (i === question.correctIdx) setScore(s => s + 1)
    setTotal(t => t + 1)
    setTimeout(() => { setShowFb(true); setTimeout(() => setFbReady(true), 250) }, 50)
  }, [selected, showFb, question])

  function nextQ() {
    setFbReady(false)
    setShowFb(false)
    setSelected(null)
    setQuestion(isNumbers ? makeTask(dir) : makeDigitTask(dir))
  }

  useEffect(() => {
    if (!fbReady) return
    const h = () => nextQ()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fbReady, dir, category])

  useEffect(() => {
    if (showFb) return
    const h = e => {
      if (e.key === 'Escape') { setDone(true); return }
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && i < 5) answer(i)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [answer, showFb])

  const catRow = CATEGORIES.map(c => ({ action: () => { setCategory(c.v); setDir(isNumbers ? 'numberToWord' : 'digitToWord') } }))
  const dirOpts = isNumbers ? DIRS_NUMBERS : DIRS_DIGITS
  const dirRow = dirOpts.map(d => ({ action: () => setDir(d.v) }))
  const skRows = [catRow, dirRow]
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
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Richtung:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dirOpts.map((d, i) => (
              <button key={d.v} onClick={() => setDir(d.v)} style={{
                background: dir === d.v ? `${T.pink}25` : T.surf2,
                border: `1px solid ${dir === d.v ? T.pink : T.border}`,
                borderRadius: 8, color: dir === d.v ? T.pink : T.text,
                cursor: 'pointer', padding: '10px 16px', fontSize: 14,
                boxShadow: skF(1, i) ? `0 0 0 2px ${T.pink}` : 'none',
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
  const getState = i => selected === null ? 'idle' : i === q.correctIdx ? 'correct' : i === selected ? 'wrong' : 'idle'
  const showNum = q.direction === 'numberToWord' || q.direction === 'digitToWord'
  const isDigit = q.category === 'digits'
  const promptText = showNum
    ? (isDigit ? 'Welches Bildwort gehört zu dieser Ziffer?' : 'Welches Bildwort gehört zu dieser Zahl?')
    : (isDigit ? 'Zu welcher Ziffer gehört dieses Bildwort?' : 'Zu welcher Zahl gehört dieses Bildwort?')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => setDone(true)} style={{
            background: 'none', border: `1px solid ${T.border}`, borderRadius: 8,
            color: T.muted, cursor: 'pointer', padding: '6px 14px', fontSize: 13,
          }}>← Zurück</button>
          <div style={{ color: T.pink, fontSize: 18, fontWeight: 'bold' }}>Major-System</div>
          <span style={{ color: T.muted, fontSize: 13 }}>
            {isDigit ? `Ziffern · ${showNum ? 'Ziffer→Wort' : 'Wort→Ziffer'}` : `Zahlen · ${showNum ? 'Zahl→Wort' : 'Wort→Zahl'}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <ScoreBar score={score} total={total} color={T.pink} />
          <span style={{ color: T.muted, fontSize: 13 }}>∞</span>
        </div>
      </div>
      <Card style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>{promptText}</div>
        <div style={{ color: T.pink, fontSize: 64, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
          {showNum ? (isDigit ? q.digit : q.number) : q.correctWord}
        </div>
      </Card>
      <Card>
        {q.options.map((o, i) => (
          <OptionBtn key={i} label={OPTS[i]} state={getState(i)} onClick={() => answer(i)} text={o} />
        ))}
        {!showFb && <KeyHint />}
        {showFb && (
          <div style={{ marginTop: 16, background: T.surf2, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 4 }}>
              Richtige Antwort: <span style={{ color: T.green, fontWeight: 'bold' }}>
                {showNum ? q.correctWord : (isDigit ? q.digit : q.number)}
              </span>
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
        )}
      </Card>
    </div>
  )
}
