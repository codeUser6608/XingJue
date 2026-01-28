export const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
        <p className="text-sm text-white/60">加载中...</p>
      </div>
    </div>
  )
}

