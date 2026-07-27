import { rnd } from '../../utils/random.js'
import { safe } from './helpers.js'

export default function fibdiff() {
  const a = rnd(5, 20), r1 = rnd(1, 5), r2 = rnd(3, 9)
  const s = [a, a + r1], diffs = [r1, r2]
  while (s.length < 9) {
    const nd = diffs[diffs.length - 1] + diffs[diffs.length - 2]
    diffs.push(nd)
    s.push(s[s.length - 1] + nd)
  }
  return safe(s) ? { seq: s, label: `Fibonacci der Differenzen: ${r1}, ${r2}, ${r1 + r2}, ...` } : null
}
