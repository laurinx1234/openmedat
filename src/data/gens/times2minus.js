import { rnd } from '../../components/Shared.jsx'
import { safe, ch } from './helpers.js'

export default function times2minus() {
  for (let _ = 0; _ < 50; _++) {
    const sub = ch([2, 4, 6, 8]), a = rnd(3, 15)
    const s = [a]
    for (let i = 0; i < 8; i++) s.push(s[s.length - 1] * 2 - sub)
    if (safe(s)) return { seq: s, label: `Je Schritt: ×2 dann −${sub}` }
  }
  return null
}
