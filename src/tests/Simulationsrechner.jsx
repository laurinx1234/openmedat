import { useState, useEffect, useRef } from 'react'
import { T } from '../theme.js'
import { Card, BackBtn, ProgressBar, useTimer, OPTS } from '../components/Shared.jsx'

// ─── Subtest definitions ────────────────────────────────────────────────────────
// type: 'standard' = A-E choice | 'merken' = timer only | 'emotionen' = 5× binary | 'soziales' = 5× ranking

const SUBTESTS_H = [
  { name:'Biologie',                  qCount:40, timeMin:30, section:'BMS', type:'standard'  },
  { name:'Chemie',                    qCount:24, timeMin:18, section:'BMS', type:'standard'  },
  { name:'Physik',                    qCount:18, timeMin:16, section:'BMS', type:'standard'  },
  { name:'Mathematik',                qCount:12, timeMin:11, section:'BMS', type:'standard'  },
  { name:'Textverständnis',           qCount:12, timeMin:35, section:'BMS', type:'standard'  },
  { name:'Figuren zusammensetzen',    qCount:15, timeMin:20, section:'KFF', type:'standard'  },
  { name:'Allergieausweise (Merken)', qCount:8,  timeMin:8,  section:'KFF', type:'merken'    },
  { name:'Zahlenfolgen',              qCount:10, timeMin:15, section:'KFF', type:'standard'  },
  { name:'Wortflüssigkeit',           qCount:15, timeMin:20, section:'KFF', type:'standard'  },
  { name:'Allergieausweise (Abfrage)',qCount:25, timeMin:15, section:'KFF', type:'standard'  },
  { name:'Implikationen erkennen',    qCount:10, timeMin:10, section:'KFF', type:'standard'  },
  { name:'Emotionen regulieren',      qCount:12, timeMin:18, section:'SEK', type:'standard'  },
  { name:'Emotionen erkennen',        qCount:14, timeMin:21, section:'SEK', type:'emotionen' },
  { name:'Soziales Entscheiden',      qCount:14, timeMin:21, section:'SEK', type:'soziales'  },
]

const SECTION_WEIGHTS = { BMS:0.4, KFF:0.4, SEK:0.1, TV:0.1 }

function getScoredItems(st) {
  if (st.type === 'merken' || st.type === 'pause') return 0
  return st.qCount
}

