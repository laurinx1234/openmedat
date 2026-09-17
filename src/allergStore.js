// Persistent store for pending Allergieausweise quiz session.
// Persists across React navigations and page reloads via localStorage.
const STORAGE_KEY = 'openmedat_allerg_session'

export function setSession(session) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) {
    /* localStorage unavailable */
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function clearSession() {
  setSession(null)
}

export function isQuizReady() {
  const session = getSession()
  if (!session) return false
  if (session.status === 'quiz') return true
  return session.quizReadyAt ? Date.now() >= session.quizReadyAt : false
}

export function minutesUntilQuiz() {
  const session = getSession()
  if (!session || !session.quizReadyAt) return null
  const ms = session.quizReadyAt - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 60000)
}

