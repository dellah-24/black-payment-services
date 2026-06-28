'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

export function Skeleton({ width = '100%', height = 20, className = '', variant = 'text' }: SkeletonProps) {
  const variantStyles = {
    text: { borderRadius: 4 },
    rectangular: { borderRadius: 8 },
    circular: { borderRadius: '50%' },
  };

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...variantStyles[variant],
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card-skeleton">
      <Skeleton variant="rectangular" height={120} />
      <Skeleton variant="text" height={20} width="60%" />
      <Skeleton variant="text" height={16} width="80%" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="table-row-skeleton">
          <Skeleton variant="text" height={16} width="20%" />
          <Skeleton variant="text" height={16} width="30%" />
          <Skeleton variant="text" height={16} width="25%" />
          <Skeleton variant="text" height={16} width="25%" />
        </div>
      ))}
    </div>
  );
}
