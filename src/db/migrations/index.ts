export const migrations = [
  {
    id: 1,
    name: '0001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS household_members (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        user_id TEXT NOT NULL REFERENCES profiles(id),
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        token_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_shared INTEGER DEFAULT 1,
        primary_member_id TEXT REFERENCES household_members(id),
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS financial_months (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        month TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS monthly_income_plans (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        month_id TEXT NOT NULL REFERENCES financial_months(id),
        expected_amount INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        item TEXT,
        category_id TEXT REFERENCES categories(id),
        vendor TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS postings (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        transaction_id TEXT NOT NULL REFERENCES transactions(id),
        account_id TEXT NOT NULL REFERENCES accounts(id),
        funding_pool TEXT NOT NULL,
        savings_goal_id TEXT,
        amount INTEGER NOT NULL,
        sequence INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        deleted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS outbox (
        uuid TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        operation_type TEXT NOT NULL,
        payload JSON NOT NULL,
        base_version INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        creation_timestamp TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_timestamp TEXT,
        next_attempt_timestamp TEXT,
        last_error_code TEXT,
        last_redacted_error TEXT,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_cursors (
        household_id TEXT PRIMARY KEY REFERENCES households(id),
        last_sequence INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        base_version INTEGER NOT NULL,
        local_payload JSON NOT NULL,
        server_payload JSON NOT NULL,
        server_version INTEGER NOT NULL,
        detection_time TEXT NOT NULL,
        resolution_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tombstones (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        deleted_at TEXT NOT NULL,
        deleted_by TEXT NOT NULL,
        version INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_households_deleted ON households(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_accounts_household ON accounts(household_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions(household_id, date);
      CREATE INDEX IF NOT EXISTS idx_transactions_version ON transactions(version);
      CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status);
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_state ON sync_conflicts(resolution_state);
    `
  }
];
