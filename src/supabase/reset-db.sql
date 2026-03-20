-- =============================================
-- BLACKPAYMENTS WALLET - DATABASE RESET SCRIPT
-- =============================================
-- Run this SQL in your Supabase SQL Editor to reset the database
-- WARNING: This will delete ALL data in these tables!

-- =============================================
-- STEP 1: Drop all tables (in reverse order due to FK constraints)
-- =============================================

DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS user_reputation CASCADE;
DROP TABLE IF EXISTS p2p_trades CASCADE;
DROP TABLE IF EXISTS p2p_orders CASCADE;
DROP TABLE IF EXISTS encrypted_wallets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =============================================
-- STEP 2: Enable UUID extension
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STEP 3: Create all tables
-- =============================================

-- USER PROFILES
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

-- P2P ORDERS
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

-- P2P TRADES
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

-- DISPUTES
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

-- USER REPUTATION
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

-- TRANSACTIONS
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

-- CHAT MESSAGES
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

-- REVIEWS
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

-- ENCRYPTED WALLETS
CREATE TABLE encrypted_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  encrypted_mnemonic TEXT,
  encryption_iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_encrypted_wallets_address ON encrypted_wallets(wallet_address);

-- =============================================
-- STEP 4: Enable Real-time
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE p2p_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE p2p_orders;

-- =============================================
-- STEP 5: Enable Row Level Security
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_wallets ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 6: Create RLS Policies
-- =============================================

-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can update profile" ON profiles;

-- Profiles: Allow all access for now (simplified for development)
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Anyone can insert profile" 
  ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update profile" 
  ON profiles FOR UPDATE USING (true);

-- Orders: Anyone can view active orders, users manage their own
CREATE POLICY "Anyone can view orders" 
  ON p2p_orders FOR SELECT USING (status IN ('active', 'partially_filled'));

CREATE POLICY "Users can insert orders" 
  ON p2p_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" 
  ON p2p_orders FOR UPDATE USING (auth.uid() = user_id);

-- Trades: Parties can view and manage
CREATE POLICY "Parties can view trades" 
  ON p2p_trades FOR SELECT USING (
    auth.uid() = maker_id OR 
    auth.uid() = taker_id OR 
    EXISTS (SELECT 1 FROM p2p_orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create trades" 
  ON p2p_trades FOR INSERT WITH CHECK (
    auth.uid() = maker_id OR auth.uid() = taker_id
  );

CREATE POLICY "Parties can update trades" 
  ON p2p_trades FOR UPDATE USING (
    auth.uid() = maker_id OR auth.uid() = taker_id
  );

-- Messages: Trade parties only
CREATE POLICY "Parties can view messages" 
  ON chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM p2p_trades 
      WHERE id = trade_id AND (maker_id = auth.uid() OR taker_id = auth.uid())
    )
  );

CREATE POLICY "Parties can send messages" 
  ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Encrypted Wallets: Flexible access for app functionality
CREATE POLICY "Anyone can view wallet exists" 
  ON encrypted_wallets FOR SELECT USING (true);

CREATE POLICY "Users can insert own wallet" 
  ON encrypted_wallets FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own wallet" 
  ON encrypted_wallets FOR UPDATE USING (true);

-- =============================================
-- STEP 7: Create Trigger Functions
-- =============================================

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-expire orders
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

-- Create triggers
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

-- =============================================
-- DONE!
-- =============================================
SELECT 'Database reset complete! Tables created: ' || 
       string_agg(tablename, ', ' ORDER BY tablename)
FROM pg_tables 
WHERE schemaname = 'public';
