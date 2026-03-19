'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';
import { 
  Wallet, 
  Send, 
  History, 
  Settings, 
  Sun, 
  Moon,
  Menu,
  X,
  DollarSign,
  Lock,
  Home,
  ChevronRight
} from 'lucide-react';
import { ToastProvider } from '@/components/Toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/send', label: 'Send', icon: Send },
    { href: '/p2p', label: 'P2P Trading', icon: DollarSign },
    { href: '/wallets', label: 'Wallets', icon: Lock },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BlackPayments - USDT P2P Wallet</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 text-white' 
          : 'bg-gradient-to-br from-gray-50 via-white to-indigo-50 text-gray-900'
      }`}>
        <ToastProvider>
        {/* Modern Glassmorphic Navigation */}
        <nav className={`fixed top-0 left-0 right-0 z-50 ${
          theme === 'dark'
            ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800/50'
            : 'bg-white/80 backdrop-blur-xl border-gray-200/50'
        } border-b supports-[backdrop-filter]:bg-gray-900/80`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight">BlackPayments</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    P2P Exchange
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                          : theme === 'dark'
                          ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {isActive && (
                        <ChevronRight className="h-3 w-3 ml-1" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    theme === 'dark' 
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`md:hidden p-2.5 rounded-xl transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className={`md:hidden border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="px-4 py-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : theme === 'dark'
                          ? 'text-gray-400 hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="pt-20 pb-8 min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className={`py-6 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                © 2024 BlackPayments. Built with Next.js & Tailwind CSS.
              </p>
              <div className="flex items-center space-x-6">
                <a href="#" className={`text-sm ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                  Terms
                </a>
                <a href="#" className={`text-sm ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                  Privacy
                </a>
                <a href="#" className={`text-sm ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                  Support
                </a>
              </div>
            </div>
          </div>
        </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
