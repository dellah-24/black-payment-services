
# Solana Multisig Adapter

## Implementation

- Create multisig account (Squads-style)
- Owners: depositor, beneficiary, arbiter
- Threshold = 2

## Flow

1. Create multisig PDA
2. Deposit funds
3. Create proposal
4. Collect 2 approvals
5. Execute

## Security

- No upgrade authority retained
- No admin override
