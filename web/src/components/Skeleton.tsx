'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '40px' : '100px'),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} bg-gray-700/50 ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Pre-built skeleton components for common use cases

export function WalletCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-800/50 p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" width="64px" height="64px" />
          <div className="space-y-2">
            <Skeleton width="100px" height="24px" />
            <Skeleton width="60px" height="16px" />
          </div>
        </div>
        <Skeleton variant="circular" width="40px" height="40px" />
      </div>
      
      <div className="space-y-2">
        <Skeleton width="120px" height="14px" />
        <Skeleton width="200px" height="48px" />
        <Skeleton width="100px" height="14px" />
      </div>
      
      <div className="p-4 rounded-xl bg-black/20">
        <Skeleton width="100px" height="12px" className="mb-2" />
        <div className="flex items-center justify-between">
          <Skeleton width="180px" height="16px" />
          <Skeleton variant="circular" width="32px" height="32px" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-white/5">
            <Skeleton width="40px" height="12px" className="mb-2" />
            <Skeleton width="60px" height="20px" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="p-4 border-b border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width="40px" height="40px" />
          <div>
            <Skeleton width="80px" height="16px" className="mb-1" />
            <Skeleton width="120px" height="12px" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton width="70px" height="18px" className="mb-1" />
          <Skeleton width="50px" height="12px" />
        </div>
      </div>
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-gray-900/50 border border-gray-700/50 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton width="70px" height="24px" />
          <Skeleton width="100px" height="14px" />
        </div>
        <Skeleton width="80px" height="14px" />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <Skeleton width="100px" height="24px" className="mb-1" />
          <Skeleton width="80px" height="14px" />
        </div>
        <div className="text-right">
          <Skeleton width="60px" height="18px" className="mb-1" />
          <Skeleton width="50px" height="14px" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <Skeleton width="80px" height="14px" />
        <Skeleton variant="circular" width="20px" height="20px" />
      </div>
      <Skeleton width="60px" height="28px" />
    </div>
  );
}
