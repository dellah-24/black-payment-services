-- Allow escrow auto-release at expiry for trusted counterparties
ALTER TABLE escrows
  ADD COLUMN IF NOT EXISTS allow_auto_release BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_escrows_funded_auto_release_expiry
  ON escrows (expires_at)
  WHERE status = 'funded' AND allow_auto_release = TRUE;

COMMENT ON COLUMN escrows.allow_auto_release IS 'If true, funded escrow is auto-released at expiry instead of auto-refunded';

-- Recurring series can carry the same policy into future escrows
ALTER TABLE escrow_series
  ADD COLUMN IF NOT EXISTS allow_auto_release BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN escrow_series.allow_auto_release IS 'Default auto-release policy applied to child escrows created by the series monitor';
