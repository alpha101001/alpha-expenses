-- supabase/migrations/0002_core_reliability.sql

-- 1. Helper function for RLS to avoid recursion
CREATE OR REPLACE FUNCTION private.is_active_household_member(household_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = household_uuid
    AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_household_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_active_household_member(UUID) TO authenticated;

-- 2. Drop existing household_members policy and replace with the helper
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
CREATE POLICY "Members can view household members" 
ON public.household_members FOR SELECT 
TO authenticated 
USING (private.is_active_household_member(household_id));

-- Additional tables to apply policies to:
-- Households
DROP POLICY IF EXISTS "Users can view their households" ON public.households;
CREATE POLICY "Users can view their households" 
ON public.households FOR SELECT 
TO authenticated 
USING (private.is_active_household_member(id));

-- Invitations
CREATE POLICY "Members can view invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Accounts
DROP POLICY IF EXISTS "Members can view accounts" ON public.accounts;
CREATE POLICY "Members can view accounts"
ON public.accounts FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Categories
CREATE POLICY "Members can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Financial Months
CREATE POLICY "Members can view financial months"
ON public.financial_months FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Monthly Income Plans
CREATE POLICY "Members can view monthly income plans"
ON public.monthly_income_plans FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Transactions
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
CREATE POLICY "Members can view transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Postings
DROP POLICY IF EXISTS "Members can view postings" ON public.postings;
CREATE POLICY "Members can view postings"
ON public.postings FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Audit Events
CREATE POLICY "Members can view audit events"
ON public.audit_events FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Outbox operations / Sync changes (Assuming sync_changes exists from earlier)
-- Wait, we need to create processed_sync_operations and sync_changes first

CREATE TABLE IF NOT EXISTS public.processed_sync_operations (
  idempotency_key TEXT PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  device_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canonical_result JSONB NOT NULL
);

ALTER TABLE public.processed_sync_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view processed operations"
ON public.processed_sync_operations FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

CREATE TABLE IF NOT EXISTS public.sync_changes (
  sequence BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sync_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view sync changes"
ON public.sync_changes FOR SELECT
TO authenticated
USING (private.is_active_household_member(household_id));

-- Ensure Auth profiles are provisioned
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'User'), new.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC for creating a household atomically
CREATE OR REPLACE FUNCTION public.create_household(household_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_hh_id UUID := gen_random_uuid();
  user_id UUID := auth.uid();
  cash_id UUID := gen_random_uuid();
  bank_id UUID := gen_random_uuid();
  bkash_id UUID := gen_random_uuid();
  month_id UUID := gen_random_uuid();
  current_month_str TEXT := to_char(now() AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM');
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create household
  INSERT INTO public.households (id, name, created_by, updated_by)
  VALUES (new_hh_id, household_name, user_id, user_id);

  -- Create active membership
  INSERT INTO public.household_members (id, household_id, user_id, role, created_by, updated_by)
  VALUES (gen_random_uuid(), new_hh_id, user_id, 'admin', user_id, user_id);

  -- Create default accounts
  INSERT INTO public.accounts (id, household_id, name, type, created_by, updated_by)
  VALUES 
    (cash_id, new_hh_id, 'Cash', 'cash', user_id, user_id),
    (bank_id, new_hh_id, 'Bank', 'bank', user_id, user_id),
    (bkash_id, new_hh_id, 'bKash', 'mobile', user_id, user_id);

  -- Create current financial month
  INSERT INTO public.financial_months (id, household_id, month, status, created_by, updated_by)
  VALUES (month_id, new_hh_id, current_month_str, 'open', user_id, user_id);

  -- Audit event
  INSERT INTO public.audit_events (id, household_id, entity_type, entity_id, action, payload, created_by)
  VALUES (gen_random_uuid(), new_hh_id, 'household', new_hh_id::text, 'create', jsonb_build_object('name', household_name), user_id);

  -- Return bootstrap payload
  RETURN jsonb_build_object(
    'household', (SELECT row_to_json(h) FROM public.households h WHERE id = new_hh_id),
    'membership', (SELECT row_to_json(m) FROM public.household_members m WHERE household_id = new_hh_id AND user_id = auth.uid()),
    'accounts', (SELECT json_agg(row_to_json(a)) FROM public.accounts a WHERE household_id = new_hh_id),
    'financial_month', (SELECT row_to_json(f) FROM public.financial_months f WHERE id = month_id)
  );
END;
$$;
