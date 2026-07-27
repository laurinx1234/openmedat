import { rnd } from '../../utils/random.js'
import { safe } from './helpers.js'

export default function rates() {
  for (let _ = 0; _ < 50; _++) {
    const a = rnd(10, 50), r1 = rnd(2, 8), r2 = rnd(-15, -3), i1 = rnd(3, 8), i2 = rnd(-3, -1)
    const s = [a]
    for (let i = 0; i < 8; i++) s.push(i % 2 === 0 ? s[s.length - 1] + r1 + Math.floor(i / 2) * i1 : s[s.length - 1] + r2 + Math.floor(i / 2) * i2)
    if (safe(s)) return { seq: s, label: `Wechselnde Raten, R1 +${i1} je Schritt` }
  }
  return null
}
