import { rnd } from '../../utils/random.js'
import { safe } from './helpers.js'

export default function tribonacci() {
  const a = rnd(1, 8), b = rnd(1, 8), c = rnd(1, 8), s = [a, b, c]
  while (s.length < 9) s.push(s[s.length - 1] + s[s.length - 2] + s[s.length - 3])
  return safe(s) ? { seq: s, label: 'Fib³: Zₙ = Zₙ₋₁ + Zₙ₋₂ + Zₙ₋₃' } : null
}
