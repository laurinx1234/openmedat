import { useState, useEffect } from 'react'

export function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const h = () => setPath(window.location.pathname)
    window.addEventListener('popstate', h)
    return () => window.removeEventListener('popstate', h)
  }, [])
  // Normalize trailing slash
  return path === '/' ? '/' : path.replace(/\/$/, '')
}
