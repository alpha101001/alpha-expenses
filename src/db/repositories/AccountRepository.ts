import { getDB } from '../index';
import * as Crypto from 'expo-crypto';

export type AccountType = 'cash' | 'bank' | 'mobile' | 'custom';

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
  static async getAccounts(householdId: string): Promise<Account[]> {
    const db = getDB();
    
    return await db.getAllAsync<Account>(
      'SELECT * FROM accounts WHERE household_id = ? AND deleted_at IS NULL ORDER BY name ASC',
      [householdId]
    );
  }
}
