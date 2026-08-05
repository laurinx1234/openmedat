import { describe, it, expect } from 'vitest'
import { makeTask } from './index.js'

// Alle Generator-Module einsammeln (neue Dateien werden automatisch mitgetestet)
const modules = import.meta.glob(['./*.js', '!./index.js', '!./helpers.js', '!./*.test.js'], { eager: true })
const gens = Object.entries(modules).map(([path, m]) => [path.replace(/^\.\//, '').replace(/\.js$/, ''), m.default])

describe('Generatoren', () => {
  it('sind alle auffindbar (13 Stück)', () => {
    expect(gens.length).toBe(13)
  })

  for (const [name, gen] of gens) {
    describe(name, () => {
      it('hat einen Default-Export als Funktion', () => {
        expect(typeof gen).toBe('function')
      })

      it('liefert valide 9-stellige Folgen (200 Läufe)', () => {
        let nonNull = 0
        for (let i = 0; i < 200; i++) {
          const r = gen()
          if (r === null) continue
          nonNull++
          expect(Array.isArray(r.seq)).toBe(true)
          expect(r.seq.length).toBe(9)
          for (const v of r.seq) {
            expect(Number.isInteger(v)).toBe(true)
            expect(Math.abs(v)).toBeLessThan(1000000)
          }
          expect(typeof r.label).toBe('string')
          expect(r.label.length).toBeGreaterThan(0)
        }
        expect(nonNull).toBeGreaterThan(0)
      })
    })
  }
})

describe('makeTask', () => {
  it('erfüllt die Aufgaben-Invarianten (500 Läufe)', () => {
    let injectCount = 0
    for (let i = 0; i < 500; i++) {
      const { visible, answer, choices, correctIdx, label } = makeTask()

      expect(visible.length).toBe(7)
      for (const v of visible) expect(Number.isInteger(v)).toBe(true)

      expect(Array.isArray(answer)).toBe(true)
      expect(answer.length).toBe(2)
      for (const v of answer) expect(Number.isInteger(v)).toBe(true)

      expect(choices.length).toBe(5)
      expect(choices[4]).toBe('keine')

      const keys = choices.slice(0, 4).map(p => `${p[0]}|${p[1]}`)
      expect(new Set(keys).size).toBe(4)

      expect(Number.isInteger(correctIdx)).toBe(true)
      expect(correctIdx).toBeGreaterThanOrEqual(0)
      expect(correctIdx).toBeLessThanOrEqual(4)

      const answerKey = `${answer[0]}|${answer[1]}`
      if (correctIdx < 4) {
        expect(keys[correctIdx]).toBe(answerKey)
      } else {
        // 'keine' ist richtig → die korrekte Antwort darf nicht unter den Optionen sein
        expect(keys).not.toContain(answerKey)
        injectCount++
      }

      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
    // p(inject) = 0.2 → bei 500 Läufen müssen beide Zweige vorkommen
    expect(injectCount).toBeGreaterThan(0)
    expect(injectCount).toBeLessThan(500)
  })
})
