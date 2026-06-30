import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { migrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync('db_encryption_key');
  if (!key) {
    // Generate a secure random key
    const bytes = await Crypto.getRandomBytesAsync(32);
    key = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync('db_encryption_key', key);
  }
  return key;
}

export async function initDB() {
  if (Platform.OS === 'web') {
    console.log('Skipping real SQLite DB on Web.');
    return;
  }
  try {
    // Open DB without WAL or Foreign Keys initially so we can set the key
    dbInstance = await SQLite.openDatabaseAsync('alpha.db');
    
    const key = await getEncryptionKey();
    
    // Immediately apply PRAGMA key
    await dbInstance.execAsync(`PRAGMA key = '${key}';`);
    
    // Verify encryption
    const version = await dbInstance.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
    if (!version || !version.cipher_version) {
      throw new Error('Failed to verify SQLCipher encryption.');
    }
    
    // Enable foreign keys and WAL
    await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
    
    await runMigrations(dbInstance);
    
    console.log('Database initialized successfully.');
  } catch (error) {
    dbInstance = null; // Ensure we don't return a half-initialized db
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  // Ensure migrations table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TEXT NOT NULL
    );
  `);
  
  const executedMigrations = await db.getAllAsync<{ id: number }>('SELECT id FROM schema_migrations');
  const executedIds = new Set(executedMigrations.map(m => m.id));
  
  for (const migration of migrations) {
    if (!executedIds.has(migration.id)) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.runAsync('INSERT INTO schema_migrations (id, name, executed_at) VALUES (?, ?, ?)', 
          [migration.id, migration.name, new Date().toISOString()]);
      });
      console.log(`Applied migration: ${migration.name}`);
    }
  }
}

export function getDB() {
  if (!dbInstance && Platform.OS !== 'web') {
    throw new Error('Database is not initialized.');
  }
  return dbInstance;
}

export async function closeDB() {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
