export function safe(s) { return s.every(x => x > -999999 && x < 999999) }
