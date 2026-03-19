'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Wallet,
  Shield,
  Users,
  Zap,
  ArrowRight,
  Plus,
  Loader2
} from 'lucide-react';
import { showToast } from '@/components/Toast';

interface P2POrder {
  id: string;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  payment: string;
  status: 'pending' | 'completed' | 'cancelled';
  counterparty: string;
  createdAt: string;
}

export default function P2PPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [account, setAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'create' | 'myOrders'>('orders');
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [myOrders, setMyOrders] = useState<P2POrder[]>([]);
  
  // Create order form
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderPayment, setOrderPayment] = useState('bank_transfer');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
    
    const savedAccount = localStorage.getItem('account');
    if (savedAccount) setAccount(savedAccount);

    // Load mock orders
    setOrders([
      {
        id: '1',
        type: 'buy',
        amount: '500',
        price: '1.01',
        payment: 'Bank Transfer',
        status: 'pending',
        counterparty: '0x1234...5678',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'sell',
        amount: '1000',
        price: '1.00',
        payment: 'Mobile Money',
        status: 'pending',
        counterparty: '0xabcd...efgh',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'buy',
        amount: '250',
        price: '1.02',
        payment: 'PayPal',
        status: 'pending',
        counterparty: '0x9876...5432',
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const createOrder = async () => {
    if (!orderAmount || !orderPrice) {
      showToast('error', 'Please enter amount and price');
      return;
    }
    
    setIsCreating(true);
    
    const newOrder: P2POrder = {
      id: Date.now().toString(),
      type: orderType,
      amount: orderAmount,
      price: orderPrice,
      payment: orderPayment,
      status: 'pending',
      counterparty: account?.slice(0, 8) + '...' + account?.slice(-4) || 'You',
      createdAt: new Date().toISOString(),
    };

    setMyOrders([newOrder, ...myOrders]);
    
    // Save to localStorage
    const savedOrders = JSON.parse(localStorage.getItem('p2pOrders') || '[]');
    savedOrders.unshift(newOrder);
    localStorage.setItem('p2pOrders', JSON.stringify(savedOrders));

    setIsCreating(false);
    setActiveTab('myOrders');
    setOrderAmount('');
    setOrderPrice('');
    showToast('success', 'Order created successfully!');
  };

  const paymentMethods = [
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' },
    { id: 'mobile_money', name: 'Mobile Money', icon: '📱' },
    { id: 'paypal', name: 'PayPal', icon: '💰' },
    { id: 'crypto', name: 'Crypto', icon: '₿' },
  ];

  if (!account) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-2xl border border-gray-700/50 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Wallet className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Connect Wallet First
              </h2>
              <p className="text-gray-400 mb-6">
                Please connect your wallet from the Dashboard first
              </p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-transform">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="p-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              P2P Trading
            </h1>
            <p className="text-gray-400">
              Trade USDT directly with other users
            </p>
          </div>
        </div>

        {/* Features Banner */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shield, label: 'Escrow Protected', sublabel: 'Secure transactions', color: 'green' },
            { icon: Users, label: 'Verified Users', sublabel: 'KYC required', color: 'blue' },
            { icon: Zap, label: 'Instant Trade', sublabel: 'Fast settlements', color: 'orange' },
          ].map((feature) => (
            <div key={feature.label} className="relative overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center`}>
                <feature.icon className={`h-6 w-6 text-${feature.color}-500`} />
              </div>
              <div>
                <p className="font-semibold text-white">{feature.label}</p>
                <p className="text-sm text-gray-400">{feature.sublabel}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'orders', label: 'Market Orders' },
            { id: 'create', label: 'Create Order' },
            { id: 'myOrders', label: 'My Orders' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Market Orders Tab */}
        {activeTab === 'orders' && (
          <div className="relative overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Available Orders
              </h2>
              <div className="grid gap-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-5 rounded-2xl bg-gray-900/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.type === 'buy' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {order.type === 'buy' ? 'BUY' : 'SELL'} USDT
                        </span>
                        <span className="text-sm text-gray-400">
                          via {order.payment}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {order.amount} USDT
                        </p>
                        <p className="text-sm text-gray-400">
                          ≈ ${(parseFloat(order.amount) * parseFloat(order.price)).toFixed(2)} USD
                        </p>
                      </div>
                      
                      <div className="text-right mr-4">
                        <p className="font-semibold text-white">
                          @ ${order.price}
                        </p>
                        <p className="text-sm text-gray-400">
                          {order.counterparty}
                        </p>
                      </div>
                      
                      <button className={`px-5 py-2.5 rounded-xl font-medium ${
                        order.type === 'buy' 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500' 
                          : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
                      } text-white`}>
                        {order.type === 'buy' ? 'Buy' : 'Sell'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Order Tab */}
        {activeTab === 'create' && (
          <div className="relative overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-xl font-bold text-white mb-6 relative">
              Create New Order
            </h2>
            
            {/* Order Type */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button
                onClick={() => setOrderType('sell')}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  orderType === 'sell'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                }`}
              >
                I Want to Sell USDT
              </button>
              <button
                onClick={() => setOrderType('buy')}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  orderType === 'buy'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                }`}
              >
                I Want to Buy USDT
              </button>
            </div>

            {/* Amount */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USDT)
              </label>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 text-xl"
              />
            </div>

            {/* Price */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price per USDT (USD)
              </label>
              <input
                type="number"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                placeholder="1.00"
                step="0.01"
                className="w-full px-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 text-xl"
              />
              <p className="mt-2 text-sm text-gray-400">
                Total: ${orderAmount && orderPrice ? (parseFloat(orderAmount) * parseFloat(orderPrice)).toFixed(2) : '0.00'} USD
              </p>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setOrderPayment(method.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      orderPayment === method.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <span className="ml-2 font-medium text-white">
                      {method.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={createOrder}
              disabled={!orderAmount || !orderPrice || isCreating}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                !orderAmount || !orderPrice || isCreating
                  ? 'bg-gray-700 cursor-not-allowed opacity-50 text-gray-400'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        )}

        {/* My Orders Tab */}
        {activeTab === 'myOrders' && (
          <div className="relative overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
            {myOrders.length === 0 ? (
              <div className="relative p-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-4">
                  No orders yet. Create one to get started!
                </p>
                <button 
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium"
                >
                  <Plus className="h-4 w-4" /> Create Order
                </button>
              </div>
            ) : (
              <div className="relative p-6">
                {myOrders.map((order) => (
                  <div key={order.id} className="p-5 rounded-2xl bg-gray-900/50 border border-gray-700/50 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.type === 'buy' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {order.type === 'buy' ? 'BUY' : 'SELL'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          order.status === 'pending' 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold text-white">
                          {order.amount} USDT
                        </p>
                        <p className="text-sm text-gray-400">
                          @ ${order.price} • {order.payment}
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
