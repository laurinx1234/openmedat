import { rnd } from '../../components/Shared.jsx'

export default function fibonacci() {
  const a = rnd(1, 15), b = rnd(1, 15), s = [a, b]
  while (s.length < 9) s.push(s[s.length - 1] + s[s.length - 2])
  return { seq: s, label: 'Fibonacci: Zₙ = Zₙ₋₁ + Zₙ₋₂' }
}
