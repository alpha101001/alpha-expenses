export const schema = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_shared INTEGER DEFAULT 1,
    primary_member_id TEXT REFERENCES members(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id),
    name TEXT NOT NULL,
    target_amount INTEGER NOT NULL,
    target_date TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    item TEXT,
    category TEXT,
    vendor TEXT,
    notes TEXT,
    creator_id TEXT NOT NULL REFERENCES members(id),
    editor_id TEXT REFERENCES members(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS postings (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    account_id TEXT NOT NULL REFERENCES accounts(id),
    funding_pool TEXT NOT NULL,
    savings_goal_id TEXT REFERENCES savings_goals(id),
    amount INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grocery_lines (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    line_total INTEGER NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS outbox (
    uuid TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT NOT NULL,
    base_version INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    idempotency_key TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_cursors (
    household_id TEXT PRIMARY KEY,
    last_synced_at TEXT NOT NULL
  );
`;
