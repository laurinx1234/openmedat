import { safe, ch } from './helpers.js'

export default function cycle4() {
  for (let _ = 0; _ < 100; _++) {
    const sub = ch([2, 4, 6]), add = ch([2, 4, 6]), a = ch([8, 10, 12, 14, 16, 18, 20, 24, 28, 32])
    const s = [a]
    let ok = true
    for (let i = 0; i < 8; i++) {
      const last = s[s.length - 1], op = ['sub', 'mul', 'add', 'div'][i % 4]
      if (op === 'sub') s.push(last - sub)
      else if (op === 'mul') s.push(last * 2)
      else if (op === 'add') s.push(last + add)
      else { if (last % 2 !== 0) { ok = false; break }; s.push(last / 2) }
    }
    if (ok && safe(s)) return { seq: s, label: `4er-Zyklus: −${sub}, ×2, +${add}, ÷2` }
  }
  return null
}
