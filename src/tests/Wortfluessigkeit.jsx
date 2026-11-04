import { useState, useEffect, useRef } from 'react'
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
  pick,
  shuffle,
  OPTS,
  KEYS,
  saveStat,
} from '../components/Shared.jsx'
import { UNIQUE_WORDS } from '../data/words.js'

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

let taskSeq = 1

export function makeTask() {
  const word = pick(UNIQUE_WORDS)
  const letters = word.split('')
  const correct = word[0]
  const inWord = [...new Set(letters)]
  const others = inWord.filter((l) => l !== correct)
  const display = shuffle([...letters])
  const injectNone = Math.random() < 0.15
  let opts, correctIdx
  if (injectNone) {
    const pool = shuffle(
      others.length >= 4
        ? others
        : [...others, ...shuffle(ALPHA.filter((l) => l !== correct)).slice(0, 4 - others.length)]
    )
    opts = pool.slice(0, 4)
    correctIdx = 4
  } else {
    const pool = shuffle(
      others.length >= 3
        ? others
        : [...others, ...shuffle(ALPHA.filter((l) => !inWord.includes(l))).slice(0, 3 - others.length)]
    )
    opts = shuffle([...pool.slice(0, 3), correct])
    correctIdx = opts.indexOf(correct)
  }
  return { id: taskSeq++, word, display, opts: [...opts, 'keine'], correctIdx }
}

const BOARD_W = 600
const BOARD_H = 260
const TILE_W = 42
const TILE_H = 50
const LINE_TOL = 15

function scatterTiles(chars) {
  const n = chars.length
  const cols = Math.min(n, Math.ceil(n / 2))
  const rows = Math.ceil(n / cols)
  const cells = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c])
  const picked = shuffle(cells).slice(0, n)
  const stepX = cols > 1 ? (BOARD_W - 90) / (cols - 1) : 0
  const stepY = rows > 1 ? (BOARD_H - 100) / (rows - 1) : 0
  return chars.map((ch, i) => {
    const [r, c] = picked[i]
    return {
      id: i,
      ch,
      x: 45 + c * stepX + (Math.random() - 0.5) * Math.min(stepX * 0.35, 40),
      y: 50 + r * stepY + (Math.random() - 0.5) * Math.min(stepY * 0.3, 42),
    }
  })
}

