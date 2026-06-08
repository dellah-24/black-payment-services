'use client';

import { useState, useEffect } from 'react';
import { 
  AddressBookEntry, 
  getAddressBook, 
  saveAddress, 
  removeAddress 
} from '@/lib/walletUtils';
import { 
  Book, 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Check,
  Copy,
  ExternalLink,
  Send
} from 'lucide-react';

interface AddressBookProps {
  onSelect?: (entry: AddressBookEntry) => void;
  chain?: string;
}

export function AddressBook({ onSelect, chain }: AddressBookProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEntry, setNewEntry] = useState({
    name: '',
    address: '',
    chain: chain || 'ethereum',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = () => {
    const data = getAddressBook();
    setEntries(data);
  };

  const handleAdd = () => {
    if (!newEntry.name || !newEntry.address) return;
    
    saveAddress(newEntry);
    setNewEntry({ name: '', address: '', chain: 'ethereum' });
    setShowAddModal(false);
    loadEntries();
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this address from your address book?')) {
      removeAddress(id);
      loadEntries();
    }
  };

  const copyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEntries = entries.filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Address Book</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved addresses</p>
            <p className="text-xs mt-1">Add frequently used addresses for quick access</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/30">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 hover:bg-gray-700/30 transition-colors flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{entry.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400 capitalize">
                      {entry.chain}
                    </span>
                  </div>
                  <code className="text-xs text-gray-500 block truncate mt-0.5">
                    {entry.address.slice(0, 14)}...{entry.address.slice(-10)}
                  </code>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => copyAddress(entry.address, entry.id)}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy address"
                  >
                    {copiedId === entry.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  
                  {onSelect && (
                    <button
                      onClick={() => onSelect(entry)}
                      className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Use this address"
                    >
                      <Send className="h-4 w-4 text-indigo-400" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gray-800 p-6 max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add New Address</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newEntry.name}
                  onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                  placeholder="e.g., John, My Trading Account"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Address</label>
                <input
                  type="text"
                  value={newEntry.address}
                  onChange={(e) => setNewEntry({ ...newEntry, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Network</label>
                <select
                  value={newEntry.chain}
                  onChange={(e) => setNewEntry({ ...newEntry, chain: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white appearance-none cursor-pointer"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="bsc">BNB Chain</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="tron">TRON</option>
                  <option value="solana">Solana</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newEntry.name || !newEntry.address}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
