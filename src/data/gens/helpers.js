export function safe(s) { return s.every(x => x > -999999 && x < 999999) }
export const ch = arr => arr[Math.floor(Math.random() * arr.length)]
