import { pick } from '../../utils/random.js'
import { safe } from './helpers.js'

export default function cycle3() {
  for (let _ = 0; _ < 100; _++) {
    const a = pick([16, 24, 32, 48, 64, 80]), add = pick([8, 12, 16, 20])
    const s = [a]
    let ok = true
    for (let i = 0; i < 8; i++) {
      const last = s[s.length - 1], op = i % 3
      if (op === 0) { if (last % 2 !== 0) { ok = false; break }; s.push(last / 2) }
      else if (op === 1) s.push(last * 4)
      else s.push(last + add)
    }
    if (ok && safe(s)) return { seq: s, label: `3er-Zyklus: ÷2, ×4, +${add}` }
  }
  return null
}
