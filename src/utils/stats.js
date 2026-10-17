export const MAX_STATS = 1000

export function buildStatsExport(stats, now = new Date()) {
  return { app: 'openMedAT', version: 1, exportedAt: now.toISOString(), stats }
}

function normalizeEntry(entry, validTestIds) {
  if (!entry || typeof entry !== 'object') return null
  const { test, date, correct, total } = entry
  if (typeof test !== 'string' || !validTestIds.has(test)) return null
  if (typeof date !== 'string' || !date.trim()) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  if (!Number.isInteger(correct) || !Number.isInteger(total)) return null
  if (total <= 0 || correct < 0 || correct > total) return null
  return { test, date: parsed.toISOString(), correct, total }
}

export function parseStatsInput(text, validTestIds) {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw) return { ok: false, error: 'Keine Daten eingefügt.' }

  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return { ok: false, error: 'Ungültiges JSON.' }
  }

  const list = Array.isArray(data) ? data : data && Array.isArray(data.stats) ? data.stats : null
  if (!list) return { ok: false, error: 'Erwartet wird ein Statistik-Export (JSON).' }
  if (!list.length) return { ok: false, error: 'Der Import enthält keine Einträge.' }

  const ids = validTestIds instanceof Set ? validTestIds : new Set(validTestIds)
  const entries = []
  let rejected = 0
  for (const item of list) {
    const normalized = normalizeEntry(item, ids)
    if (normalized) entries.push(normalized)
    else rejected++
  }
  if (!entries.length) return { ok: false, error: `Keine gültigen Einträge gefunden (${rejected} ungültig).` }
  return { ok: true, entries, rejected }
}

function statsKey(entry) {
  return `${entry?.test}|${entry?.date}|${entry?.correct}|${entry?.total}`
}

function timeOf(entry) {
  const t = Date.parse(entry?.date)
  return Number.isFinite(t) ? t : 0
}

export function mergeStats(existing, incoming, max = MAX_STATS) {
  const seen = new Set()
  const merged = []
  for (const entry of existing) {
    const key = statsKey(entry)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(entry)
  }

  let imported = 0
  let duplicates = 0
  for (const entry of incoming) {
    const key = statsKey(entry)
    if (seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    merged.push(entry)
    imported++
  }

  merged.sort((a, b) => timeOf(a) - timeOf(b))
  const trimmed = Math.max(0, merged.length - max)
  return { stats: merged.slice(-max), imported, duplicates, trimmed }
}
