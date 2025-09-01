export default function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-md ${className}`}>
      {children}
    </div>
  )
}
