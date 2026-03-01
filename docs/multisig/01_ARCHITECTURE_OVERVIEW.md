# CoinPay Multisig Escrow v2 – Architecture Overview

Generated: 2026-02-27T08:09:21.585178 UTC

## Objective
Eliminate unilateral custody and regulatory exposure by implementing
a cross-chain 2-of-3 multisig escrow model.

## Core Rule
CoinPay must never be able to move funds alone.

## Participants
- Depositor (Buyer)
- Beneficiary (Seller)
- CoinPay (Arbitrator)

Threshold = 2

## System Layers

EscrowEngine (chain-agnostic core)
    ↳ ChainAdapter (EVM / BTC / SOL / Cosmos)
        ↳ Multisig Implementation

## Key Security Principles
- No escrow private keys stored server-side
- No HD-derived escrow wallets
- No admin override
- No contract upgrade backdoor
