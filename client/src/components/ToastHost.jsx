import React, { useEffect, useRef, useState, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = (msg, opts = {}) => {
    const id = ++idRef.current
    const toast = { id, msg, type: opts.type || 'info', ttl: opts.ttl || 4000 }
    setToasts(t => [...t, toast])
    return id
  }
  const remove = (id) => setToasts(t => t.filter(x => x.id !== id))

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map(t => setTimeout(() => remove(t.id), t.ttl))
    return () => timers.forEach(clearTimeout)
  }, [toasts])

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-72">
        {toasts.map(t => (
          <div key={t.id} className={`text-sm rounded shadow px-4 py-3 border flex items-start justify-between gap-3 animate-fade-in backdrop-blur bg-white/90 ${
            t.type === 'error' ? 'border-red-300 text-red-700' : t.type === 'success' ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-700'
          }`}>
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button onClick={() => remove(t.id)} className="text-xs opacity-70 hover:opacity-100">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

// Simple CSS animation (Tailwind can be extended, but inline here for minimalism)
// Add this to a global style if preferred.
