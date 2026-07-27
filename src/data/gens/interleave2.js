import { rnd, pick } from '../../utils/random.js'
import { safe } from './helpers.js'

export default function interleave2() {
  for (let _ = 0; _ < 50; _++) {
    const a1 = rnd(5, 40), a2 = rnd(2, 15), d = rnd(3, 10), r = pick([2, 3])
    const s = []
    for (let i = 0; i < 5; i++) { s.push(a1 + i * d); s.push(a2 * Math.pow(r, i)) }
    const s9 = s.slice(0, 9)
    if (safe(s9)) return { seq: s9, label: `2er-Sprung: Folge A +${d} / Folge B ×${r}` }
  }
  return null
}
