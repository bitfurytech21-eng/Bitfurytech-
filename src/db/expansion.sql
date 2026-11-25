-- BitfuryTech Neon PostgreSQL Expansion
-- Additive, idempotent migration covering crypto_wallets, persistent support threads,
-- per-user broadcast read tracking, referral codes, and expanded Better Auth user provisioning.

CREATE TABLE IF NOT EXISTS crypto_wallets (
  id text PRIMARY KEY,
  cryptocurrency text NOT NULL,
  blockchain_network text NOT NULL,
  wallet_address text NOT NULL,
  wallet_label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Maintenance')),
  min_deposit numeric(20, 2) NOT NULL DEFAULT 100 CHECK (min_deposit >= 0),
  max_deposit numeric(20, 2) NOT NULL DEFAULT 10000000 CHECK (max_deposit >= min_deposit),
  instructions text NOT NULL DEFAULT '',
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crypto_wallets_status_idx ON crypto_wallets(status, cryptocurrency);

CREATE TABLE IF NOT EXISTS support_threads (
  id text PRIMARY KEY,
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  visitor_name text NOT NULL,
  visitor_email text NOT NULL,
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
  channel text NOT NULL DEFAULT 'live-websocket' CHECK (channel IN ('twilio-conversations', 'live-websocket')),
  twilio_conversation_sid text,
  twilio_participant_identity text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS support_threads_user_idx ON support_threads(user_id, status);
CREATE INDEX IF NOT EXISTS support_threads_last_msg_idx ON support_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id text PRIMARY KEY,
  thread_id text NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('client', 'agent', 'system')),
  sender_name text NOT NULL,
  body text NOT NULL,
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'twilio')),
  twilio_message_sid text,
  client_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_thread_created_idx ON support_messages(thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id text NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
CREATE INDEX IF NOT EXISTS notification_reads_user_idx ON notification_reads(user_id, read_at DESC);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_referral_code_idx
  ON user_profiles (upper(referral_code))
  WHERE referral_code IS NOT NULL;

-- Backfill missing usernames, referral codes, and USD wallets for existing Better Auth accounts.
INSERT INTO user_profiles (user_id, username, referral_code)
SELECT u.id,
       NULLIF(lower(btrim(COALESCE(u.username, ''))), ''),
       'BF-' || upper(left(u.id, 8))
FROM "user" u
WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.id)
ON CONFLICT DO NOTHING;

UPDATE user_profiles p
SET username = COALESCE(p.username, NULLIF(lower(btrim(COALESCE(u.username, ''))), '')),
    referral_code = COALESCE(p.referral_code, 'BF-' || upper(left(u.id, 8))),
    updated_at = now()
FROM "user" u
WHERE u.id = p.user_id
  AND (
    (p.username IS NULL AND NULLIF(lower(btrim(COALESCE(u.username, ''))), '') IS NOT NULL)
    OR p.referral_code IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles other
    WHERE other.user_id <> p.user_id
      AND upper(other.referral_code) = upper('BF-' || left(u.id, 8))
  );

INSERT INTO wallets (user_id, currency)
SELECT u.id, 'USD'
FROM "user" u
ON CONFLICT (user_id, currency) DO NOTHING;

-- Expanded user provisioning trigger: creates profile, username, referral code, role, and USD wallet.
CREATE OR REPLACE FUNCTION bitfurytech_provision_user()
RETURNS trigger AS $$
DECLARE
  v_username text;
  v_ref_code text;
BEGIN
  v_username := NULLIF(lower(btrim(COALESCE(NEW.username, ''))), '');
  v_ref_code := 'BF-' || upper(left(NEW.id, 8));

  BEGIN
    INSERT INTO user_profiles (user_id, username, referral_code)
    VALUES (NEW.id, v_username, v_ref_code)
    ON CONFLICT (user_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, user_profiles.username),
      referral_code = COALESCE(user_profiles.referral_code, EXCLUDED.referral_code),
      updated_at = now();
  EXCEPTION WHEN unique_violation THEN
    v_ref_code := 'BF-' || upper(substr(md5(NEW.id || clock_timestamp()::text), 1, 8));
    INSERT INTO user_profiles (user_id, username, referral_code)
    VALUES (NEW.id, NULL, v_ref_code)
    ON CONFLICT (user_id) DO NOTHING;
  END;

  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'investor')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO wallets (user_id, currency)
  VALUES (NEW.id, 'USD')
  ON CONFLICT (user_id, currency) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bitfurytech_user_provision_after_insert ON "user";
CREATE TRIGGER bitfurytech_user_provision_after_insert
AFTER INSERT ON "user"
FOR EACH ROW EXECUTE FUNCTION bitfurytech_provision_user();
