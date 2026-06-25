import { rnd } from '../../components/Shared.jsx'
import { safe, ch } from './helpers.js'

export default function alternating() {
  for (let _ = 0; _ < 50; _++) {
    const a = rnd(10, 60), d = rnd(-20, -3), r = ch([2, 3])
    const s = [a]
    for (let i = 0; i < 8; i++) s.push(i % 2 === 0 ? s[s.length - 1] + d : s[s.length - 1] * r)
    if (safe(s)) return { seq: s, label: `Alt. ${d > 0 ? '+' : ''}${d} / ×${r}` }
  }
  return null
}
