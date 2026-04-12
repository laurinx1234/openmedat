import { useState, useEffect, useRef } from 'react'
import { T } from '../theme.js'

export function useTimer(seconds) {
  const [t, setT] = useState(seconds)
  useEffect(() => {
    if (t <= 0) return
    const id = setTimeout(() => setT(x => x - 1), 1000)
    return () => clearTimeout(id)
  }, [t])
  const reset = (s) => setT(s)
  return [t, reset]
}

export function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, ...style }}>
      {children}
    </div>
  )
}

export function BackBtn({ onBack }) {
  return (
    <button onClick={onBack} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '8px 16px', fontSize: 13, marginBottom: 24, display: 'block' }}>
      ← Hauptmenü
    </button>
  )
}

export function ProgressBar({ current, total, color = T.blue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{ color: T.muted, fontSize: 13, minWidth: 60 }}>{current} / {total}</span>
      <div style={{ flex: 1, height: 4, background: T.surf2, borderRadius: 4 }}>
        <div style={{ width: `${(current / total) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export function TimerBadge({ seconds }) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  const col = seconds < 30 ? T.red : seconds < 120 ? T.yellow : T.teal
  return (
    <span style={{ color: col, fontSize: 15, border: `1px solid ${col}`, padding: '4px 12px', borderRadius: 6, fontVariantNumeric: 'tabular-nums' }}>
      {m}:{s}
    </span>
  )
}

export function OptionBtn({ label, text, state, onClick, style = {} }) {
  const colors = {
    idle:    [T.surf2, T.border, T.text],
    correct: [`${T.green}22`, T.green, T.text],
    wrong:   [`${T.red}22`, T.red, T.text],
  }
  const [bg, bc, tc] = colors[state] || colors.idle
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
      background: bg, border: `1px solid ${bc}`, borderRadius: 10,
      color: tc, cursor: state === 'idle' ? 'pointer' : 'default',
      padding: '12px 16px', fontSize: 14, textAlign: 'left',
      marginBottom: 8, transition: 'all 0.15s', ...style
    }}>
      <span style={{ color: T.yellow, minWidth: 22, fontWeight: 'bold', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1 }}>{text}</span>
      {state === 'correct' && <span style={{ color: T.green, marginLeft: 'auto' }}>✓</span>}
      {state === 'wrong'   && <span style={{ color: T.red,   marginLeft: 'auto' }}>✗</span>}
    </button>
  )
}

export function ResultScreen({ correct, total, onRetry, onBack }) {
  const pct = Math.round((correct / total) * 100)
  const col = pct >= 70 ? T.green : pct >= 50 ? T.yellow : T.red
  const msg = pct >= 85 ? 'Ausgezeichnet! 🏆' : pct >= 70 ? 'Sehr gut! 💪' : pct >= 50 ? 'Solide Basis 📚' : 'Weiter üben! 🔁'
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 72, fontWeight: 'bold', color: col, marginBottom: 8 }}>{pct}%</div>
      <div style={{ color: T.muted, fontSize: 16, marginBottom: 8 }}>{correct} von {total} richtig</div>
      <div style={{ color: col, fontSize: 20, marginBottom: 40 }}>{msg}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={onRetry} style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, cursor: 'pointer', padding: '12px 28px', fontSize: 15 }}>
          Nochmal
        </button>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '12px 28px', fontSize: 15 }}>
          Hauptmenü
        </button>
      </div>
    </div>
  )
}

export function KeyHint() {
  return (
    <div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>
      Taste drücken: {['a','s','d','f','g'].map(k => (
        <span key={k} style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, color: T.yellow, marginRight: 4 }}>{k}</span>
      ))}
    </div>
  )
}

export function SettingRow({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            background: value === opt.value ? `${T.blue}25` : T.surf2,
            border: `1px solid ${value === opt.value ? T.blue : T.border}`,
            borderRadius: 8, color: value === opt.value ? T.blue : T.text,
            cursor: 'pointer', padding: '8px 16px', fontSize: 14,
          }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}


// ─── Keyboard navigation for settings screens ─────────────────────────────────
// rows: 2D array of { action } objects. rows.length index = Start button.
// active: only attach keyboard handler when true (pass mode==='settings')
export function useSettingsKeyboard(rows, onStart, onBack, active) {
  const [pos, setPos] = useState([0, 0])
  const ref = useRef({})
  // Always keep ref current so the handler sees latest values
  ref.current = { pos, rows, onStart, onBack, active }

  useEffect(() => {
    if (!active) return  // detach when not in settings mode
    const h = e => {
      const { pos:[r,c], rows, onStart, onBack } = ref.current
      const maxRow = rows.length
      let nr=r, nc=c, moved=false

      if      (e.key==='ArrowRight' && r<maxRow) { nc=Math.min(c+1,rows[r].length-1); moved=true }
      else if (e.key==='ArrowLeft'  && r<maxRow) { nc=Math.max(c-1,0);                moved=true }
      else if (e.key==='ArrowDown') {
        nr=Math.min(r+1,maxRow)
        nc=nr<maxRow ? Math.min(c,rows[nr].length-1) : 0
        moved=true
      }
      else if (e.key==='ArrowUp') {
        nr=Math.max(r-1,0)
        nc=nr<maxRow ? Math.min(c,rows[nr].length-1) : 0
        moved=true
      }
      else if (e.key==='Enter'||e.key===' ') {
        e.preventDefault()
        if (r>=maxRow) onStart()
        else rows[r][c]?.action()
        return
      }
      else if (e.key==='Escape') { onBack(); return }

      if (moved) { e.preventDefault(); setPos([nr,nc]) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active])  // re-attach/detach when active changes

  return {
    isFocused: (r, c) => pos[0]===r && pos[1]===c,
    isStartFocused: () => pos[0] >= ref.current.rows.length,
  }
}

export const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
export const pick = arr => arr[Math.floor(Math.random() * arr.length)]
export const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]] }; return a }
export const OPTS = ['A','B','C','D','E']
export const KEYS = ['a','s','d','f','g']
