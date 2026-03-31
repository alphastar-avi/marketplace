import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const ScrollHideContext = createContext(false)

export function ScrollHideProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    const handleScroll = () => {
      if (window.innerWidth >= 640) { setHidden(false); return }
      const currentY = window.scrollY
      setHidden(currentY > lastY && currentY > 60)
      lastY = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <ScrollHideContext.Provider value={hidden}>
      {children}
    </ScrollHideContext.Provider>
  )
}

export function useScrollHidden() {
  return useContext(ScrollHideContext)
}