function computeWeights(subtests) {
  const sectionW = SECTION_WEIGHTS
  // Group subtests by section (TV is split from BMS through its name)
  const bySection = {}
  for (const st of subtests) {
    const sec = st.section === 'BMS' && st.name === 'Textverständnis' ? 'TV' : st.section
    if (!bySection[sec]) bySection[sec] = []
    bySection[sec].push(st)
  }
  // Compute weight per subtest
  const weights = subtests.map(st => {
    const sec = st.section === 'BMS' && st.name === 'Textverständnis' ? 'TV' : st.section
    const secWeight = sectionW[sec] || 0
    const secItems = bySection[sec].reduce((s, x) => s + getScoredItems(x), 0)
    const stItems = getScoredItems(st)
    return secItems > 0 ? (stItems / secItems) * secWeight : 0
  })
  return weights
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

function TimerDisplay({ seconds }) {
  const col = seconds < 30 ? T.red : seconds < 120 ? T.yellow : T.teal
  return (
    <div style={{ textAlign:'center', marginBottom:20 }}>
      <span style={{ color:col, fontSize:48, fontWeight:'bold', fontVariantNumeric:'tabular-nums' }}>
        {formatTime(seconds)}
      </span>
    </div>
  )
}

function btnStyle({ bg, border, fg, small }) {
  return {
    background:bg, border:`1px solid ${border}`, borderRadius:small?4:6,
    color:fg, cursor:'pointer', fontSize:small?11:13, fontWeight:500,
    padding:small?'4px 8px':'6px 12px', display:'inline-flex', alignItems:'center',
    justifyContent:'center', flexShrink:0,
  }
}

// ─── Answer grids per type ──────────────────────────────────────────────────────

function StandardGrid({ qCount, answers, onChange, correctAnswers, mode }) {
  const cols = qCount <= 5 ? 1 : qCount <= 12 ? 2 : qCount <= 20 ? 3 : 4
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:4 }}>
      {Array.from({ length:qCount }, (_, i) => {
        const userAns = answers?.[i] ?? null
        const correctAns = correctAnswers?.[i] ?? null
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 4px', borderRadius:6,
            background:mode==='results'&&userAns===correctAns?`${T.green}18`:'transparent' }}>
            <span style={{ color:T.muted, fontSize:11, minWidth:22, textAlign:'right', flexShrink:0 }}>{i + 1}</span>
            {OPTS.map(opt => {
              let bg = T.surf2, border = T.border, fg = T.muted
              if (mode === 'results' && correctAns === opt) { bg = `${T.green}22`; border = T.green; fg = T.green }
              if (userAns === opt) {
                if (mode === 'results') {
                  bg = userAns === correctAns ? `${T.green}33` : `${T.red}33`
                  border = userAns === correctAns ? T.green : T.red
                  fg = userAns === correctAns ? T.green : T.red
                } else { bg = `${T.orange}33`; border = T.orange; fg = T.orange }
              }
              return (
                <button key={opt} onClick={() => onChange?.(i, opt)}
                  disabled={mode==='results'||!onChange}
                  data-qidx={i}
                  style={{ width:24, height:24, borderRadius:4, border:`1px solid ${border}`,
                    background:bg, color:fg, cursor:mode==='results'||!onChange?'default':'pointer',
                    fontSize:11, fontWeight:userAns===opt?700:400, padding:0,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                >{opt}</button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function EmotionenGrid({ qCount, answers, onChange, correctAnswers, mode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {Array.from({ length:qCount }, (_, exIdx) => {
        const row = answers?.[exIdx] ?? [null,null,null,null,null]
        const correctRow = correctAnswers?.[exIdx] ?? [null,null,null,null,null]
        return (
          <div key={exIdx} style={{ background:T.surf2, borderRadius:8, padding:8 }}>
            <div style={{ color:T.muted, fontSize:11, marginBottom:6 }}>Beispiel {exIdx + 1}</div>
            {OPTS.map((opt, oi) => {
              const val = row[oi]
              const correctVal = correctRow[oi]
              return (
                <div key={opt} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ color:T.muted, fontSize:11, minWidth:14 }}>{opt}</span>
                  <button onClick={() => onChange?.(exIdx, oi, true)}
                    disabled={mode==='results'||!onChange}
                    data-qidx={exIdx} data-subidx={oi}
                    style={{ ...btnStyle({
                      bg:mode==='results'&&correctVal===true?`${T.green}22`:val===true?`${T.orange}33`:T.surf2,
                      border:mode==='results'&&correctVal===true?T.green:val===true?T.orange:T.border,
                      fg:mode==='results'&&correctVal===true?T.green:val===true?T.orange:T.muted,
                      small:true
                    }), minWidth:130 }}
                  >eher wahrscheinlich</button>
                  <button onClick={() => onChange?.(exIdx, oi, false)}
                    disabled={mode==='results'||!onChange}
                    data-qidx={exIdx} data-subidx={oi}
                    style={{ ...btnStyle({
                      bg:mode==='results'&&correctVal===false?`${T.green}22`:val===false?`${T.orange}33`:T.surf2,
                      border:mode==='results'&&correctVal===false?T.green:val===false?T.orange:T.border,
                      fg:mode==='results'&&correctVal===false?T.green:val===false?T.orange:T.muted,
                      small:true
                    }), minWidth:130 }}
                  >eher unwahrscheinlich</button>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function SozialesGrid({ qCount, answers, onChange, correctAnswers, mode }) {
  const ranks = [1,2,3,4,5]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', gap:8 }}>
      {Array.from({ length:qCount }, (_, exIdx) => {
        const row = answers?.[exIdx] ?? [null,null,null,null,null]
        const correctRow = correctAnswers?.[exIdx] ?? [null,null,null,null,null]
        return (
          <div key={exIdx} style={{ background:T.surf2, borderRadius:8, padding:8 }}>
            <div style={{ color:T.muted, fontSize:11, marginBottom:6 }}>Beispiel {exIdx + 1}</div>
            {OPTS.map((opt, oi) => {
              const val = row[oi]
              const correctVal = correctRow[oi]
              return (
                <div key={opt} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                  <span style={{ color:T.muted, fontSize:11, minWidth:14, flexShrink:0 }}>{opt}</span>
                  <div style={{ display:'flex', flex:1, justifyContent:'space-around' }}>
                    {ranks.map(r => {
                      const isCorrect = mode==='results' && correctVal === r
                      const isSel = val === r
                      let bg = T.surf2, border = T.border, fg = T.muted
                      if (isCorrect && mode==='results') { bg = `${T.green}22`; border = T.green; fg = T.green }
                      if (isSel) {
                        if (mode==='results') {
                          bg = isCorrect ? `${T.green}33` : `${T.red}33`
                          border = isCorrect ? T.green : T.red
                          fg = isCorrect ? T.green : T.red
                        } else { bg = `${T.orange}33`; border = T.orange; fg = T.orange }
                      }
                      return (
                        <button key={r} onClick={() => onChange?.(exIdx, oi, r)}
                          disabled={mode==='results'||!onChange}
                          data-qidx={exIdx} data-subidx={oi}
                          style={{ width:26, height:26, borderRadius:4, border:`1px solid ${border}`,
                            background:bg, color:fg, cursor:mode==='results'||!onChange?'default':'pointer',
                            fontSize:12, fontWeight:isSel?700:400, padding:0 }}
                        >{r}</button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── Subtest Navigation Dots ────────────────────────────────────────────────────

function SubtestNav({ subtests, currentIdx, answers, correctAnswers }) {
  return (
    <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginBottom:16 }}>
      {subtests.map((st, i) => {
        const isCurrent = i === currentIdx
        const inPast = i < currentIdx
        const isPause = st.type === 'pause'
        let bg = T.surf2, border = T.border, fg = T.muted
        if (isPause) { bg = `${T.yellow}10`; border = `${T.yellow}33`; fg = T.yellow }
        if (isCurrent) { bg = `${T.orange}33`; border = T.orange; fg = T.orange }
        else if (inPast) { bg = `${T.orange}18`; border = `${T.orange}44`; fg = T.muted }
        // Scoring in review/results (pct based on total items: unanswered = wrong)
        let pct = null
        if (correctAnswers[i] && st.type !== 'merken' && st.type !== 'pause') {
          let scored = 0, correct = 0
          if (st.type === 'standard') {
            for (let qi=0; qi<st.qCount; qi++) {
              if (correctAnswers[i][qi]!=null && answers[i]?.[qi]!=null) { scored++; if (answers[i][qi]===correctAnswers[i][qi]) correct++ }
            }
          } else if (st.type === 'emotionen') {
            for (let ei=0; ei<st.qCount; ei++) {
              const uRow = answers[i]?.[ei]; const cRow = correctAnswers[i]?.[ei]
              if (!uRow || !cRow) continue
              if (!uRow.every(v=>v!=null) || !cRow.every(v=>v!=null)) continue
              scored++; if (uRow.every((v,oi)=>v===cRow[oi])) correct++
            }
          } else if (st.type === 'soziales') {
            for (let ei=0; ei<st.qCount; ei++) {
              const uRow = answers[i]?.[ei]; const cRow = correctAnswers[i]?.[ei]
              if (!uRow || !cRow) continue
              if (!uRow.every(v=>v!=null) || !cRow.every(v=>v!=null)) continue
              scored++
              let diffSum = 0
              for (let oi=0; oi<5; oi++) diffSum += Math.abs(uRow[oi] - cRow[oi])
              correct += 1 - diffSum / 12
            }
          }
          const total = getScoredItems(st)
          if (total > 0 && scored > 0) pct = Math.round(correct/total*100)
        }
        return (
          <div key={i} style={{ background:bg, border:`1px solid ${border}`, borderRadius:6,
            padding:'4px 6px', fontSize:10, color:fg, textAlign:'center', minWidth:isPause?20:26 }}>
            <div style={{ fontWeight:isCurrent?700:400, fontSize:isPause?14:10 }}>{isPause?'🍽':i+1}</div>
            {pct != null && <div style={{ color:pct>=70?T.green:pct>=40?T.yellow:T.red, fontSize:9 }}>{pct}%</div>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function Simulationsrechner({ onBack }) {
  const [phase, setPhase] = useState('settings')
  const [includePause, setIncludePause] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timer, resetTimer] = useTimer(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [correctAnswers, setCorrectAnswers] = useState([])

  // Build runtime subtest list (with optional pause injected)
  function buildSubtests() {
    const sts = [...SUBTESTS_H]
    if (includePause) {
      const idx = sts.findIndex(s => s.name === 'Textverständnis')
      if (idx >= 0) {
        sts.splice(idx + 1, 0, { name:'Mittagspause', qCount:0, timeMin:60, section:null, type:'pause' })
      }
    }
    return sts
  }

  const subtests = buildSubtests()
  const subtestsRef = useRef(subtests)
  subtestsRef.current = subtests

  function initAnswers(sts) {
    return sts.map(st => {
      if (st.type === 'merken' || st.type === 'pause') return null
      if (st.type === 'emotionen' || st.type === 'soziales') return Array.from({length:st.qCount}, () => Array(5).fill(null))
      return Array(st.qCount).fill(null)
    })
  }

  function startSimulation() {
    const sts = buildSubtests()
    setUserAnswers(initAnswers(sts))
    setCorrectAnswers(initAnswers(sts))
    setCurrentIdx(0)
    resetTimer(sts[0].timeMin * 60)
    setPhase('test')
  }

  // Find reviewable (scorable) subtests: skip merken and pause
  function reviewIndices(sts) {
    return sts.reduce((arr, st, i) => {
      if (st.type !== 'merken' && st.type !== 'pause') arr.push(i)
      return arr
    }, [])
  }

  // Auto-advance when timer hits 0 during test
  useEffect(() => {
    if (phase !== 'test' || timer > 0) return
    if (currentIdx + 1 >= subtests.length) {
      const ri = reviewIndices(subtests)
      setPhase('review')
      setCurrentIdx(ri[0] ?? 0)
    } else {
      const next = currentIdx + 1
      setCurrentIdx(next)
      resetTimer(subtests[next].timeMin * 60)
    }
  }, [timer, phase])

  function finishSubtest() {
    if (currentIdx + 1 >= subtests.length) {
      const ri = reviewIndices(subtests)
      setPhase('review')
      setCurrentIdx(ri[0] ?? 0)
    } else {
      const next = currentIdx + 1
      setCurrentIdx(next)
      resetTimer(subtests[next].timeMin * 60)
    }
  }

  // Answer setters
  function setUserAnswer(qIdx, opt) {
    setUserAnswers(prev => {
      const next = prev.map(a => a ? [...a] : null)
      next[currentIdx][qIdx] = opt
      return next
    })
  }

  function setUserAnswerEmotionen(exIdx, oi, val) {
    setUserAnswers(prev => {
      const next = prev.map(a => a ? a.map(r => [...r]) : null)
      next[currentIdx][exIdx][oi] = val
      return next
    })
  }

  function setUserAnswerSoziales(exIdx, oi, rank) {
    setUserAnswers(prev => {
      const next = prev.map(a => a ? a.map(r => [...r]) : null)
      // If another option already has this rank, clear it
      for (let j = 0; j < 5; j++) {
        if (j !== oi && next[currentIdx][exIdx][j] === rank) {
          next[currentIdx][exIdx][j] = null
        }
      }
      next[currentIdx][exIdx][oi] = rank
      return next
    })
  }

  function setCorrectAnswer(qIdx, opt) {
    setCorrectAnswers(prev => {
      const next = prev.map(a => a ? [...a] : null)
      next[currentIdx][qIdx] = opt
      return next
    })
  }

  function setCorrectAnswerEmotionen(exIdx, oi, val) {
    setCorrectAnswers(prev => {
      const next = prev.map(a => a ? a.map(r => [...r]) : null)
      next[currentIdx][exIdx][oi] = val
      return next
    })
  }

  function setCorrectAnswerSoziales(exIdx, oi, rank) {
    setCorrectAnswers(prev => {
      const next = prev.map(a => a ? a.map(r => [...r]) : null)
      for (let j = 0; j < 5; j++) {
        if (j !== oi && next[currentIdx][exIdx][j] === rank) {
          next[currentIdx][exIdx][j] = null
        }
      }
      next[currentIdx][exIdx][oi] = rank
      return next
    })
  }

  // Scoring
  function computeResults() {
    const weights = computeWeights(subtests)
    const sectionW = SECTION_WEIGHTS

    const breakdown = subtests.map((st, i) => {
      let scored = 0, correct = 0
      if (st.type === 'standard') {
        for (let qi = 0; qi < st.qCount; qi++) {
          if (correctAnswers[i]?.[qi] != null && userAnswers[i]?.[qi] != null) {
            scored++
            if (userAnswers[i][qi] === correctAnswers[i][qi]) correct++
          }
        }
      } else if (st.type === 'emotionen') {
        // Per example: all 5 emotions must be correct → 1 point
        for (let ei = 0; ei < st.qCount; ei++) {
          const userRow = userAnswers[i]?.[ei]
          const correctRow = correctAnswers[i]?.[ei]
          if (!userRow || !correctRow) continue
          const allAnswered = userRow.every(v => v != null) && correctRow.every(v => v != null)
          if (!allAnswered) continue
          scored++
          if (userRow.every((v, oi) => v === correctRow[oi])) correct++
        }
      } else if (st.type === 'soziales') {
        // Per example: Punkte = 1 − sum(|mein−richtig|) / 12  (max diff = 12)
        for (let ei = 0; ei < st.qCount; ei++) {
          const userRow = userAnswers[i]?.[ei]
          const correctRow = correctAnswers[i]?.[ei]
          if (!userRow || !correctRow) continue
          const allAnswered = userRow.every(v => v != null) && correctRow.every(v => v != null)
          if (!allAnswered) continue
          scored++
          let diffSum = 0
          for (let oi = 0; oi < 5; oi++) diffSum += Math.abs(userRow[oi] - correctRow[oi])
          correct += 1 - diffSum / 12
        }
      }
      const pct = scored > 0 ? correct / scored : null
      return { ...st, scored, correct, pct, weight: weights[i] }
    })

    // Per-subtest pct uses TOTAL items (not just scored), matching Excel: unanswered = wrong
    const breakdownWithPct = breakdown.map(b => {
      const total = getScoredItems(b)
      return { ...b, pct: total > 0 ? b.correct / total : null }
    })
    const totalItems = breakdown.reduce((s,b) => s + getScoredItems(b), 0)
    const totalScored = breakdown.reduce((s,b) => s + b.scored, 0)
    const totalCorrect = breakdown.reduce((s,b) => s + b.correct, 0)

    // Gesamtscore per Excel: section correct / section TOTAL items, then × section weight
    const secData = {}
    for (const b of breakdown) {
      const sec = b.section === 'BMS' && b.name === 'Textverständnis' ? 'TV' : b.section
      if (!secData[sec]) secData[sec] = { correct:0, total:0 }
      secData[sec].correct += b.correct
      secData[sec].total += getScoredItems(b)
    }
    let gesamtScore = 0
    for (const [sec, d] of Object.entries(secData)) {
      const sw = sectionW[sec] || 0
      if (d.total > 0 && sw > 0) {
        gesamtScore += (d.correct / d.total) * sw
      }
    }

    return { breakdown: breakdownWithPct, totalScored, totalCorrect, totalItems, totalPct: totalItems > 0 ? totalCorrect/totalItems : null, gesamtScore }
  }

  // Count filled answers for review summary
  function countFilled(answersArr, sts) {
    let filled = 0, total = 0
    for (let i = 0; i < sts.length; i++) {
      const st = sts[i]
      if (st.type === 'merken' || st.type === 'pause') continue
      total += st.qCount
      if (st.type === 'standard') {
        filled += answersArr[i]?.filter(a => a != null).length ?? 0
      } else if (st.type === 'emotionen' || st.type === 'soziales') {
        for (let ei = 0; ei < st.qCount; ei++) {
          const row = answersArr[i]?.[ei]
          if (row && row.every(v => v != null)) filled++
        }
      }
    }
    return { filled, total }
  }

  // ── Refs for keyboard ─────────────────────────────────────────────────────────

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const currentIdxRef = useRef(currentIdx)
  currentIdxRef.current = currentIdx
  const setUserAnswerRef = useRef(setUserAnswer)
  setUserAnswerRef.current = setUserAnswer
  const setCorrectAnswerRef = useRef(setCorrectAnswer)
  setCorrectAnswerRef.current = setCorrectAnswer
  const setUserAnswerEmoRef = useRef(setUserAnswerEmotionen)
  setUserAnswerEmoRef.current = setUserAnswerEmotionen
  const setUserAnswerSozRef = useRef(setUserAnswerSoziales)
  setUserAnswerSozRef.current = setUserAnswerSoziales
  const setCorrectAnswerEmoRef = useRef(setCorrectAnswerEmotionen)
  setCorrectAnswerEmoRef.current = setCorrectAnswerEmotionen
  const setCorrectAnswerSozRef = useRef(setCorrectAnswerSoziales)
  setCorrectAnswerSozRef.current = setCorrectAnswerSoziales

  useEffect(() => {
    const h = e => {
      const ph = phaseRef.current
      if (ph === 'test') {
        if (e.key === 'Escape') {
          if (confirm('Simulation abbrechen? Alle Eingaben gehen verloren.')) onBack()
          return
        }
      } else if (ph === 'review') {
        if (e.key === 'Escape') { onBack(); return }
        if (e.key === 'ArrowRight') {
          const ri = reviewIndices(subtestsRef.current)
          const pos = ri.indexOf(currentIdxRef.current)
          if (pos >= 0 && pos < ri.length - 1) setCurrentIdx(ri[pos + 1])
          return
        }
        if (e.key === 'ArrowLeft') {
          const ri = reviewIndices(subtestsRef.current)
          const pos = ri.lastIndexOf(currentIdxRef.current)
          if (pos > 0) setCurrentIdx(ri[pos - 1])
          return
        }
      } else return

      const oi = ['a','s','d','f','g'].indexOf(e.key.toLowerCase())
      if (oi < 0) return
      const el = document.activeElement
      if (!el || !el.dataset || el.dataset.qidx === undefined) return
      const qIdx = parseInt(el.dataset.qidx)
      const subIdx = el.dataset.subidx !== undefined ? parseInt(el.dataset.subidx) : undefined
      const idx = currentIdxRef.current
      const st = subtestsRef.current[idx]

      if (ph === 'test') {
        if (st.type === 'standard') {
          setUserAnswerRef.current(qIdx, OPTS[oi])
        } else if (st.type === 'emotionen') {
          setUserAnswerEmoRef.current(qIdx, subIdx ?? oi, true)
        } else if (st.type === 'soziales') {
          // oi 0-4 maps to rank 1-5
          setUserAnswerSozRef.current(qIdx, subIdx ?? oi, oi + 1)
        }
      } else if (ph === 'review') {
        if (st.type === 'standard') {
          setCorrectAnswerRef.current(qIdx, OPTS[oi])
        } else if (st.type === 'emotionen') {
          setCorrectAnswerEmoRef.current(qIdx, subIdx ?? oi, true)
        } else if (st.type === 'soziales') {
          setCorrectAnswerSozRef.current(qIdx, subIdx ?? oi, oi + 1)
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ── PDF Export ────────────────────────────────────────────────────────────────

  function exportPDF(breakdown, totalItems, totalCorrect, totalPct, gesamtScore) {
    const weights = computeWeights(subtests)
    const rows = breakdown.filter(b => b.type !== 'merken' && b.type !== 'pause').map((b, i) => {
      const w = b.weight * 100
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #444">${b.name}</td>
        <td style="padding:4px 8px;border:1px solid #444;text-align:center">${getScoredItems(b)}</td>
        <td style="padding:4px 8px;border:1px solid #444;text-align:center">${b.type==='soziales'?b.correct.toFixed(1):b.correct}</td>
        <td style="padding:4px 8px;border:1px solid #444;text-align:center">${b.scored}</td>
        <td style="padding:4px 8px;border:1px solid #444;text-align:center">${b.pct!=null?Math.round(b.pct*100)+'%':'–'}</td>
        <td style="padding:4px 8px;border:1px solid #444;text-align:center">${w.toFixed(1)}%</td>
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>MedAT Auswertung</title>
      <style>body{font-family:system-ui,sans-serif;background:#111;color:#ddd;padding:40px}
        h1{color:#fab387}table{border-collapse:collapse;width:100%}th{text-align:left;padding:6px 8px;border:1px solid #444;background:#222}
        @media print{body{background:#fff;color:#000}h1{color:#000}th{background:#eee;border-color:#ccc}td{border-color:#ccc}}
      </style></head><body>
      <h1>MedAT Simulation — Auswertung</h1>
      <p style="color:#999">MedAT-H${includePause?' mit':' ohne'} Mittagspause · ${new Date().toLocaleDateString('de-AT')}</p>
      ${gesamtScore!=null?`<p style="font-size:18px">Gesamtscore: <strong>${Math.round(gesamtScore*100)}%</strong></p>`:''}
      <p>Gesamt: ${totalCorrect} von ${totalItems} Fragen richtig (${totalPct!=null?Math.round(totalPct*100)+'%':'–'})</p>
      <table><thead><tr>
        <th>Untertest</th><th>Fragen</th><th>Richtig</th><th>Bewertet</th><th>% Richtig</th><th>Gewicht</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`
    const w = window.open('', '_blank', 'width=800,height=600')
    if (w) { w.document.write(html); w.document.close() }
  }

  // ── Settings ──────────────────────────────────────────────────────────────────

  if (phase === 'settings') {
    const sts = buildSubtests()
    const totalMin = sts.reduce((s,st) => s + st.timeMin, 0)
    return (
      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 20px' }}>
        <BackBtn onBack={onBack} />
        <div style={{ color:T.orange, fontSize:24, fontWeight:'bold', marginBottom:8 }}>Simulationsrechner</div>
        <div style={{ color:T.muted, fontSize:14, marginBottom:24 }}>Simulationstimer und -Auswertung für externe Simulationen</div>
        <Card>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={includePause} onChange={e => setIncludePause(e.target.checked)}
                style={{ width:18, height:18, accentColor:T.orange }} />
              <span style={{ color:T.text, fontSize:14 }}>60 Min Mittagspause nach Textverständnis</span>
            </label>
          </div>
          <div style={{ color:T.muted, fontSize:12, marginBottom:16, lineHeight:1.6 }}>
            <div>Ablauf: Für jeden Untertest läuft ein Timer in Original-Länge. Währenddessen kannst du deine Antworten eingeben — oder erst am Ende vom Zettel übertragen. Nach allen Untertests gibst du die Lösungsschablone ein und erhältst die Auswertung.</div>
          </div>
          <div style={{ color:T.muted, fontSize:12, marginBottom:16 }}>
            {sts.length} Phasen · Gesamtzeit: {Math.floor(totalMin/60)}h {totalMin%60}min
          </div>
          <button onClick={startSimulation}
            style={{ background:T.orange, border:'none', borderRadius:10, color:'#000',
              cursor:'pointer', padding:'14px 32px', fontSize:16, fontWeight:'bold', width:'100%' }}
          >Simulation starten</button>
        </Card>
      </div>
    )
  }

  // ── Test ──────────────────────────────────────────────────────────────────────

  if (phase === 'test') {
    const st = subtests[currentIdx]
    const answered = st.type==='standard' ? (userAnswers[currentIdx]?.filter(a => a != null).length ?? 0)
      : st.type==='emotionen'||st.type==='soziales' ? (userAnswers[currentIdx]?.reduce((s,r) => s + r.filter(x => x!=null).length, 0) ?? 0)
      : 0

    return (
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px' }}>
        <SubtestNav subtests={subtests} currentIdx={currentIdx} answers={userAnswers} correctAnswers={correctAnswers} />
        <ProgressBar current={currentIdx + 1} total={subtests.length} color={T.orange} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <div>
            <div style={{ color:st.type==='pause'?T.yellow:T.orange, fontSize:20, fontWeight:'bold' }}>{st.name}</div>
            <div style={{ color:T.muted, fontSize:13 }}>
              {st.type==='pause' ? '60 Min Pause' : st.type==='merken' ? `${st.qCount} Ausweise · ${st.timeMin} Min merken` :
               st.type==='emotionen' ? `${st.qCount} Beispiele · je 5 Emotionen · ${st.timeMin} Min · ${answered} beantwortet` :
               st.type==='soziales' ? `${st.qCount} Beispiele · je 5 Überlegungen · ${st.timeMin} Min · ${answered} beantwortet` :
               `${st.qCount} Fragen · ${st.timeMin} Min · ${answered} beantwortet`}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <button onClick={finishSubtest}
              style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:8,
                color:T.muted, cursor:'pointer', padding:'6px 16px', fontSize:13 }}
            >{st.type==='pause'?'Pause überspringen →':'Fertig →'}</button>
          </div>
        </div>
        <TimerDisplay seconds={timer} />

        {st.type === 'pause' && (
          <Card style={{ textAlign:'center', padding:60 }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🍽️</div>
            <div style={{ color:T.yellow, fontSize:20, fontWeight:'bold', marginBottom:8 }}>Mittagspause</div>
            <div style={{ color:T.muted, fontSize:14 }}>60 Minuten — Timer läuft. Danach geht es automatisch weiter.</div>
          </Card>
        )}

        {st.type === 'merken' && (
          <Card style={{ textAlign:'center', padding:60 }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🧠</div>
            <div style={{ color:T.green, fontSize:20, fontWeight:'bold', marginBottom:8 }}>Merkphase</div>
            <div style={{ color:T.muted, fontSize:14 }}>{st.qCount} Ausweise einprägen — {st.timeMin} Minuten Zeit.<br/>Keine Eingabe nötig. Stift und Notizen sind nicht erlaubt.</div>
          </Card>
        )}

        {st.type === 'standard' && (
          <Card style={{ padding:12 }}>
            <StandardGrid qCount={st.qCount} answers={userAnswers[currentIdx]} onChange={setUserAnswer} mode="test" />
          </Card>
        )}

        {st.type === 'emotionen' && (
          <Card style={{ padding:12 }}>
            <EmotionenGrid qCount={st.qCount} answers={userAnswers[currentIdx]} onChange={setUserAnswerEmotionen} mode="test" />
          </Card>
        )}

        {st.type === 'soziales' && (
          <Card style={{ padding:12 }}>
            <SozialesGrid qCount={st.qCount} answers={userAnswers[currentIdx]} onChange={setUserAnswerSoziales} mode="test" />
          </Card>
        )}

        {(st.type === 'standard' || st.type === 'emotionen' || st.type === 'soziales') && (
          <div style={{ color:T.muted, fontSize:11, marginTop:12, textAlign:'center' }}>
            Antwort anklicken + A/S/D/F/G zum Auswählen · Tab zum Navigieren · Esc abbrechen
          </div>
        )}
      </div>
    )
  }

  // ── Review ────────────────────────────────────────────────────────────────────

  if (phase === 'review') {
    const st = subtests[currentIdx]
    const { filled, total } = countFilled(correctAnswers, subtests)
    const { filled: userFilled, total: userTotal } = countFilled(userAnswers, subtests)

    return (
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px' }}>
        <SubtestNav subtests={subtests} currentIdx={currentIdx} answers={userAnswers} correctAnswers={correctAnswers} />
        <ProgressBar current={currentIdx + 1} total={subtests.length} color={T.orange} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <div>
            <div style={{ color:T.orange, fontSize:20, fontWeight:'bold' }}>
              {st.type==='merken' ? `${st.name} — keine Lösung nötig` :
               st.type==='pause' ? `${st.name} — überspringen` :
               `${st.name} — Lösungsschablone`}
            </div>
            <div style={{ color:T.muted, fontSize:13 }}>
              {st.type==='standard' ? `${st.qCount} Fragen · ${correctAnswers[currentIdx]?.filter(a=>a!=null).length??0} ausgefüllt` :
               st.type==='emotionen' ? `${st.qCount} Beispiele · je 5 Emotionen` :
               st.type==='soziales' ? `${st.qCount} Beispiele · je 5 Überlegungen` :
               st.type==='merken' ? 'Keine Eingabe nötig' : ''}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button disabled={currentIdx===0} onClick={()=>{
                const ri = reviewIndices(subtests)
                const pos = ri.lastIndexOf(currentIdx)
                if (pos > 0) setCurrentIdx(ri[pos-1])
              }}
              style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:8,
                color:currentIdx===0?T.border:T.muted, cursor:currentIdx===0?'default':'pointer',
                padding:'6px 12px', fontSize:13 }}
            >←</button>
            <button disabled={currentIdx>=subtests.length-1} onClick={()=>{
                const ri = reviewIndices(subtests)
                const pos = ri.indexOf(currentIdx)
                if (pos >= 0 && pos < ri.length-1) setCurrentIdx(ri[pos+1])
              }}
              style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:8,
                color:currentIdx>=subtests.length-1?T.border:T.muted,
                cursor:currentIdx>=subtests.length-1?'default':'pointer',
                padding:'6px 12px', fontSize:13 }}
            >→</button>
          </div>
        </div>

        {st.type === 'merken' && (
          <Card style={{ textAlign:'center', padding:40 }}>
            <div style={{ color:T.green, fontSize:16, fontWeight:'bold', marginBottom:8 }}>Merkphase</div>
            <div style={{ color:T.muted, fontSize:13 }}>Für die Merkphase gibt es keine Antworten — die Bewertung erfolgt nur bei der Abfrage.</div>
          </Card>
        )}

        {st.type === 'pause' && (
          <Card style={{ textAlign:'center', padding:40 }}>
            <div style={{ color:T.yellow, fontSize:16, fontWeight:'bold' }}>Mittagspause — keine Antworten</div>
          </Card>
        )}

        {st.type === 'standard' && (
          <Card style={{ padding:12 }}>
            <StandardGrid qCount={st.qCount} answers={correctAnswers[currentIdx]} onChange={setCorrectAnswer} mode="review" />
          </Card>
        )}

        {st.type === 'emotionen' && (
          <Card style={{ padding:12 }}>
            <EmotionenGrid qCount={st.qCount} answers={correctAnswers[currentIdx]} onChange={setCorrectAnswerEmotionen} mode="review" />
          </Card>
        )}

        {st.type === 'soziales' && (
          <Card style={{ padding:12 }}>
            <SozialesGrid qCount={st.qCount} answers={correctAnswers[currentIdx]} onChange={setCorrectAnswerSoziales} mode="review" />
          </Card>
        )}

        {(st.type !== 'merken' && st.type !== 'pause') && (
          <div style={{ color:T.muted, fontSize:11, marginTop:12, textAlign:'center' }}>
            Lösungsschablone eingeben · ← → zwischen Untertests · A/S/D/F/G zum Auswählen
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:20 }}>
          <button onClick={() => setPhase('results')}
            style={{ background:T.orange, border:'none', borderRadius:10,
              color:filled===total?'#000':T.muted, cursor:'pointer',
              padding:'14px 40px', fontSize:16, fontWeight:'bold',
              opacity: filled===total?1:0.7 }}
          >Auswerten</button>
          <div style={{ color:T.yellow, fontSize:12, marginTop:8 }}>
            Lösungen: {filled}/{total} ausgefüllt{userFilled<userTotal?` · Antworten: ${userFilled}/${userTotal}`:''}
          </div>
        </div>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────────

  if (phase === 'results') {
    const { breakdown, totalScored, totalCorrect, totalItems, totalPct, gesamtScore } = computeResults()
    const scoringSubtests = breakdown.filter(b => b.type !== 'merken' && b.type !== 'pause')
    return (
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px' }}>
        <BackBtn onBack={() => { setPhase('settings'); setUserAnswers([]); setCorrectAnswers([]) }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ color:T.orange, fontSize:24, fontWeight:'bold', marginBottom:4 }}>Auswertung</div>
            <div style={{ color:T.muted, fontSize:14 }}>
              {totalPct != null ? `${totalCorrect} von ${totalItems} Fragen richtig (${Math.round(totalPct*100)}%)` : 'Keine bewertbaren Antworten'}
              {gesamtScore != null && <span style={{ color:T.orange, fontWeight:'bold' }}> · Gesamtscore: {Math.round(gesamtScore*100)}%</span>}
            </div>
          </div>
          <button onClick={() => exportPDF(breakdown, totalItems, totalCorrect, totalPct, gesamtScore)}
            style={{ background:T.surf2, border:`1px solid ${T.border}`, borderRadius:8,
              color:T.text, cursor:'pointer', padding:'8px 16px', fontSize:13, flexShrink:0 }}
          >📄 PDF</button>
        </div>

        <Card>
          <div style={{ display:'grid', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:T.muted, marginBottom:4 }}>
              <span style={{ minWidth:20, textAlign:'right', flexShrink:0 }}>#</span>
              <span style={{ flex:1 }}>Untertest</span>
              <span style={{ width:40, textAlign:'center', flexShrink:0 }}>Fragen</span>
              <span style={{ width:42, textAlign:'center', flexShrink:0 }}>Richtig</span>
              <span style={{ width:38, textAlign:'center', flexShrink:0 }}>%</span>
              <span style={{ width:46, textAlign:'center', flexShrink:0 }}>Gewicht</span>
              <span style={{ width:70, flexShrink:0 }}></span>
            </div>
            {scoringSubtests.map((b, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                <span style={{ color:T.muted, minWidth:20, textAlign:'right', flexShrink:0 }}>{i+1}.</span>
                <span style={{ color:T.text, flex:1 }}>{b.name}</span>
                <span style={{ color:T.muted, width:40, textAlign:'center', flexShrink:0 }}>{getScoredItems(b)}</span>
                <span style={{ color:b.pct!=null?(b.pct>=0.7?T.green:b.pct>=0.4?T.yellow:T.red):T.muted, fontWeight:700, width:42, textAlign:'center', flexShrink:0 }}>
                  {b.type==='soziales'?b.correct.toFixed(1):b.correct}
                </span>
                <span style={{ color:b.pct!=null?(b.pct>=0.7?T.green:b.pct>=0.4?T.yellow:T.red):T.muted, fontWeight:700, width:38, textAlign:'center', flexShrink:0 }}>
                  {b.pct!=null?`${Math.round(b.pct*100)}%`:'–'}
                </span>
                <span style={{ color:T.muted, width:46, textAlign:'center', flexShrink:0, fontSize:11 }}>
                  {b.weight>0?`${(b.weight*100).toFixed(1)}%`:'–'}
                </span>
                <div style={{ width:70, height:6, background:T.surf2, borderRadius:3, flexShrink:0 }}>
                  <div style={{ width:`${b.pct!=null?b.pct*100:0}%`, height:'100%',
                    background:b.pct!=null&&b.pct>=0.7?T.green:b.pct!=null&&b.pct>=0.4?T.yellow:T.red,
                    borderRadius:3, transition:'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
          {gesamtScore != null && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
              <div style={{ color:T.muted, fontSize:12, marginBottom:4 }}>Gewichteter Gesamtscore</div>
              <div style={{ color:T.orange, fontSize:32, fontWeight:'bold' }}>{Math.round(gesamtScore*100)}%</div>
              <div style={{ color:T.muted, fontSize:11, marginTop:4 }}>Basierend auf den offiziellen MedAT-Sektionsgewichten</div>
            </div>
          )}
        </Card>

        <div style={{ display:'flex', gap:12, marginTop:20, justifyContent:'center' }}>
          <button onClick={() => {
              const ri = reviewIndices(subtests)
              setPhase('review')
              setCurrentIdx(ri[0] ?? 0)
            }}
            style={{ background:T.surf2, border:`1px solid ${T.border}`, borderRadius:10,
              color:T.text, cursor:'pointer', padding:'12px 24px', fontSize:14 }}
          >← Lösung korrigieren</button>
          <button onClick={() => { setPhase('settings'); setUserAnswers([]); setCorrectAnswers([]) }}
            style={{ background:T.orange, border:'none', borderRadius:10, color:'#000',
              cursor:'pointer', padding:'12px 24px', fontSize:14, fontWeight:'bold' }}
          >Neue Simulation</button>
        </div>
      </div>
    )
  }

  return null
}
