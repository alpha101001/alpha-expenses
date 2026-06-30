import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { schema } from './schema';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getEncryptionKey() {
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
    // Use SQLCipher via expo-sqlite options when requested in app.json
    dbInstance = await SQLite.openDatabaseAsync('alpha.db');
    const key = await getEncryptionKey();
    await dbInstance.execAsync(`PRAGMA key = '${key}';`);
    
    // Execute schema migrations
    await dbInstance.execAsync(schema);
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

export function getDB() {
  return dbInstance;
}