function isLineSolved(tiles, word, sx = 1, sy = 1) {
  const n = tiles.length
  if (n < 2) return false
  const pts = tiles.map((t) => ({ ch: t.ch, x: t.x * sx, y: t.y * sy }))
  let cx = 0,
    cy = 0
  for (const t of pts) {
    cx += t.x
    cy += t.y
  }
  cx /= n
  cy /= n
  let sxx = 0,
    syy = 0,
    sxy = 0
  for (const t of pts) {
    const dx = t.x - cx
    const dy = t.y - cy
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const ax = Math.cos(theta)
  const ay = Math.sin(theta)
  const proj = []
  for (const t of pts) {
    const dx = t.x - cx
    const dy = t.y - cy
    if (Math.abs(-dx * ay + dy * ax) > LINE_TOL) return false
    proj.push({ ch: t.ch, p: dx * ax + dy * ay })
  }
  proj.sort((a, b) => a.p - b.p)
  for (let i = 1; i < proj.length; i++) if (proj[i].p - proj[i - 1].p < 6) return false
  const seq = proj.map((x) => x.ch).join('')
  return seq === word || seq === [...word].reverse().join('')
}

function makeTiles(word, letters) {
  const chars = [...letters]
  if (chars.join('') === word && chars.length > 1) chars.push(chars.shift())
  let tiles = scatterTiles(chars)
  for (let i = 0; i < 8 && isLineSolved(tiles, word); i++) tiles = scatterTiles(chars)
  return tiles
}

function LetterArranger({ word, letters, solved, locked, onSolved }) {
  const isLocked = locked ?? solved
  const boardRef = useRef(null)
  const [tiles, setTiles] = useState(() => makeTiles(word, letters))
  const [dragId, setDragId] = useState(null)
  const [hintCount, setHintCount] = useState(0)
  const dragRef = useRef(null)
  const tilesRef = useRef(tiles)
  const announced = useRef(false)
  tilesRef.current = tiles

  const trySolveRef = useRef(null)
  trySolveRef.current = (list) => {
    if (solved || isLocked || announced.current) return
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    if (isLineSolved(list, word, rect.width / BOARD_W, rect.height / BOARD_H)) {
      announced.current = true
      onSolved()
    }
  }

  useEffect(() => {
    if (dragId === null) return
    const positionFor = (e, d) => {
      const board = boardRef.current
      const rect = board.getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * BOARD_W + d.dx
      const py = ((e.clientY - rect.top) / rect.height) * BOARD_H + d.dy
      const hx = (TILE_W / 2 / rect.width) * BOARD_W
      const hy = (TILE_H / 2 / rect.height) * BOARD_H
      return {
        x: Math.min(BOARD_W - hx, Math.max(hx, px)),
        y: Math.min(BOARD_H - hy, Math.max(hy, py)),
      }
    }
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      const pos = positionFor(e, d)
      setTiles((prev) => prev.map((t) => (t.id === d.id ? { ...t, ...pos } : t)))
    }
    const onUp = (e) => {
      const d = dragRef.current
      if (d) {
        const pos = positionFor(e, d)
        const finalTiles = tilesRef.current.map((t) => (t.id === d.id ? { ...t, ...pos } : t))
        tilesRef.current = finalTiles
        setTiles(finalTiles)
        dragRef.current = null
        setDragId(null)
        trySolveRef.current(finalTiles)
      } else {
        setDragId(null)
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragId])

  const complete = solved

  const startDrag = (e, t) => {
    if (isLocked) return
    e.preventDefault()
    const rect = boardRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * BOARD_W
    const py = ((e.clientY - rect.top) / rect.height) * BOARD_H
    dragRef.current = { id: t.id, dx: t.x - px, dy: t.y - py }
    setDragId(t.id)
  }

  return (
    <div>
      <div
        ref={boardRef}
        data-letter-board=""
        style={{
          position: 'relative',
          height: BOARD_H,
          background: T.surf2,
          borderRadius: 10,
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.id}
            data-letter-tile={t.id}
            onPointerDown={(e) => startDrag(e, t)}
            style={{
              position: 'absolute',
              left: `${(t.x / BOARD_W) * 100}%`,
              top: `${(t.y / BOARD_H) * 100}%`,
              transform: `translate(-50%, -50%)${dragId === t.id ? ' scale(1.08)' : ''}`,
              width: TILE_W,
              height: TILE_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: complete ? `${T.green}22` : T.surf,
              border: `1px solid ${complete ? T.green : T.border}`,
              borderRadius: 8,
              color: complete ? T.green : T.yellow,
              fontSize: 22,
              fontWeight: 'bold',
              cursor: isLocked ? 'default' : dragId === t.id ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
              boxShadow: dragId === t.id ? T.shadow : T.shadowSm,
              transition: 'transform 0.08s, box-shadow 0.08s, background-color 0.15s, border-color 0.15s',
              zIndex: dragId === t.id ? 2 : 1,
            }}
          >
            {t.ch}
          </div>
        ))}
      </div>
      {complete && <div style={{ color: T.green, fontSize: 13, marginTop: 10, textAlign: 'center' }}>✓ Richtig!</div>}
      {!complete && !isLocked && (
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          {hintCount > 0 && (
            <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>
              {Array.from({ length: hintCount }, (_, i) => (
                <span key={i} style={{ margin: '0 6px', whiteSpace: 'nowrap' }}>
                  <span>{i + 1}.</span> <span style={{ color: T.mauve, fontWeight: 'bold' }}>{word[i]}</span>
                </span>
              ))}
            </div>
          )}
          {hintCount < word.length && (
            <button
              onClick={() => setHintCount((c) => c + 1)}
              style={{
                background: 'none',
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.mauve,
                cursor: 'pointer',
                padding: '6px 14px',
                fontSize: 12,
              }}
            >
              Tipp {hintCount > 0 ? `${hintCount}/${word.length}` : ''}
            </button>
          )}
          <div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>
            Ziehe die Buchstaben beliebig – am Ende müssen sie in richtiger Reihenfolge ungefähr auf einer Linie liegen.
          </div>
        </div>
      )}
    </div>
  )
}

