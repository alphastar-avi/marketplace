import { Toast, ToastProps } from './Toast'

interface ToastContainerProps {
  toasts: ToastProps[]
  removeToast: (id: string) => void
}

export const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  )
}
