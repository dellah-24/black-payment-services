'use client';

import { useState } from 'react';
import { PageCard } from '@/components/PageCard';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/health',
    description: 'Health check endpoint',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/custodial/health',
    description: 'Custodial service health check',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/custodial/addresses',
    description: 'Get custodial wallet addresses',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/custodial/balances',
    description: 'Get custodial wallet balances',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/custodial/history',
    description: 'Get transaction history',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/custodial/withdraw',
    description: 'Initiate withdrawal',
    auth: true,
    parameters: [
      { name: 'to', type: 'string', required: true, description: 'Recipient address' },
      { name: 'amount', type: 'string', required: true, description: 'Amount to withdraw' },
      { name: 'chain', type: 'string', required: true, description: 'Blockchain network' },
    ],
  },
  {
    method: 'POST',
    path: '/api/payments/requests',
    description: 'Create payment request',
    auth: true,
    parameters: [
      { name: 'amount', type: 'string', required: true, description: 'Payment amount' },
      { name: 'currency', type: 'string', required: true, description: 'Currency (USDT)' },
      { name: 'description', type: 'string', required: false, description: 'Payment description' },
    ],
  },
  {
    method: 'GET',
    path: '/api/payments/[id]',
    description: 'Get payment details',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/payments/[id]/status',
    description: 'Get payment status',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/exchange',
    description: 'Get exchange rates',
    auth: false,
    parameters: [
      { name: 'from', type: 'string', required: true, description: 'Source currency' },
      { name: 'to', type: 'string', required: true, description: 'Target currency' },
      { name: 'amount', type: 'string', required: true, description: 'Amount to exchange' },
    ],
  },
  {
    method: 'GET',
    path: '/api/exchange/courses',
    description: 'Get exchange courses',
    auth: false,
  },
  {
    method: 'POST',
    path: '/api/merchant/api-keys',
    description: 'Create merchant API key',
    auth: true,
  },
  {
    method: 'DELETE',
    path: '/api/merchant/api-keys/[id]',
    description: 'Delete merchant API key',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/payments/webhooks',
    description: 'Register payment webhook',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/payments/webhooks/[id]',
    description: 'Get webhook status',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/csrf',
    description: 'Get CSRF token',
    auth: false,
  },
];

const methodColors = {
  GET: 'bg-green-600',
  POST: 'bg-blue-600',
  PUT: 'bg-yellow-600',
  DELETE: 'bg-red-600',
};

export default function ApiDocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">API Documentation</h1>
          <p className="text-gray-400">BlackPayments Wallet API Reference</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PageCard title="Endpoints">
              <div className="space-y-2">
                {apiEndpoints.map((endpoint, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedEndpoint(endpoint)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEndpoint?.path === endpoint.path
                        ? 'bg-blue-900/50 border border-blue-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold text-white ${methodColors[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <span className="text-white text-sm font-mono truncate">{endpoint.path}</span>
                    </div>
                  </button>
                ))}
              </div>
            </PageCard>
          </div>

          <div className="lg:col-span-2">
            {selectedEndpoint ? (
              <PageCard title={`${selectedEndpoint.method} ${selectedEndpoint.path}`}>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                    <p className="text-gray-300">{selectedEndpoint.description}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Authentication</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedEndpoint.auth
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-green-900 text-green-300'
                      }`}
                    >
                      {selectedEndpoint.auth ? 'Required' : 'Not Required'}
                    </span>
                  </div>

                  {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Parameters</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="pb-2 text-gray-400 font-medium">Name</th>
                              <th className="pb-2 text-gray-400 font-medium">Type</th>
                              <th className="pb-2 text-gray-400 font-medium">Required</th>
                              <th className="pb-2 text-gray-400 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEndpoint.parameters.map((param, index) => (
                              <tr key={index} className="border-b border-gray-700/50">
                                <td className="py-3 text-white font-mono text-sm">{param.name}</td>
                                <td className="py-3 text-gray-300 text-sm">{param.type}</td>
                                <td className="py-3">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      param.required ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
                                    }`}
                                  >
                                    {param.required ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td className="py-3 text-gray-300 text-sm">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Example Request</h3>
                    <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                      <code className="text-green-400 text-sm">
                        {selectedEndpoint.method === 'GET'
                          ? `curl -X GET "${selectedEndpoint.path}" \\\n  -H "Authorization: Bearer YOUR_TOKEN"`
                          : `curl -X ${selectedEndpoint.method} "${selectedEndpoint.path}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -d '{}'`}
                      </code>
                    </pre>
                  </div>
                </div>
              </PageCard>
            ) : (
              <PageCard title="Select an endpoint">
                <div className="text-center py-12">
                  <p className="text-gray-400">Select an endpoint from the list to view its documentation</p>
                </div>
              </PageCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
