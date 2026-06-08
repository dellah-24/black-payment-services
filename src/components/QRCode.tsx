'use client';

import { useEffect, useState } from 'react';
import { generateQRCode } from '@/lib/walletUtils';
import { Copy, Check, Download } from 'lucide-react';

interface QRCodeProps {
  address: string;
  size?: number;
  showAddress?: boolean;
}

export function QRCode({ address, size = 200, showAddress = true }: QRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = await generateQRCode(address, size);
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      } finally {
        setLoading(false);
      }
    };
    generateQR();
  }, [address, size]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `wallet-address-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative bg-white p-3 rounded-xl">
        {loading ? (
          <div 
            className="animate-pulse bg-gray-200 rounded"
            style={{ width: size, height: size }}
          />
        ) : qrDataUrl ? (
          <img 
            src={qrDataUrl} 
            alt="Wallet QR Code" 
            width={size} 
            height={size}
            className="rounded-lg"
          />
        ) : (
          <div 
            className="bg-gray-100 rounded flex items-center justify-center"
            style={{ width: size, height: size }}
          >
            <span className="text-gray-400 text-sm">QR unavailable</span>
          </div>
        )}
      </div>
      
      {showAddress && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Your Address</p>
          <code className="text-sm text-gray-300 bg-gray-800 px-3 py-2 rounded-lg block max-w-[280px] truncate mx-auto">
            {address}
          </code>
        </div>
      )}
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={copyAddress}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </button>
        
        <button
          onClick={downloadQR}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}
