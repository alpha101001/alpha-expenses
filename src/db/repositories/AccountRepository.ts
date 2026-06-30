import { getDB } from '../index';
import * as Crypto from 'expo-crypto';

export type AccountType = 'cash' | 'bank' | 'mfs' | 'custom';

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  is_shared: boolean;
  primary_member_id?: string;
  created_at: string;
  updated_at: string;
}

export class AccountRepository {
  static async getAccounts(): Promise<Account[]> {
    const db = getDB();
    if (!db) return [];
    
    return await db.getAllAsync<Account>('SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY name ASC');
  }
  
  static async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const db = getDB();
    if (!db) throw new Error('DB not initialized');
    
    const id = 'acc_' + Crypto.randomUUID();
    const now = new Date().toISOString();
    
    await db.runAsync(
      `INSERT INTO accounts (id, household_id, name, type, is_shared, primary_member_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account.household_id, account.name, account.type, account.is_shared ? 1 : 0, account.primary_member_id || null, now, now]
    );
    
    return { ...account, id, created_at: now, updated_at: now };
  }
}
