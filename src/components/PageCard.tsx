'use client';

import { ReactNode } from 'react';

interface PageCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function PageCard({ title, subtitle, children, className = '', actions }: PageCardProps) {
  return (
    <div className={`page-card ${className}`}>
      {(title || subtitle || actions) && (
        <div className="page-card-header">
          <div className="page-card-title">
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="page-card-actions">{actions}</div>}
        </div>
      )}
      <div className="page-card-content">{children}</div>
    </div>
  );
}
