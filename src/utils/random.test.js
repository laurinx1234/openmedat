import { describe, it, expect } from 'vitest'
import { rnd, pick, shuffle } from './random.js'

describe('rnd', () => {
  it('bleibt inklusive in den Grenzen (10.000 Läufe)', () => {
    const seen = new Set()
    for (let i = 0; i < 10000; i++) {
      const v = rnd(3, 7)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
      seen.add(v)
    }
    expect(seen.size).toBe(5)
  })
})

describe('pick', () => {
  it('wählt immer ein Element des Arrays', () => {
    const arr = ['a', 'b', 'c']
    for (let i = 0; i < 100; i++) expect(arr).toContain(pick(arr))
  })
})

describe('shuffle', () => {
  it('behält alle Elemente und verändert das Original nicht', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    const copy = [...arr]
    const out = shuffle(arr)
    expect(arr).toEqual(copy)
    expect([...out].sort((a, b) => a - b)).toEqual(copy)
  })
})
