-- =============================================
-- BLACKPAYMENTS WALLET - FRESH DATABASE RESET
-- =============================================
-- Run this SQL in your Supabase SQL Editor when you want to wipe the
-- application database and rebuild it from scratch.
--
-- WARNING:
-- This deletes ALL data from the application tables in the public schema:
-- profiles, P2P data, wallet storage, custodial ledger, audit logs, etc.
--
-- NOTE:
-- This intentionally resets application tables only. Supabase-managed
-- schemas such as auth and storage are preserved.
-- =============================================

-- =============================================
-- STEP 1: Drop all application tables
-- =============================================
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS payment_refunds CASCADE;
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS payment_webhooks CASCADE;
DROP TABLE IF EXISTS merchant_api_keys CASCADE;
DROP TABLE IF EXISTS payment_requests CASCADE;
DROP TABLE IF EXISTS custody_balances CASCADE;
DROP TABLE IF EXISTS custodial_deposits CASCADE;
DROP TABLE IF EXISTS custodial_withdrawals CASCADE;
DROP TABLE IF EXISTS custody_addresses CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS user_reputation CASCADE;
DROP TABLE IF EXISTS p2p_trades CASCADE;
DROP TABLE IF EXISTS p2p_orders CASCADE;
DROP TABLE IF EXISTS encrypted_wallets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- =============================================
-- STEP 2: Enable required extensions
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STEP 3: Core user profile table
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
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
  kyc_level INTEGER DEFAULT 0,
  kyc_status TEXT DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX idx_profiles_kyc_status ON profiles(kyc_status);

-- =============================================
-- STEP 4: P2P tables
-- =============================================
CREATE TABLE p2p_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  token TEXT NOT NULL DEFAULT 'USDT',
  chain TEXT NOT NULL DEFAULT 'tron',
  amount TEXT NOT NULL,
  filled_amount TEXT DEFAULT '0',
  price TEXT NOT NULL,
  fiat_currency TEXT NOT NULL DEFAULT 'USD',
  payment_methods TEXT[] DEFAULT ARRAY['bank_transfer'],
  min_amount TEXT,
  max_amount TEXT,
  time_limit INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'partially_filled', 'filled', 'cancelled', 'expired')),
  terms TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_orders_user ON p2p_orders(user_id);
CREATE INDEX idx_orders_status ON p2p_orders(status);
CREATE INDEX idx_orders_type ON p2p_orders(type);
CREATE INDEX idx_orders_fiat_currency ON p2p_orders(fiat_currency);
CREATE INDEX idx_orders_chain ON p2p_orders(chain);

CREATE TABLE p2p_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES p2p_orders(id) ON DELETE CASCADE,
  maker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  taker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  token TEXT NOT NULL DEFAULT 'USDT',
  chain TEXT NOT NULL DEFAULT 'tron',
  amount TEXT NOT NULL,
  price TEXT NOT NULL,
  fiat_amount TEXT NOT NULL,
  fiat_currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'waiting_payment', 'paid', 'released', 'refunded', 'disputed')),
  maker_payment_details TEXT,
  taker_payment_details TEXT,
  maker_confirmed_at TIMESTAMP WITH TIME ZONE,
  taker_confirmed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_trades_order ON p2p_trades(order_id);
CREATE INDEX idx_trades_maker ON p2p_trades(maker_id);
CREATE INDEX idx_trades_taker ON p2p_trades(taker_id);
CREATE INDEX idx_trades_status ON p2p_trades(status);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES p2p_trades(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'maker_wins', 'taker_wins', 'cancelled')),
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disputes_trade ON disputes(trade_id);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TABLE user_reputation (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  trade_count INTEGER DEFAULT 0,
  total_volume TEXT DEFAULT '0',
  completion_rate DECIMAL(5,2) DEFAULT 100.00,
  avg_release_time INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.00,
  review_count INTEGER DEFAULT 0,
  positive_reviews INTEGER DEFAULT 0,
  negative_reviews INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES p2p_trades(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trade_id, reviewer_id)
);

CREATE INDEX idx_reviews_user ON reviews(reviewed_user_id);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES p2p_trades(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_trade ON chat_messages(trade_id);
CREATE INDEX idx_messages_created ON chat_messages(created_at);

-- =============================================
-- STEP 5: Transaction history table
-- =============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('send', 'receive', 'p2p_buy', 'p2p_sell', 'swap', 'stake', 'unstake')),
  token TEXT NOT NULL DEFAULT 'USDT',
  chain TEXT NOT NULL,
  amount TEXT NOT NULL,
  fee TEXT DEFAULT '0',
  hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  to_address TEXT,
  from_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_hash ON transactions(hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- =============================================
-- STEP 6: Custodial USDT wallet ledger
-- =============================================
CREATE TABLE custody_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chain TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc')),
  address TEXT NOT NULL,
  derivation_path TEXT NOT NULL,
  account_index INTEGER NOT NULL DEFAULT 0,
  purpose TEXT NOT NULL CHECK (purpose IN ('deposit', 'withdrawal', 'hot', 'cold')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chain, address),
  UNIQUE(user_id, chain, purpose, account_index)
);

