import { createContext, useContext, ReactNode } from 'react'
import { useToast } from './Toast'
import { ToastContainer } from './ToastContainer'

const ToastContext = createContext<ReturnType<typeof useToast> | null>(null)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </ToastContext.Provider>
  )
}

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}
