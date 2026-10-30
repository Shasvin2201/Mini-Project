import React from 'react';

export function SkeletonLoader({ className = '', height = 'h-4', width = 'w-full' }) {
  return (
    <div
      className={`animate-pulse bg-gray-800/80 rounded-lg ${height} ${width} ${className}`}
    />
  );
}

export function SkeletonCard({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#182234] border border-gray-700/60 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonLoader width="w-24" height="h-3.5" />
            <SkeletonLoader width="w-8" height="h-8" className="rounded-xl" />
          </div>
          <SkeletonLoader width="w-16" height="h-7" />
          <SkeletonLoader width="w-32" height="h-3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full rounded-2xl border border-gray-700/70 bg-[#182234] p-6 space-y-4">
      <div className="flex justify-between items-center pb-4 border-b border-gray-700/60">
        <SkeletonLoader width="w-36" height="h-5" />
        <SkeletonLoader width="w-28" height="h-8" className="rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 items-center py-2">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonLoader key={c} width="w-full" height="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkeletonLoader;