CREATE INDEX idx_custody_addresses_user ON custody_addresses(user_id);
CREATE INDEX idx_custody_addresses_chain ON custody_addresses(chain);
CREATE INDEX idx_custody_addresses_status ON custody_addresses(status);
CREATE INDEX idx_custody_addresses_purpose ON custody_addresses(purpose);

CREATE TABLE custodial_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chain TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc')),
  token TEXT NOT NULL DEFAULT 'USDT',
  amount TEXT NOT NULL,
  amount_base TEXT NOT NULL,
  to_address TEXT NOT NULL,
  from_address TEXT,
  tx_hash TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled')),
  fee TEXT DEFAULT '0',
  fee_limit TEXT,
  idempotency_key TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  explorer_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX idx_withdrawals_user_created ON custodial_withdrawals(user_id, created_at DESC);
CREATE INDEX idx_withdrawals_status ON custodial_withdrawals(status);
CREATE INDEX idx_withdrawals_chain ON custodial_withdrawals(chain);
CREATE INDEX idx_withdrawals_idempotency ON custodial_withdrawals(idempotency_key);

CREATE TABLE custodial_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  custody_address_id UUID REFERENCES custody_addresses(id) ON DELETE SET NULL,
  chain TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc')),
  token TEXT NOT NULL DEFAULT 'USDT',
  amount TEXT NOT NULL,
  amount_base TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  from_address TEXT,
  to_address TEXT NOT NULL,
  block_number BIGINT,
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'confirmed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_deposits_user_created ON custodial_deposits(user_id, detected_at DESC);
CREATE INDEX idx_deposits_status ON custodial_deposits(status);
CREATE INDEX idx_deposits_chain ON custodial_deposits(chain);
CREATE INDEX idx_deposits_tx_hash ON custodial_deposits(tx_hash);

CREATE TABLE custody_balances (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chain TEXT NOT NULL CHECK (chain IN ('tron', 'ethereum', 'bsc')),
  token TEXT NOT NULL,
  available_balance TEXT NOT NULL DEFAULT '0',
  locked_balance TEXT NOT NULL DEFAULT '0',
  raw_balance TEXT NOT NULL DEFAULT '0',
  decimals INTEGER NOT NULL DEFAULT 6,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY(user_id, chain, token)
);

CREATE INDEX idx_custody_balances_user ON custody_balances(user_id);
CREATE INDEX idx_custody_balances_chain ON custody_balances(chain);

-- =============================================
-- STEP 7: Secure cloud wallet storage
-- =============================================
CREATE TABLE encrypted_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  encrypted_mnemonic TEXT,
  encryption_iv TEXT NOT NULL,
  encryption_salt TEXT NOT NULL,
  mnemonic_iv TEXT,
  mnemonic_salt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_encrypted_wallets_address ON encrypted_wallets(wallet_address);

