import { useState, useEffect } from 'react'
import { T } from '../theme.js'

const REDDIT_DM = 'https://www.reddit.com/message/compose/?to=LongjumpingMethod461'

export default function Feedback() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Feedback"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          background: T.surf, border: `1px solid ${T.border}`,
          borderRadius: 50, width: 48, height: 48,
          color: T.muted, fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.blue }}
        onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border }}
      >
        ✉
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{
            background: T.surf, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 32, maxWidth: 420, width: '100%',
            color: T.text, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>💬</div>
            <h2 style={{ color: T.text, margin: '0 0 8px', fontSize: 20 }}>Feedback willkommen!</h2>
            <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
              Bugs gefunden? Ideen für neue Features? Schreib mir eine Reddit-DM.
            </p>
            <a
              href={REDDIT_DM}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                background: T.blue, color: T.bg,
                borderRadius: 8, padding: '12px 28px',
                fontSize: 15, fontWeight: 'bold',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Reddit DM öffnen ↗
            </a>
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none',
                  color: T.muted, cursor: 'pointer', fontSize: 13,
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
