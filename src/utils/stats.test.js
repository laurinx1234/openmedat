import { describe, it, expect } from 'vitest'
import { MAX_STATS, buildStatsExport, parseStatsInput, mergeStats } from './stats.js'

const IDS = new Set(['zahlenfolgen', 'wortfluessigkeit'])
const eintrag = (over = {}) => ({
  test: 'zahlenfolgen',
  date: '2026-01-01T10:00:00.000Z',
  correct: 7,
  total: 10,
  ...over,
})

describe('buildStatsExport', () => {
  it('liefert Metadaten und übernimmt alle Einträge', () => {
    const now = new Date('2026-02-03T04:05:06.000Z')
    const stats = [eintrag()]
    expect(buildStatsExport(stats, now)).toEqual({
      app: 'openMedAT',
      version: 1,
      exportedAt: '2026-02-03T04:05:06.000Z',
      stats,
    })
  })
})

describe('parseStatsInput', () => {
  it('akzeptiert das Export-Objekt', () => {
    const text = JSON.stringify(buildStatsExport([eintrag()]))
    const result = parseStatsInput(text, IDS)
    expect(result.ok).toBe(true)
    expect(result.entries).toEqual([eintrag()])
    expect(result.rejected).toBe(0)
  })

  it('akzeptiert ein blankes Array', () => {
    const result = parseStatsInput(JSON.stringify([eintrag()]), IDS)
    expect(result.ok).toBe(true)
    expect(result.entries).toHaveLength(1)
  })

  it('normalisiert Datumsangaben auf ISO', () => {
    const result = parseStatsInput(JSON.stringify([eintrag({ date: '2026-01-01T11:00:00+01:00' })]), IDS)
    expect(result.entries[0].date).toBe('2026-01-01T10:00:00.000Z')
  })

  it('überspringt ungültige Einträge und zählt sie', () => {
    const input = [
      eintrag(),
      eintrag({ test: 'unbekannt' }),
      eintrag({ date: 'kein-datum' }),
      eintrag({ correct: 7.5 }),
      eintrag({ total: 0 }),
      eintrag({ correct: 11 }),
      eintrag({ correct: -1 }),
      null,
    ]
    const result = parseStatsInput(JSON.stringify(input), IDS)
    expect(result.ok).toBe(true)
    expect(result.entries).toHaveLength(1)
    expect(result.rejected).toBe(7)
  })

  it('meldet Fehler bei leerem Input und ungültigem JSON', () => {
    expect(parseStatsInput('   ', IDS)).toEqual({ ok: false, error: 'Keine Daten eingefügt.' })
    expect(parseStatsInput('{kaputt', IDS)).toEqual({ ok: false, error: 'Ungültiges JSON.' })
  })

  it('meldet Fehler bei unbekanntem Format oder ohne gültige Einträge', () => {
    expect(parseStatsInput('{"foo":1}', IDS).ok).toBe(false)
    expect(parseStatsInput('[]', IDS).ok).toBe(false)
    const result = parseStatsInput(JSON.stringify([eintrag({ test: 'unbekannt' })]), IDS)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Keine gültigen Einträge')
  })
})

describe('mergeStats', () => {
  it('führt zusammen, überspringt Duplikate und sortiert aufsteigend', () => {
    const existing = [eintrag({ date: '2026-01-02T10:00:00.000Z' })]
    const incoming = [
      eintrag({ date: '2026-01-02T10:00:00.000Z' }),
      eintrag({ date: '2026-01-01T10:00:00.000Z' }),
      eintrag({ date: '2026-01-03T10:00:00.000Z', correct: 9 }),
    ]
    const result = mergeStats(existing, incoming)
    expect(result.imported).toBe(2)
    expect(result.duplicates).toBe(1)
    expect(result.trimmed).toBe(0)
    expect(result.stats.map((e) => e.date)).toEqual([
      '2026-01-01T10:00:00.000Z',
      '2026-01-02T10:00:00.000Z',
      '2026-01-03T10:00:00.000Z',
    ])
  })

  it('entfernt auch Duplikate innerhalb der bestehenden Daten', () => {
    const result = mergeStats([eintrag(), eintrag()], [])
    expect(result.stats).toHaveLength(1)
  })

  it('behält bei Überschreitung des Limits die neuesten Einträge', () => {
    const existing = [eintrag({ date: '2026-01-01T10:00:00.000Z' })]
    const incoming = [eintrag({ date: '2026-01-02T10:00:00.000Z' }), eintrag({ date: '2026-01-03T10:00:00.000Z' })]
    const result = mergeStats(existing, incoming, 2)
    expect(result.stats).toHaveLength(2)
    expect(result.stats.at(-1).date).toBe('2026-01-03T10:00:00.000Z')
    expect(result.trimmed).toBe(1)
    expect(MAX_STATS).toBe(1000)
  })
})
