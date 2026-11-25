-- BitfuryTech PostgreSQL foundation.
-- Apply with: npm run db:migrate
-- This migration is additive. It does not delete or alter Firebase data.

CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  username text UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON session("userId");

-- Safe for databases where the original Better Auth user table already exists.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS user_username_unique_idx ON "user"(username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON account("userId");

CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  username text UNIQUE,
  country text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  preferred_rail text NOT NULL DEFAULT 'USDT (TRC20)',
  email_alerts boolean NOT NULL DEFAULT true,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  account_status text NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Review', 'Suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Review', 'Suspended'));

CREATE TABLE IF NOT EXISTS user_roles (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('investor', 'admin', 'support')),
  granted_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- Provision the least-privileged role and a profile for every new Better Auth user.
CREATE OR REPLACE FUNCTION bitfurytech_provision_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'investor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bitfurytech_user_provision_after_insert ON "user";
CREATE TRIGGER bitfurytech_user_provision_after_insert
AFTER INSERT ON "user"
FOR EACH ROW EXECUTE FUNCTION bitfurytech_provision_user();

CREATE TABLE IF NOT EXISTS investment_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  min_deposit numeric(20, 2) NOT NULL CHECK (min_deposit >= 0),
  max_deposit numeric(20, 2),
  daily_rate_pct numeric(12, 6),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  published boolean NOT NULL DEFAULT false,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id),
  plan_id text REFERENCES investment_plans(id),
  plan_snapshot jsonb NOT NULL,
  principal numeric(20, 2) NOT NULL CHECK (principal > 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  started_at timestamptz,
  matures_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS investments_user_created_idx ON investments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id),
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment', 'return', 'referral', 'adjustment')),
  amount numeric(20, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  method text,
  destination text,
  reference text UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'failed')),
  idempotency_key text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions(user_id, created_at DESC);

-- Immutable double-entry ledger: balance-affecting actions must be posted in SQL transactions.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id bigserial PRIMARY KEY,
  transaction_id text REFERENCES transactions(id),
  user_id text NOT NULL REFERENCES "user"(id),
  account_code text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount numeric(20, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  memo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_user_created_idx ON ledger_entries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS referrals (
  id text PRIMARY KEY,
  referrer_user_id text NOT NULL REFERENCES "user"(id),
  referred_user_id text NOT NULL UNIQUE REFERENCES "user"(id),
  referral_code text NOT NULL,
  reward_amount numeric(20, 2) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid', 'void')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS properties (
  id text PRIMARY KEY,
  title text NOT NULL,
  location text NOT NULL,
  asset_type text NOT NULL,
  target_yield_pct numeric(12, 6),
  minimum_entry numeric(20, 2),
  valuation numeric(20, 2),
  occupancy_pct numeric(8, 4),
  status text NOT NULL,
  image_url text,
  summary text NOT NULL DEFAULT '',
  supporting_document_url text,
  property_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Newsletter consent is stored separately from general contact inquiries.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON newsletter_subscribers(status);

-- Idempotency ledger for scheduled daily summaries; this never creates or accrues returns.
CREATE TABLE IF NOT EXISTS daily_roi_email_runs (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, report_date)
);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'not_submitted'
  CHECK (kyc_status IN ('not_submitted', 'pending', 'approved', 'rejected', 'needs_information'));

CREATE TABLE IF NOT EXISTS email_templates (
  event_type text PRIMARY KEY,
  subject text NOT NULL,
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_by text REFERENCES "user"(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  user_id text REFERENCES "user"(id),
  recipient text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- Idempotent storage for verified Resend email lifecycle events.
CREATE TABLE IF NOT EXISTS email_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  email_id text,
  recipient text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_webhook_events_received_idx ON email_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS email_webhook_events_email_id_idx ON email_webhook_events(email_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id text REFERENCES "user"(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);

 
-- Admin-issued payment instructions. This is separate from deposits and never credits balances.
CREATE TABLE IF NOT EXISTS manual_payment_assignments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  user_email text NOT NULL,
  customer_name text NOT NULL,
  method text NOT NULL CHECK (method IN ('USDT (TRC20)', 'Bitcoin (BTC)', 'Ethereum (ETH)', 'Bank Wire')),
  amount numeric(20, 2) NOT NULL CHECK (amount > 0),
  destination text NOT NULL,
  network text NOT NULL,
  reference text NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Assigned' CHECK (status = 'Assigned'),
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS manual_payment_assignments_reference_unique_idx
  ON manual_payment_assignments (user_id, method, lower(reference));
CREATE INDEX IF NOT EXISTS manual_payment_assignments_created_idx
  ON manual_payment_assignments (created_at DESC);

-- Administrator-managed receiving destinations shown consistently in customer payment flows.
CREATE TABLE IF NOT EXISTS platform_payment_wallets (
  method_id text PRIMARY KEY,
  label text NOT NULL,
  currency text NOT NULL,
  network text NOT NULL,
  wallet_address text NOT NULL DEFAULT '',
  min_deposit numeric(20, 2) NOT NULL DEFAULT 100 CHECK (min_deposit > 0),
  instructions text NOT NULL DEFAULT '',
  confirmation_info text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  updated_by text REFERENCES "user"(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_payment_wallets_enabled_idx
  ON platform_payment_wallets (enabled, method_id);


-- Idempotent per-investment daily ROI accrual ledger.
CREATE TABLE IF NOT EXISTS roi_accruals (
  id bigserial PRIMARY KEY,
  investment_id text NOT NULL REFERENCES investments(id) ON DELETE RESTRICT,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  accrual_date date NOT NULL,
  amount numeric(20, 2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  payout_transaction_id text REFERENCES transactions(id),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investment_id, accrual_date)
);
CREATE INDEX IF NOT EXISTS roi_accruals_unpaid_idx ON roi_accruals(investment_id, accrual_date) WHERE paid_at IS NULL;

-- Blocked / removed defaulters prevented from accessing the platform or re-registering.
CREATE TABLE IF NOT EXISTS blocked_users (
  id text PRIMARY KEY,
  user_id text UNIQUE,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  blocked_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blocked_users_email_idx ON blocked_users (lower(email));

