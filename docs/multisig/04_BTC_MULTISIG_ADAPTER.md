
# Bitcoin Multisig Adapter

Chains:
BTC, LTC, DOGE (UTXO)

## Implementation

- Generate 2-of-3 P2WSH multisig
- Store witness script
- Derive escrow address
- Use PSBT for transaction building

## Settlement Flow

1. Build PSBT
2. Collect 2 signatures
3. Finalize PSBT
4. Broadcast

## Important

- No private key storage
- User wallets must support PSBT
