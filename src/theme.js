const LIGHT = {
  bg: '#f4f3ef',
  surf: '#ffffff',
  surf2: '#f2f1ec',
  border: '#e6e4dc',
  text: '#161616',
  text2: '#4a4a45',
  muted: '#82827b',
  onAccent: '#ffffff',
  blue: '#33688f',
  green: '#0e6a58',
  red: '#c0472f',
  yellow: '#8a6a15',
  mauve: '#74559f',
  teal: '#0f6f66',
  orange: '#a55a28',
  pink: '#a64d7a',
  shadow: '0 1px 2px rgba(22, 22, 22, 0.04), 0 6px 18px rgba(22, 22, 22, 0.05)',
  shadowSm: '0 1px 3px rgba(22, 22, 22, 0.06)',
}

const DARK = {
  bg: '#141614',
  surf: '#1e211f',
  surf2: '#232723',
  border: '#2a2e2b',
  text: '#f1f2ee',
  text2: '#c6c9c3',
  muted: '#8d918b',
  onAccent: '#12140f',
  blue: '#8ab4e8',
  green: '#63c3aa',
  red: '#e08268',
  yellow: '#e0c07a',
  mauve: '#c0a3e8',
  teal: '#6fc7bd',
  orange: '#e2a06e',
  pink: '#e0a3c8',
  shadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 6px 18px rgba(0, 0, 0, 0.4)',
  shadowSm: '0 1px 3px rgba(0, 0, 0, 0.5)',
}

export const T = {}

const STORAGE_KEY = 'openmedat.theme'
const root = typeof document !== 'undefined' ? document.documentElement : null

function apply(mode) {
  Object.assign(T, mode === 'dark' ? DARK : LIGHT)
  if (root) {
    root.dataset.theme = mode
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', mode === 'dark' ? DARK.bg : LIGHT.bg)
  }
}

export function getTheme() {
  return root && root.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch (e) {
    /* localStorage not available */
  }
  apply(mode)
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

apply(getTheme())
