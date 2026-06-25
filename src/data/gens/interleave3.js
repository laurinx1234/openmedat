import { rnd } from '../../components/Shared.jsx'
import { safe, ch } from './helpers.js'

export default function interleave3() {
  for (let _ = 0; _ < 50; _++) {
    const z1 = rnd(2, 20), z2 = rnd(2, 20), z3 = rnd(2, 15), m = ch([3, 4, 5, 6]), a = rnd(3, 15)
    const s = [z1, z2, z3, 0, 0, 0, 0, 0, 0]
    s[3] = s[0] * m; s[4] = s[1] + a; s[5] = s[2] * m; s[6] = s[3] + a; s[7] = s[4] * m; s[8] = s[5] + a
    if (safe(s)) return { seq: s, label: `3er-Sprung: ×${m} / +${a}` }
  }
  return null
}
