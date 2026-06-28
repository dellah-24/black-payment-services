'use client';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className = '' }: QRCodeProps) {
  return (
    <div className={`qr-code ${className}`} style={{ width: size, height: size }}>
      <canvas
        width={size}
        height={size}
        data-value={value}
      />
    </div>
  );
}
