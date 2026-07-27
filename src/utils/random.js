export const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
export const pick = arr => arr[Math.floor(Math.random() * arr.length)]
export const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]] }; return a }
