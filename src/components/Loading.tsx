export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 animate-pulse">
      <div className="h-4 bg-neutral-800 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-neutral-800 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-neutral-800 rounded w-5/6"></div>
    </div>
  );
}

export function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}
