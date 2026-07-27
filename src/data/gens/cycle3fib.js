import { rnd, pick } from '../../utils/random.js'
import { safe } from './helpers.js'

export default function cycle3fib() {
  for (let _ = 0; _ < 50; _++) {
    const z1 = rnd(2, 10), r1 = rnd(2, 6), r2 = pick([2, 3])
    const s = [z1]
    s.push(s[0] + r1); s.push(s[0] + s[1]); s.push(s[2] * r2)
    s.push(s[3] + r1); s.push(s[3] + s[4]); s.push(s[5] * r2)
    s.push(s[6] + r1); s.push(s[6] + s[7])
    if (safe(s)) return { seq: s, label: `3er-Zyklus: +${r1}, Fibonacci-Summe, ×${r2}` }
  }
  return null
}
