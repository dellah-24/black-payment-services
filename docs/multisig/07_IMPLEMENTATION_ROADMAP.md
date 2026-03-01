
# Implementation Roadmap

Phase 1:
- Build EscrowEngine abstraction
- Implement EVM Safe adapter
- Implement BTC multisig adapter

Phase 2:
- Add Solana adapter
- Add Cosmos multisig support

Phase 3:
- Deprecate custodial escrow
- Migrate new escrows to multisig only

Feature Flags:
MULTISIG_ESCROW_ENABLED=true
MULTISIG_DEFAULT=true