export function WortQuiz({ questions, answers, onAnswer, color, displayMode, quizType }) {
  const mode = displayMode || 'gemischt'
  const dragMode = quizType === 'legen'
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
      } else if (dragMode) {
        return
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const cur = fqRef.current,
          curAns = ansRef.current[cur]
        const nx = curAns === null ? 0 : (curAns + 1) % questions[cur].opts.length
        onAnswer(cur, nx)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = fqRef.current,
          curAns = ansRef.current[cur]
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
  }, [onAnswer, questions, dragMode])

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
          const vok = q.display.filter((l) => 'AEIOU'.includes(l))
          const kons = q.display.filter((l) => !'AEIOU'.includes(l))
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
                      {dragMode
                        ? 'Bringe die Buchstaben in die richtige Reihenfolge.'
                        : 'Was ist der Anfangsbuchstabe des Wortes?'}
                    </div>
                    {dragMode && (
                      <LetterArranger
                        word={q.word}
                        letters={q.display}
                        solved={answers[qi] !== null}
                        onSolved={() => onAnswer(qi, q.correctIdx)}
                      />
                    )}
                    {!dragMode && mode === 'gemischt' && (
                      <div
                        style={{
                          letterSpacing: 10,
                          fontSize: 32,
                          fontWeight: 'bold',
                          color: T.yellow,
                          textAlign: 'center',
                          padding: '20px 0',
                          background: T.surf2,
                          borderRadius: 10,
                        }}
                      >
                        {q.display.join('  ')}
                      </div>
                    )}
                    {!dragMode && mode === 'getrennt' && (
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div
                          style={{
                            flex: 1,
                            background: T.surf2,
                            borderRadius: 10,
                            padding: '16px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ color: T.muted, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>VOKALE</div>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: T.teal, letterSpacing: 8 }}>
                            {vok.length ? vok.join('  ') : '–'}
                          </div>
                        </div>
                        <div
                          style={{
                            flex: 1,
                            background: T.surf2,
                            borderRadius: 10,
                            padding: '16px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ color: T.muted, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
                            KONSONANTEN
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: T.orange, letterSpacing: 8 }}>
                            {kons.length ? kons.join('  ') : '–'}
                          </div>
                        </div>
                      </div>
                    )}
                    {!dragMode && mode === 'wolke' && <Buchstabenwolke letters={q.display} />}
                  </div>
                </div>
                {!dragMode &&
                  q.opts.map((o, i) => (
                    <OptionBtn
                      key={i}
                      label={OPTS[i]}
                      state={answers[qi] === i ? 'selected' : 'idle'}
                      onClick={() => onAnswer(qi, i)}
                      text={o === 'keine' ? 'Keine Option ist richtig.' : o}
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

function Buchstabenwolke({ letters }) {
  const n = letters.length
  return (
    <div
      style={{
        position: 'relative',
        height: 190,
        background: T.surf2,
        borderRadius: 12,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {letters.map((l, i) => {
        const phi = i * 2.399963
        const r = 14 + ((i + 0.5) / n) * 38
        const x = Math.max(6, Math.min(94, 50 + r * Math.cos(phi)))
        const y = Math.max(8, Math.min(92, 50 + r * 0.55 * Math.sin(phi)))
        const fs = [28, 22, 26, 20, 24][i % 5]
        const col = [T.yellow, T.text, T.mauve, T.yellow, T.text][i % 5]
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%,-50%)',
              fontSize: fs,
              fontWeight: 'bold',
              color: col,
              lineHeight: 1,
            }}
          >
            {l}
          </div>
        )
      })}
    </div>
  )
}

export default function Wortfluessigkeit({ onBack }) {
  const [mode, setMode] = useState('settings')
  const [count, setCount] = useState(15)
  const [quizType, setQuizType] = useState('anfangsbuchstabe')
  const [displayMode, setDisplayMode] = useState('gemischt')
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
      resetGame(count * 80)
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
    saveStat('wortfluessigkeit', sc, tot)
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
      if (quizType === 'legen') return
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && i < 5) endlessAnswer(i)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode, done, showFb, endless, curQ, quizType])

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

  function dragSolved() {
    if (selected !== null) return
    setSelected(curQ.correctIdx)
    setEndlessSc((s) => s + 1)
    setEndlessTot((t) => t + 1)
    setTimeout(() => {
      setShowFb(true)
      setTimeout(() => setFbReady(true), 200)
    }, 250)
  }

  function revealWord() {
    if (selected !== null) return
    setSelected(-1)
    setEndlessTot((t) => t + 1)
    setShowFb(true)
    setTimeout(() => setFbReady(true), 200)
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

  const skRows = [
    [{ action: () => setCount(15) }, { action: () => setCount(0) }],
    [{ action: () => setQuizType('anfangsbuchstabe') }, { action: () => setQuizType('legen') }],
  ]
  if (quizType === 'anfangsbuchstabe')
    skRows.push([
      { action: () => setDisplayMode('gemischt') },
      { action: () => setDisplayMode('getrennt') },
      { action: () => setDisplayMode('wolke') },
    ])
  const { isFocused: skF, isStartFocused: skS } = useSettingsKeyboard(skRows, startGame, onBack, mode === 'settings')
  if (mode === 'settings')
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
        <BackBtn onBack={onBack} />
        <div style={{ color: T.mauve, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Wortflüssigkeit</div>
        <Card>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Anzahl Aufgaben:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 15, l: '15  (20 Min)' },
                { v: 0, l: '∞  Endlosmodus' },
              ].map((o, i) => (
                <button
                  key={o.v}
                  onClick={() => setCount(o.v)}
                  style={{
                    background: count === o.v ? `${T.mauve}25` : T.surf2,
                    border: `1px solid ${count === o.v ? T.mauve : T.border}`,
                    borderRadius: 8,
                    color: count === o.v ? T.mauve : T.text,
                    cursor: 'pointer',
                    padding: '8px 18px',
                    fontSize: 14,
                    boxShadow: skF(0, i) ? `0 0 0 2px ${T.mauve}` : 'none',
                  }}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Übungsmodus:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { v: 'anfangsbuchstabe', l: 'Anfangsbuchstabe' },
                { v: 'legen', l: 'Buchstaben legen' },
              ].map((o, i) => (
                <button
                  key={o.v}
                  onClick={() => setQuizType(o.v)}
                  style={{
                    background: quizType === o.v ? `${T.mauve}25` : T.surf2,
                    border: `1px solid ${quizType === o.v ? T.mauve : T.border}`,
                    borderRadius: 8,
                    color: quizType === o.v ? T.mauve : T.text,
                    cursor: 'pointer',
                    padding: '8px 18px',
                    fontSize: 14,
                    boxShadow: skF(1, i) ? `0 0 0 2px ${T.mauve}` : 'none',
                  }}
                >
                  {o.l}
                </button>
              ))}
            </div>
            {quizType === 'legen' && (
              <div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>
                Buchstaben frei verschieben und am Ende in richtiger Reihenfolge auf einer Linie anordnen.
              </div>
            )}
          </div>
          {quizType === 'anfangsbuchstabe' && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Darstellungsmodus:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { v: 'gemischt', l: 'Gemischt' },
                  { v: 'getrennt', l: 'Vokale / Konsonanten' },
                  { v: 'wolke', l: 'Buchstabenwolke' },
                ].map((o, i) => (
                  <button
                    key={o.v}
                    onClick={() => setDisplayMode(o.v)}
                    style={{
                      background: displayMode === o.v ? `${T.mauve}25` : T.surf2,
                      border: `1px solid ${displayMode === o.v ? T.mauve : T.border}`,
                      borderRadius: 8,
                      color: displayMode === o.v ? T.mauve : T.text,
                      cursor: 'pointer',
                      padding: '8px 18px',
                      fontSize: 14,
                      boxShadow: skF(2, i) ? `0 0 0 2px ${T.mauve}` : 'none',
                    }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={startGame}
            style={{
              background: T.mauve,
              border: 'none',
              borderRadius: 10,
              color: T.onAccent,
              cursor: 'pointer',
              padding: '14px 32px',
              fontSize: 16,
              fontWeight: 'bold',
              boxShadow: skS() ? `0 0 0 3px ${T.mauve}88` : 'none',
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
    const dm = displayMode || 'gemischt'
    const vok = q.display.filter((l) => 'AEIOU'.includes(l))
    const kons = q.display.filter((l) => !'AEIOU'.includes(l))
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
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
            <div style={{ color: T.mauve, fontSize: 18, fontWeight: 'bold' }}>Wortflüssigkeit</div>
          </div>
          <ScoreBar score={endlessSc} total={endlessTot} color={T.mauve} />
        </div>
        <Card>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
            {quizType === 'legen'
              ? 'Bringe die Buchstaben in die richtige Reihenfolge.'
              : 'Was ist der Anfangsbuchstabe des Wortes?'}
          </div>
          {quizType === 'legen' ? (
            <div style={{ marginBottom: 16 }}>
              <LetterArranger
                key={q.id}
                word={q.word}
                letters={q.display}
                solved={selected === q.correctIdx}
                locked={selected !== null}
                onSolved={dragSolved}
              />
              {selected === null && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button
                    onClick={revealWord}
                    style={{
                      background: 'none',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      color: T.muted,
                      cursor: 'pointer',
                      padding: '6px 14px',
                      fontSize: 12,
                    }}
                  >
                    Auflösen
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {dm === 'gemischt' && (
                <div
                  style={{
                    letterSpacing: 10,
                    fontSize: 32,
                    fontWeight: 'bold',
                    color: T.yellow,
                    textAlign: 'center',
                    padding: '20px 0',
                    background: T.surf2,
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  {q.display.join('  ')}
                </div>
              )}
              {dm === 'getrennt' && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: T.surf2, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                    <div style={{ color: T.muted, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>VOKALE</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: T.teal, letterSpacing: 8 }}>
                      {vok.length ? vok.join('  ') : '–'}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: T.surf2, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                    <div style={{ color: T.muted, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>KONSONANTEN</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: T.orange, letterSpacing: 8 }}>
                      {kons.length ? kons.join('  ') : '–'}
                    </div>
                  </div>
                </div>
              )}
              {dm === 'wolke' && (
                <div style={{ marginBottom: 16 }}>
                  <Buchstabenwolke letters={q.display} />
                </div>
              )}
              {q.opts.map((o, i) => (
                <OptionBtn
                  key={i}
                  label={OPTS[i]}
                  state={getState(i)}
                  onClick={() => endlessAnswer(i)}
                  text={o === 'keine' ? 'Keine Option ist richtig.' : o}
                />
              ))}
              {!showFb && <KeyHint />}
            </>
          )}
          {showFb && (
            <div style={{ marginTop: 16, background: T.surf2, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 6 }}>
                Das Wort war:{' '}
                <span style={{ color: T.mauve, fontWeight: 'bold', fontSize: 18, letterSpacing: 3 }}>
                  {q.word.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 14, marginBottom: 14 }}>
                {selected === q.correctIdx ? (
                  <span style={{ color: T.green }}>✓ Richtig!</span>
                ) : quizType === 'legen' ? (
                  <span>
                    Nicht gelöst – richtig wäre <span style={{ color: T.green, fontWeight: 'bold' }}>{q.word}</span>.
                  </span>
                ) : (
                  <span>
                    Richtige Antwort:{' '}
                    <span style={{ color: T.green, fontWeight: 'bold' }}>
                      {q.opts[q.correctIdx] === 'keine' ? 'Keine Option ist richtig.' : q.opts[q.correctIdx]}
                    </span>
                  </span>
                )}
              </div>
              <button
                onClick={nextQ}
                style={{
                  background: T.mauve,
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
          )}
        </Card>
      </div>
    )
  }

  // ── Non-endless game mode (all-at-once) ──
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
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
          <div style={{ color: T.mauve, fontSize: 18, fontWeight: 'bold' }}>Wortflüssigkeit</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <ScoreBar score={sc} total={tot} color={T.mauve} />
          <TimerBadge seconds={gameTimer} />
        </div>
      </div>
      <ProgressBar current={tot + 1} total={count} color={T.mauve} />
      <WortQuiz
        questions={questions}
        answers={answers}
        onAnswer={answer}
        color={T.mauve}
        displayMode={displayMode}
        quizType={quizType}
      />
      {quizType !== 'legen' && (
        <div style={{ marginTop: 12 }}>
          <KeyHint />
        </div>
      )}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={finishGame}
          style={{
            background: T.mauve,
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
