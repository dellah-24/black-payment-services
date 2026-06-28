import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorReportingProvider } from '@/components/ErrorReportingContext';
import { ThemeProvider } from '@/components/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BlackPayments Wallet',
  description: 'Secure multi-chain cryptocurrency wallet for USDT payments',
  keywords: ['cryptocurrency', 'wallet', 'USDT', 'TRON', 'Ethereum', 'payments'],
  authors: [{ name: 'BlackPayments' }],
  openGraph: {
    title: 'BlackPayments Wallet',
    description: 'Secure multi-chain cryptocurrency wallet',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorReportingProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ErrorReportingProvider>
      </body>
    </html>
  );
}
