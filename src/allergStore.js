// Global in-memory store for pending Allergieausweise quiz session.
// Persists across React navigations (same page load), resets on refresh.
const store = {
  session: null,
  // session = { shownCards, allCards, qCount, quizReadyAt, learnEndedAt }
}

export function setSession(session) { store.session = session }
export function getSession()        { return store.session }
export function clearSession()      { store.session = null }

export function isQuizReady() {
  if (!store.session) return false
  return Date.now() >= store.session.quizReadyAt
}

export function minutesUntilQuiz() {
  if (!store.session) return null
  const ms = store.session.quizReadyAt - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 60000)
}
