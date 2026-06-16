# Custodial HD Key and Blockchain Node Setup

This document records the implementation for robust custodial key management and blockchain node access.

## Custodial HD wallet model

BlackPayments should operate as a custodial wallet: the platform controls signing authority and users authenticate through the app. The MVP now includes deterministic address generation so each user can receive funds at a unique deposit address derived from a master seed.

### BIP-32/BIP-39/BIP-44 derivation

The HD derivation helpers are implemented in [`src/lib/hdWallet.ts`](src/lib/hdWallet.ts:1):

- `getBIP44Path({ chain, accountIndex, change, addressIndex })`
- `deriveHDPrivateKey(mnemonic, chain, accountIndex)`
- `deriveHDKey(mnemonic, chain, accountIndex)`
- `deriveEVMWallet(mnemonic, chain, accountIndex, rpcUrl)`
- `deriveTronPrivateKey(mnemonic, accountIndex)`

The current coin types are:

| Chain family | Coin type | Example deposit path |
| --- | --- | --- |
| EVM chains | `60` | `m/44'/60'/0'/0/{accountIndex}` |
| TRON TRC-20 | `195` | `m/44'/195'/0'/0/{accountIndex}` |

The wallet constructor in [`src/wallet/BlackPaymentsWallet.ts`](src/wallet/BlackPaymentsWallet.ts:73) now accepts an `accountIndex` option and derives per-chain HD private keys from a mnemonic instead of using the default derivation path for every chain.

## Custodial key manager abstraction

The key manager abstraction is implemented in [`src/lib/custodialKeyManager.ts`](src/lib/custodialKeyManager.ts:1):

- `LocalHDCustodialKeyManager`: safe for local development only; it keeps the master seed in memory and derives keys deterministically.
- `HttpHSMCustodialKeyManager`: adapter for a backend/HSM service exposing derive/sign endpoints.
- `AdapterCustodialKeyManager`: wraps a custom HSM client.
- `deriveCustodialDepositAddress(...)`: derives a user deposit address without requiring the browser to handle private keys.

Production deployments should not use the local HD manager. Use an HSM, KMS, MPC signer, or a hardened custody service. The HSM should store the master seed and expose controlled APIs for:

1. Deriving deposit addresses by user/account index.
2. Signing EVM transactions.
3. Signing TRON transactions.
4. Enforcing withdrawal policy, limits, allowlists, and audit logging.

## Blockchain node setup

The blockchain node helpers are implemented in [`src/lib/blockchainNodes.ts`](src/lib/blockchainNodes.ts:1):

- `getEVMProvider(chain, customRpcUrl?)`
- `getEVMWallet(chain, privateKey, customRpcUrl?)`
- `getTronWeb(privateKey?, options?)`
- `readEVMBlockNumber(chain)`
- `readEVMUSDTBalance(chain, address)`
- `writeEVMUSDTTransfer(...)`
- `readTronBlockNumber()`
- `readTronUSDTBalance(address)`
- `writeTronUSDTTransfer(...)`
- `checkNodeHealth(chain)`

Public/client RPCs remain available through `NEXT_PUBLIC_*` variables. Server-only signing/indexing jobs should use private RPC environment variables from `.env.example`.

## Environment variables

Updated `.env.example` includes:

- Public RPCs: `NEXT_PUBLIC_ETHEREUM_RPC`, `NEXT_PUBLIC_BSC_RPC`, `NEXT_PUBLIC_TRON_RPC`, etc.
- Server-only RPCs: `ETHEREUM_RPC_URL`, `BSC_RPC_URL`, `TRON_RPC_URL`.
- TRON node endpoints: `TRON_FULL_NODE`, `TRON_SOLIDITY_NODE`, `TRON_EVENT_SERVER`.

Do not expose server-only RPCs or HSM/KMS credentials as `NEXT_PUBLIC_*` variables.

## Recommended production topology

1. Generate one master seed in an HSM/KMS/MPC system.
2. Store user account metadata in PostgreSQL: user ID, chain, account index, derivation path, deposit address, status.
3. Derive a unique deposit address per user and chain using BIP-44 paths.
4. Run a blockchain indexer/webhook service to credit deposits after sufficient confirmations.
5. Run withdrawals through a server-side signer path:
   - EVM: ethers.js signer connected to a private RPC.
   - TRON: TronWeb connected to private TRON nodes.
6. Enforce policy before signing: KYC, limits, address allowlists, velocity checks, and manual review for high-risk withdrawals.
7. Persist canonical transaction records and audit events in PostgreSQL.
8. Use Redis or Upstash for nonce locks, pending withdrawal state, idempotency keys, and rate limits.

## Verification

- `npm run typecheck` passed.
- `npm run build` should be run after production RPC/HSM configuration is finalized.
