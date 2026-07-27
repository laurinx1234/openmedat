import { rnd, shuffle, pick } from '../../utils/random.js'
import alternating from './alternating.js'
import rates from './rates.js'
import inception from './inception.js'
import cycle3 from './cycle3.js'
import fibonacci from './fibonacci.js'
import tribonacci from './tribonacci.js'
import fibdiff from './fibdiff.js'
import interleave2 from './interleave2.js'
import interleave3 from './interleave3.js'
import times2minus from './times2minus.js'
import cycle3fib from './cycle3fib.js'
import cycle4 from './cycle4.js'
import rekurrent from './rekurrent.js'

const GENS = [alternating, rates, inception, cycle3, fibonacci, tribonacci, fibdiff, interleave2, interleave3, times2minus, cycle3fib, cycle4, rekurrent]

function plausOff(v) {
  const m = Math.max(1, Math.abs(v))
  if (m < 20) return pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6])
  if (m < 100) return pick([-15, -12, -10, -8, -6, -5, 5, 6, 8, 10, 12, 15])
  return pick([-40, -30, -20, -15, -10, 10, 15, 20, 30, 40])
}

function makeChoices(a1, a2, inject) {
  const correct = `${a1}|${a2}`, used = new Set([correct])
  const tryPair = (f1, f2) => {
    for (let _ = 0; _ < 200; _++) {
      const v1 = f1 !== null ? f1 : a1 + plausOff(a1), v2 = f2 !== null ? f2 : a2 + plausOff(a2), k = `${v1}|${v2}`
      if (!used.has(k)) { used.add(k); return [v1, v2] }
    }
    return null
  }
  const dist = [tryPair(a1, null), tryPair(null, a2), tryPair(null, null)].filter(Boolean)
  while (dist.length < (inject ? 4 : 3)) { const p = tryPair(null, null); if (p) dist.push(p) }
  const vis = inject ? dist.slice(0, 4) : [...dist.slice(0, 3), [a1, a2]]
  return [...shuffle(vis), 'keine']
}

export function makeTask() {
  let result
  for (let _ = 0; _ < 100; _++) {
    result = pick(GENS)()
    if (result) break
  }
  if (!result) result = fibonacci()
  const { seq, label } = result
  const [a1, a2] = [seq[7], seq[8]]
  const inject = Math.random() < 0.20
  const choices = makeChoices(a1, a2, inject)
  const ci = inject ? 4 : choices.findIndex(c => Array.isArray(c) && c[0] === a1 && c[1] === a2)
  return { visible: seq.slice(0, 7), answer: [a1, a2], choices, correctIdx: ci, label }
}
