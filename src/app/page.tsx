import Link from 'next/link';
import { PaymentDemo } from '@/components/demo/PaymentDemo';
import { Partners } from '@/components/Partners';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-24 sm:pb-32">
          {/* AI Agent Discovery + CLI install */}
          <div className="mb-8 mx-auto max-w-2xl space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-400">
              <span className="whitespace-nowrap font-medium">🤖 AI Agent?</span>
              <code className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg font-mono text-emerald-400 border border-white/10 break-all">curl -s https://tempesttouch.com/skill.md</code>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-400">
              <span className="whitespace-nowrap font-medium">⌨️ Install CLI?</span>
              <code className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg font-mono text-emerald-400 border border-white/10 break-all">curl -fsSL https://tempesttouch.com/install.sh | sh</code>
            </div>
          </div>

          {/* Logo/Brand */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 mb-6 shadow-2xl shadow-blue-500/40 ring-1 ring-white/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight">
              Tempest<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Touch</span>
            </h1>
            <p className="text-2xl sm:text-3xl text-gray-200 mb-4 max-w-3xl mx-auto font-light">
              Payments, Escrow & Wallets for Humans and AI Agents
            </p>
            <p className="text-lg text-gray-400 mb-14 max-w-2xl mx-auto leading-relaxed">
              Non-custodial crypto infrastructure — accept payments, hold funds in escrow, and manage wallets. API-first, no KYC, built for the agent economy.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-semibold rounded-2xl shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-[1.02] transition-all duration-300 text-center ring-1 ring-white/20"
            >
              Get Started Free
            </Link>
            <Link
              href="/docs"
              className="w-full sm:w-auto px-10 py-4 bg-white/5 backdrop-blur-md text-white font-semibold rounded-2xl border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 text-center"
            >
              View Documentation
            </Link>
          </div>

          {/* How It Works */}
          <div className="max-w-5xl mx-auto mb-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Works</span>
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Get started in minutes with our simple three-step process
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Create Account',
                  description: 'Sign up for free and get your API keys. No credit card required.',
                  icon: '🚀',
                  color: 'from-indigo-500 to-blue-500'
                },
                {
                  step: '02',
                  title: 'Integrate',
                  description: 'Use our SDK or REST API to add crypto payments to your platform.',
                  icon: '⚙️',
                  color: 'from-violet-500 to-purple-500'
                },
                {
                  step: '03',
                  title: 'Get Paid',
                  description: 'Receive payments directly to your wallet. Instant settlement, zero hassle.',
                  icon: '💰',
                  color: 'from-fuchsia-500 to-pink-500'
                }
              ].map((item, index) => (
                <div key={index} className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-300 group">
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {item.step}
                  </div>
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} mb-6 shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300`}>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
            {[
              { label: 'Transactions Processed', value: '47K+' },
              { label: 'Active Merchants', value: '1,200+' },
              { label: 'Total Volume', value: '$8.2M+' },
              { label: 'Countries', value: '45+' },
            ].map((stat, index) => (
              <div key={index} className="text-center p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors duration-300">
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 mb-3">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Secondary Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { label: 'Transaction Fee', value: '0.5–1%', subtext: 'Pro 0.5% · Starter 1%' },
              { label: 'Supported Chains', value: '15+' },
              { label: 'Avg. Processing', value: '<1 min' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-indigo-400 font-semibold">{stat.value}</span>
                <span className="text-gray-500 text-sm">{stat.label}</span>
                {'subtext' in stat && stat.subtext && (
                  <span className="text-gray-600 text-xs">({stat.subtext})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              Built for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Future</span> of Payments
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to accept crypto, manage escrow, and power AI agent transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'Sub-second settlement via Lightning Network with BOLT12 offers. Near-zero fees for instant payments.',
                color: 'from-amber-400 to-orange-500'
              },
              {
                icon: '🔐',
                title: 'Non-Custodial',
                description: 'Funds go directly to merchant wallets. No intermediaries, no KYC, full control of your assets.',
                color: 'from-teal-400 to-emerald-500'
              },
              {
                icon: '🤖',
                title: 'AI Agent Ready',
                description: 'Built for the agent economy. AI agents can create wallets, send payments, and manage escrows autonomously.',
                color: 'from-purple-400 to-violet-500'
              },
              {
                icon: '🌐',
                title: 'Multi-Chain',
                description: 'Support for 7+ blockchains including Bitcoin, Ethereum, Solana, Polygon, and USDC on multiple networks.',
                color: 'from-cyan-400 to-blue-500'
              },
              {
                icon: '🛡️',
                title: 'Trustless Escrow',
                description: 'Hold funds until both parties are satisfied. Multi-chain escrow with auto-refund and dispute resolution.',
                color: 'from-pink-400 to-rose-500'
              },
              {
                icon: '💳',
                title: 'x402 Protocol',
                description: 'HTTP-native machine payments. Paywall any API route with HTTP 402. Multi-chain facilitator support.',
                color: 'from-blue-400 to-indigo-500'
              }
            ].map((feature, index) => (
              <div key={index} className="group p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300`}>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join thousands of merchants and AI agents already using Tempest Touch for seamless crypto payments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-semibold rounded-2xl shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-[1.02] transition-all duration-300 text-center ring-1 ring-white/20"
            >
              Start Building
            </Link>
            <Link
              href="/docs"
              className="w-full sm:w-auto px-10 py-4 bg-white/5 backdrop-blur-md text-white font-semibold rounded-2xl border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 text-center"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
