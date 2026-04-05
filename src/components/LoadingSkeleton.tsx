const LoadingSkeleton = ({ rows = 5, showChart = false }: { rows?: number; showChart?: boolean }) => (
  <div className="space-y-6 animate-pulse">
    {showChart && (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="h-3 w-20 bg-muted rounded mb-3" />
            <div className="h-6 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    )}
    <div className="glass-card overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="h-8 w-64 bg-muted rounded" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded hidden md:block" />
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded hidden sm:block" />
            <div className="h-5 w-20 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default LoadingSkeleton;
