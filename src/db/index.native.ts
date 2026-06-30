import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('alpha.db');

export function initDB() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_shared INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      item TEXT,
      category TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced INTEGER DEFAULT 0
    );
  `);
  
  // Seed default accounts if none exist
  const count = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM accounts');
  if (count && count.count === 0) {
    const now = new Date().toISOString();
    const defaultAccounts = [
      { id: 'acc_cash', name: 'Cash', type: 'cash' },
      { id: 'acc_bank', name: 'Bank', type: 'bank' },
      { id: 'acc_bkash', name: 'bKash', type: 'mfs' }
    ];
    
    for (const acc of defaultAccounts) {
      db.runSync(
        'INSERT INTO accounts (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [acc.id, acc.name, acc.type, now, now]
      );
    }
  }
}
