-- Firebase identity bridge was never populated; no legacy customers are being migrated.
-- Legacy identity data is not touched by this migration.

-- Clean Neon financial core for the no-legacy-customer launch.
-- Balances are derived from posted ledger entries; clients cannot write balances.
CREATE TABLE IF NOT EXISTS wallets (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  currency char(3) NOT NULL DEFAULT 'USD',
  available_balance numeric(20,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  reserved_balance numeric(20,2) NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, currency)
);

CREATE TABLE IF NOT EXISTS financial_idempotency (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('deposit_request','withdrawal_request','investment_request')),
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id bigserial PRIMARY KEY,
  actor_user_id text REFERENCES "user"(id),
  subject_user_id text REFERENCES "user"(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger entries are immutable';
END;
$$;
DROP TRIGGER IF EXISTS ledger_entries_immutable ON ledger_entries;
CREATE TRIGGER ledger_entries_immutable
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE INDEX IF NOT EXISTS financial_audit_subject_idx
  ON financial_audit_log(subject_user_id, created_at DESC);
