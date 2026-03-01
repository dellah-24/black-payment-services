
# Escrow Engine Specification

## Escrow Record Schema

escrows table:

- id
- chain
- escrow_model = "multisig_2of3"
- threshold = 2
- depositor_pubkey
- beneficiary_pubkey
- arbiter_pubkey
- escrow_address
- chain_metadata (jsonb)
- status
- funded_at
- settled_at
- dispute_status

## Escrow Status Flow

pending → funded → settled
pending → funded → dispute → settled/refunded

## API Endpoints

POST /api/escrow
POST /api/escrow/:id/propose
POST /api/escrow/:id/sign
POST /api/escrow/:id/broadcast
POST /api/escrow/:id/dispute
