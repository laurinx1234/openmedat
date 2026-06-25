import { rnd } from '../../components/Shared.jsx'
import { safe } from './helpers.js'

export default function inception() {
  for (let _ = 0; _ < 50; _++) {
    const a = rnd(5, 30), d = rnd(4, 12), x = rnd(1, 4)
    const s = [a]
    let diff = d, ok = true
    for (let i = 0; i < 8; i++) {
      s.push(s[s.length - 1] + diff)
      diff = diff + x * Math.pow(2, i)
      if (diff > 500) { ok = false; break }
    }
    if (ok && s.length === 9 && safe(s)) return { seq: s, label: `Inception: Δ=${d}, ${d + x}, ${d + 3 * x}, ...` }
  }
  const a = rnd(5, 20), diffs = [2, 4, 6, 10, 16, 26, 42, 68], s = [a]
  for (let i = 0; i < 8; i++) s.push(s[i] + diffs[i])
  return { seq: s, label: 'Steigende Differenzen' }
}
