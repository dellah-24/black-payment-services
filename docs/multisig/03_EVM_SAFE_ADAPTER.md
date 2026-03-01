
# EVM Safe Adapter

Chains:
ETH, Polygon, Base, Arbitrum, Optimism, BSC, Avalanche C

## Implementation

- Deploy Safe contract
- Owners: depositor, beneficiary, arbiter
- Threshold = 2

## Flow

1. Create Safe
2. Return safe_address as escrow_address
3. Propose transaction
4. Collect 2 signatures
5. Execute

## Security

- No custom escrow contract required
- No admin owner override
