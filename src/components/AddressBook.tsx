'use client';

import { useState } from 'react';
import { ChainKey } from '@/config/chains';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { validateEthereumAddress, validateTronAddress, ValidationResult } from '@/lib/validation';

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  chain: ChainKey;
  createdAt: string;
}

interface AddressBookProps {
  entries: AddressBookEntry[];
  onAddEntry: (entry: Omit<AddressBookEntry, 'id' | 'createdAt'>) => void;
  onDeleteEntry: (id: string) => void;
  onSelectEntry: (entry: AddressBookEntry) => void;
}

export function AddressBook({ entries, onAddEntry, onDeleteEntry, onSelectEntry }: AddressBookProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState<ChainKey>('ethereum');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let validation: ValidationResult;
    if (chain === 'tron') {
      validation = validateTronAddress(address);
    } else {
      validation = validateEthereumAddress(address);
    }

    if (!validation.isValid) {
      setError(validation.errors[0] ?? 'Validation failed');
      return;
    }

    onAddEntry({
      name,
      address,
      chain,
    });

    setName('');
    setAddress('');
    setChain('ethereum' as ChainKey);
  };

  return (
    <div className="address-book">
      <h3>Address Book</h3>

      <form onSubmit={handleSubmit} className="add-address-form">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <select value={chain} onChange={(e) => setChain(e.target.value as ChainKey)}>
          {SUPPORTED_CHAINS.map((c) => (
            <option key={c} value={c}>
              {getChainConfig(c).name}
            </option>
          ))}
        </select>
        <button type="submit">Add</button>
        {error && <span className="error">{error}</span>}
      </form>

      <div className="address-list">
        {entries.length === 0 ? (
          <p>No saved addresses</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="address-item">
              <div className="address-info" onClick={() => onSelectEntry(entry)}>
                <span className="address-name">{entry.name}</span>
                <span className="address-value">
                  {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                </span>
                <span className="address-chain">{getChainConfig(entry.chain).name}</span>
              </div>
              <button onClick={() => onDeleteEntry(entry.id)} className="delete-btn">
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
