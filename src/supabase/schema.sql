-- BlackPayments Wallet - Supabase Database Schema
-- Run this in Supabase SQL editor or via migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    country TEXT,
    nationality TEXT,
    state TEXT,
    city TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    postal_code TEXT,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encrypted wallets table
CREATE TABLE IF NOT EXISTS encrypted_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    encrypted_mnemonic TEXT,
    encryption_iv TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custody addresses (custodial wallet addresses)
CREATE TABLE IF NOT EXISTS custody_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    chain TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc')),
    address TEXT NOT NULL,
    derivation_path TEXT NOT NULL,
    account_index INTEGER NOT NULL DEFAULT 0,
    purpose TEXT NOT NULL CHECK (purpose IN ('deposit', 'withdrawal', 'hot', 'cold')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chain, purpose, account_index)
);

-- Custodial withdrawals
CREATE TABLE IF NOT EXISTS custodial_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    chain TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc')),
    token TEXT NOT NULL DEFAULT 'USDT',
    amount TEXT NOT NULL,
    amount_base TEXT NOT NULL,
    to_address TEXT NOT NULL,
    from_address TEXT,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled')),
    fee TEXT NOT NULL DEFAULT '0',
    idempotency_key TEXT NOT NULL,
    explorer_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(idempotency_key)
);

-- Custodial deposits
CREATE TABLE IF NOT EXISTS custodial_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    custody_address_id UUID REFERENCES custody_addresses(id),
    chain TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc')),
    token TEXT NOT NULL DEFAULT 'USDT',
    amount TEXT NOT NULL,
    amount_base TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    from_address TEXT,
    to_address TEXT NOT NULL,
    block_number INTEGER,
    status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    type TEXT NOT NULL CHECK (type IN ('send', 'receive', 'deposit', 'withdrawal')),
    token TEXT NOT NULL,
    chain TEXT NOT NULL,
    amount TEXT NOT NULL,
    fee TEXT,
    hash TEXT NOT NULL,
    to_address TEXT,
    from_address TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment requests
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    chain TEXT NOT NULL,
    deposit_address TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment links
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    description TEXT,
    chain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- P2P orders
CREATE TABLE IF NOT EXISTS p2p_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    token TEXT NOT NULL DEFAULT 'USDT',
    chain TEXT NOT NULL DEFAULT 'tron',
    amount TEXT NOT NULL,
    price TEXT NOT NULL,
    fiat_currency TEXT NOT NULL DEFAULT 'USD',
    payment_methods TEXT[] NOT NULL,
    min_amount TEXT,
    max_amount TEXT,
    time_limit INTEGER NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'filled', 'cancelled', 'expired', 'partially_filled')),
    terms TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- P2P trades
CREATE TABLE IF NOT EXISTS p2p_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES p2p_orders(id),
    maker_id UUID NOT NULL REFERENCES profiles(id),
    taker_id UUID NOT NULL REFERENCES profiles(id),
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    token TEXT NOT NULL DEFAULT 'USDT',
    chain TEXT NOT NULL DEFAULT 'tron',
    amount TEXT NOT NULL,
    price TEXT NOT NULL,
    fiat_amount TEXT NOT NULL,
    fiat_currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting_payment' CHECK (status IN ('waiting_payment', 'paid', 'released', 'disputed', 'cancelled', 'completed')),
    expires_at TIMESTAMP WITH TIME ZONE,
    taker_confirmed_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reputation
CREATE TABLE IF NOT EXISTS user_reputation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    rating INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    completed_trades INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodial_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodial_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own encrypted wallet" ON encrypted_wallets FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.wallet_address = encrypted_wallets.wallet_address AND profiles.id = auth.uid())
);

CREATE POLICY "Users can view own custody addresses" ON custody_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage custody addresses" ON custody_addresses FOR ALL USING (true);

CREATE POLICY "Users can view own withdrawals" ON custodial_withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage withdrawals" ON custodial_withdrawals FOR ALL USING (true);

CREATE POLICY "Users can view own deposits" ON custodial_deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage deposits" ON custodial_deposits FOR ALL USING (true);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage transactions" ON transactions FOR ALL USING (true);

CREATE POLICY "Users can view own payment requests" ON payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage payment requests" ON payment_requests FOR ALL USING (true);

CREATE POLICY "Users can view own payment links" ON payment_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage payment links" ON payment_links FOR ALL USING (true);

CREATE POLICY "Users can view own p2p orders" ON p2p_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage p2p orders" ON p2p_orders FOR ALL USING (true);

CREATE POLICY "Users can view own p2p trades" ON p2p_trades FOR SELECT USING (
    auth.uid() = maker_id OR auth.uid() = taker_id
);
CREATE POLICY "Service can manage p2p trades" ON p2p_trades FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custody_addresses_user_id ON custody_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_custody_addresses_chain ON custody_addresses(chain);
CREATE INDEX IF NOT EXISTS idx_custodial_withdrawals_user_id ON custodial_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_custodial_withdrawals_idempotency ON custodial_withdrawals(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_custodial_deposits_user_id ON custodial_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
