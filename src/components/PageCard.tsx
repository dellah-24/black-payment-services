'use client';

import { ReactNode } from 'react';

interface PageCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function PageCard({ children, className = '', noPadding = false }: PageCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 ${noPadding ? '' : 'p-6'} ${className}`}>
      {/* Subtle background blur effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