-- =============================================
-- STEP 8: Rate limiting
-- =============================================
CREATE TABLE rate_limits (
  ip VARCHAR(45) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_updated ON rate_limits(updated_at);

-- =============================================
-- STEP 9: Audit logs
-- =============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =============================================
-- STEP 10: Realtime subscriptions
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION add_realtime_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_object THEN
    NULL;
END;
$$ LANGUAGE plpgsql;

SELECT add_realtime_table('custodial_withdrawals');
SELECT add_realtime_table('custodial_deposits');
SELECT add_realtime_table('custody_addresses');
SELECT add_realtime_table('chat_messages');
SELECT add_realtime_table('p2p_trades');
SELECT add_realtime_table('p2p_orders');

DROP FUNCTION IF EXISTS add_realtime_table(TEXT);

-- =============================================
-- STEP 11: Enable Row Level Security
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodial_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodial_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 12: RLS policies
-- =============================================

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE USING (auth.uid() = id);

-- P2P orders
CREATE POLICY "Anyone can view active orders"
  ON p2p_orders FOR SELECT USING (status IN ('active', 'partially_filled'));

CREATE POLICY "Users can insert orders"
  ON p2p_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON p2p_orders FOR UPDATE USING (auth.uid() = user_id);

-- P2P trades
CREATE POLICY "Parties can view trades"
  ON p2p_trades FOR SELECT USING (
    auth.uid() = maker_id OR
    auth.uid() = taker_id OR
    EXISTS (
      SELECT 1 FROM p2p_orders
      WHERE id = p2p_trades.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create trades"
  ON p2p_trades FOR INSERT WITH CHECK (
    auth.uid() = maker_id OR auth.uid() = taker_id
  );

CREATE POLICY "Parties can update trades"
  ON p2p_trades FOR UPDATE USING (
    auth.uid() = maker_id OR auth.uid() = taker_id
  );

-- Disputes
CREATE POLICY "Parties can view disputes"
  ON disputes FOR SELECT USING (
    auth.uid() = opened_by OR
    EXISTS (
      SELECT 1 FROM p2p_trades
      WHERE id = disputes.trade_id AND (maker_id = auth.uid() OR taker_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert disputes"
  ON disputes FOR INSERT WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Parties can update disputes"
  ON disputes FOR UPDATE USING (
    auth.uid() = opened_by OR
    EXISTS (
      SELECT 1 FROM p2p_trades
      WHERE id = disputes.trade_id AND (maker_id = auth.uid() OR taker_id = auth.uid())
    )
  );

-- User reputation
CREATE POLICY "Users can view own reputation"
  ON user_reputation FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert reputation"
  ON user_reputation FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update reputation"
  ON user_reputation FOR UPDATE USING (true);

-- Transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE USING (auth.uid() = user_id);

-- Chat messages
CREATE POLICY "Parties can view messages"
  ON chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM p2p_trades
      WHERE id = chat_messages.trade_id AND (maker_id = auth.uid() OR taker_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Reviews
CREATE POLICY "Users can view reviews"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Users can insert own reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- Custodial ledger
CREATE POLICY "Users can view own custody addresses"
  ON custody_addresses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custody addresses"
  ON custody_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custody addresses"
  ON custody_addresses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawals"
  ON custodial_withdrawals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals"
  ON custodial_withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own withdrawals"
  ON custodial_withdrawals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own deposits"
  ON custodial_deposits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposits"
  ON custodial_deposits FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own custody balances"
  ON custody_balances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can upsert custody balances"
  ON custody_balances FOR ALL USING (true) WITH CHECK (true);

-- Encrypted wallet storage
CREATE POLICY "Users can view own encrypted wallet"
  ON encrypted_wallets FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.wallet_address = encrypted_wallets.wallet_address
    )
  );

CREATE POLICY "Users can insert own encrypted wallet"
  ON encrypted_wallets FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.wallet_address = encrypted_wallets.wallet_address
    )
  );

CREATE POLICY "Users can update own encrypted wallet"
  ON encrypted_wallets FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.wallet_address = encrypted_wallets.wallet_address
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.wallet_address = encrypted_wallets.wallet_address
    )
  );

CREATE POLICY "Users can delete own encrypted wallet"
  ON encrypted_wallets FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.wallet_address = encrypted_wallets.wallet_address
    )
  );

-- Rate limits
CREATE POLICY "Allow anonymous rate limit upserts"
  ON rate_limits FOR ALL USING (true) WITH CHECK (true);

-- Audit logs
CREATE POLICY "Users and system can insert audit logs"
  ON audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- =============================================
-- STEP 13: Trigger functions
-- =============================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_order_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION after_trade_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'released' THEN
    UPDATE user_reputation SET
      trade_count = trade_count + 1,
      total_volume = (total_volume::bigint + NEW.fiat_amount::bigint)::text,
      updated_at = NOW()
    WHERE user_id = NEW.maker_id;

    IF NEW.taker_id IS NOT NULL THEN
      UPDATE user_reputation SET
        trade_count = trade_count + 1,
        total_volume = (total_volume::bigint + NEW.fiat_amount::bigint)::text,
        updated_at = NOW()
      WHERE user_id = NEW.taker_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE updated_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 14: Timestamp/status triggers
-- =============================================
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_orders_timestamp
  BEFORE UPDATE ON p2p_orders
  FOR EACH ROW EXECUTE FUNCTION update_order_status();

CREATE TRIGGER update_trades_timestamp
  BEFORE UPDATE ON p2p_trades
  FOR EACH ROW EXECUTE FUNCTION update_order_status();

CREATE TRIGGER update_disputes_timestamp
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_wallets_timestamp
  BEFORE UPDATE ON encrypted_wallets
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rate_limits_timestamp
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_custody_addresses_timestamp
  BEFORE UPDATE ON custody_addresses
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_custodial_withdrawals_timestamp
  BEFORE UPDATE ON custodial_withdrawals
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_custody_balances_timestamp
  BEFORE UPDATE ON custody_balances
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER on_trade_completion
  AFTER UPDATE ON p2p_trades
  FOR EACH ROW EXECUTE FUNCTION after_trade_completion();

-- =============================================
-- STEP 15: Grant privileges
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits() TO anon, authenticated;

-- =============================================
-- DONE
-- =============================================
SELECT 'Fresh BlackPayments wallet database reset complete' AS status;
SELECT tablename AS table_name
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'p2p_orders',
    'p2p_trades',
    'disputes',
    'user_reputation',
    'transactions',
    'custody_addresses',
    'custodial_withdrawals',
    'custodial_deposits',
    'custody_balances',
    'encrypted_wallets',
    'rate_limits',
    'audit_logs',
    'chat_messages',
    'reviews'
  )
ORDER BY tablename;
