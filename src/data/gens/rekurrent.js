import { rnd } from '../../components/Shared.jsx'
import { safe } from './helpers.js'

export default function rekurrent() {
  for (let _ = 0; _ < 50; _++) {
    const a = rnd(1, 10), b = rnd(1, 10), c = rnd(1, 10), d = rnd(1, 10), s = [a, b, c, d]
    while (s.length < 9) s.push(s[s.length - 2] + s[s.length - 4])
    if (safe(s)) return { seq: s, label: 'Zₙ = Zₙ₋₂ + Zₙ₋₄' }
  }
  return null
}
