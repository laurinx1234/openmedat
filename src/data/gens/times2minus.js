import { rnd, pick } from '../../utils/random.js'
import { safe } from './helpers.js'

export default function times2minus() {
  for (let _ = 0; _ < 50; _++) {
    const sub = pick([2, 4, 6, 8]), a = rnd(3, 15)
    const s = [a]
    for (let i = 0; i < 8; i++) s.push(s[s.length - 1] * 2 - sub)
    if (safe(s)) return { seq: s, label: `Je Schritt: ×2 dann −${sub}` }
  }
  return null
}
