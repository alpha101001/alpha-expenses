-- 0001_alpha_core.sql

-- Enable pgcrypto for uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  UNIQUE(household_id, user_id)
);

CREATE TABLE household_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  primary_member_id UUID REFERENCES household_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'expense' or 'income'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE financial_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  month_str TEXT NOT NULL, -- 'YYYY-MM'
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  UNIQUE(household_id, month_str)
);

CREATE TABLE monthly_income_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  month_id UUID NOT NULL REFERENCES financial_months(id),
  expected_amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'expected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE income_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES monthly_income_plans(id),
  amount BIGINT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  amount BIGINT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  item TEXT,
  category_id UUID REFERENCES categories(id),
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE transaction_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  funding_pool TEXT NOT NULL,
  savings_goal_id UUID,
  amount BIGINT NOT NULL,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE processed_sync_operations (
  idempotency_key TEXT PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  device_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE sync_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_income_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_changes ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Households: users can see households they are members of
CREATE POLICY "Users can view households they belong to" ON households FOR SELECT USING (
  EXISTS (SELECT 1 FROM household_members WHERE household_id = households.id AND user_id = auth.uid() AND deleted_at IS NULL)
);

-- Members
CREATE POLICY "Users can view members of their households" ON household_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM household_members AS my_membership WHERE my_membership.household_id = household_members.household_id AND my_membership.user_id = auth.uid() AND my_membership.deleted_at IS NULL)
);

-- Accounts
CREATE POLICY "Users can view accounts in their households" ON accounts FOR SELECT USING (
  EXISTS (SELECT 1 FROM household_members WHERE household_id = accounts.household_id AND user_id = auth.uid() AND deleted_at IS NULL)
);

-- Transactions
CREATE POLICY "Users can view transactions in their households" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM household_members WHERE household_id = transactions.household_id AND user_id = auth.uid() AND deleted_at IS NULL)
);

-- Transaction Postings
CREATE POLICY "Users can view postings in their households" ON transaction_postings FOR SELECT USING (
  EXISTS (SELECT 1 FROM household_members WHERE household_id = transaction_postings.household_id AND user_id = auth.uid() AND deleted_at IS NULL)
);

-- Sync Changes
CREATE POLICY "Users can view changes in their households" ON sync_changes FOR SELECT USING (
  EXISTS (SELECT 1 FROM household_members WHERE household_id = sync_changes.household_id AND user_id = auth.uid() AND deleted_at IS NULL)
);

-- Audit
CREATE POLICY "Users can view audit events in their households" ON audit_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM household_members WHERE household_id = audit_events.household_id AND user_id = auth.uid() AND deleted_at IS NULL)
);

-- RPC Functions
CREATE OR REPLACE FUNCTION apply_sync_operation(
  p_idempotency_key TEXT,
  p_household_id UUID,
  p_device_id TEXT,
  p_entity_type TEXT,
  p_action TEXT,
  p_payload JSONB,
  p_base_version INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_member BOOLEAN;
  v_current_version INTEGER;
BEGIN
  -- Check membership
  SELECT EXISTS(SELECT 1 FROM household_members WHERE household_id = p_household_id AND user_id = v_user_id AND deleted_at IS NULL) INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this household';
  END IF;

  -- Check idempotency
  IF EXISTS(SELECT 1 FROM processed_sync_operations WHERE idempotency_key = p_idempotency_key) THEN
    RETURN '{"status": "already_processed"}';
  END IF;

  -- Record idempotency
  INSERT INTO processed_sync_operations (idempotency_key, household_id, user_id, device_id)
  VALUES (p_idempotency_key, p_household_id, v_user_id, p_device_id);

  -- Handle entity types and logic here in a real production system
  -- (e.g. check current version, update entity, bump version, insert into sync_changes, insert into audit_events)
  
  RETURN '{"status": "success"}';
END;
$$;
