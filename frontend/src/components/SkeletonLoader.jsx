import React from 'react';

export function CardSkeleton() {
  return (
    <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
      <div className="h-4 w-24 skeleton-loader rounded mb-4"></div>
      <div className="h-8 w-32 skeleton-loader rounded mb-2"></div>
      <div className="h-3 w-40 skeleton-loader rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-carbon-border bg-carbon-card/50">
      <div className="p-4 bg-carbon-base/20 border-b border-carbon-border flex justify-between">
        <div className="h-6 w-32 skeleton-loader rounded"></div>
        <div className="h-6 w-48 skeleton-loader rounded"></div>
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div 
                key={cIdx} 
                className="h-5 skeleton-loader rounded" 
                style={{ flexGrow: cIdx === 0 ? 2 : 1, minWidth: '80px' }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpeedometerSkeleton() {
  return (
    <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center h-64">
      <div className="w-48 h-24 rounded-t-full skeleton-loader relative mb-4"></div>
      <div className="h-4 w-32 skeleton-loader rounded mb-2"></div>
      <div className="h-6 w-20 skeleton-loader rounded"></div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-8 pl-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-carbon-border">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="relative flex gap-4 items-start">
          <div className="absolute -left-[20px] w-10 h-10 rounded-full skeleton-loader border border-carbon-border flex items-center justify-center"></div>
          <div className="glass-panel p-4 rounded-lg flex-grow space-y-2 ml-4">
            <div className="h-4 w-32 skeleton-loader rounded"></div>
            <div className="h-5 w-full skeleton-loader rounded"></div>
            <div className="h-3 w-20 skeleton-loader rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
