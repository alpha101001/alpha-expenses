import { getDB } from '../index';
import * as Crypto from 'expo-crypto';

export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund' | 'adjustment';
export type FundingPool = 'current_month' | 'general_savings' | 'savings_goal';

export interface Posting {
  account_id: string;
  funding_pool: FundingPool;
  savings_goal_id?: string;
  amount: number; // positive = credit (in), negative = debit (out)
}

export interface TransactionInput {
  household_id: string;
  type: TransactionType;
  status: 'completed' | 'planned';
  date: string;
  amount: number;
  item?: string;
  category_id?: string;
  vendor?: string;
  notes?: string;
  creator_id: string;
  postings: Posting[];
}

export interface TransactionRow {
  id: string;
  type: TransactionType;
  status: string;
  amount: number;
  date: string;
  item: string | null;
  category_id: string | null;
  notes: string | null;
}

export class TransactionRepository {
  static async recordTransaction(input: TransactionInput) {
    const db = getDB();
    
    // Invariants Check
    const totalPostings = input.postings.reduce((sum, p) => sum + p.amount, 0);
    
    if (input.type === 'transfer' && totalPostings !== 0) {
      throw new Error('Transfer postings must sum to zero');
    }
    
    if (input.type === 'expense') {
      if (input.postings.some(p => p.amount > 0)) {
        throw new Error('Expense postings should represent outflows (negative)');
      }
      if (Math.abs(totalPostings) !== input.amount) {
        throw new Error('Expense postings total must equal the expense amount');
      }
    }
    
    if (input.type === 'income') {
      if (input.postings.some(p => p.amount < 0)) {
        throw new Error('Income postings should represent inflows (positive)');
      }
      if (totalPostings !== input.amount) {
        throw new Error('Income postings total must equal the income amount');
      }
    }

    const txId = 'tx_' + Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Insert Transaction
      await db.runAsync(
        `INSERT INTO transactions (id, household_id, type, status, amount, date, item, category_id, vendor, notes, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [txId, input.household_id, input.type, input.status, input.amount, input.date, input.item || null, input.category_id || null, input.vendor || null, input.notes || null, now, input.creator_id, now, input.creator_id]
      );

      // 2. Insert Postings
      let seq = 0;
      for (const p of input.postings) {
        await db.runAsync(
          `INSERT INTO postings (id, household_id, transaction_id, account_id, funding_pool, savings_goal_id, amount, sequence, created_at, created_by, updated_at, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['post_' + Crypto.randomUUID(), input.household_id, txId, p.account_id, p.funding_pool, p.savings_goal_id || null, p.amount, seq++, now, input.creator_id, now, input.creator_id]
        );
      }

      // 3. Invariant Check (for physical accounts and funding pools)
      if (input.status === 'completed') {
        for (const p of input.postings) {
          if (p.amount < 0) {
            // Check physical account
            const accRes = await db.getFirstAsync<{balance: number}>(
              `SELECT SUM(amount) as balance FROM postings p
               JOIN transactions t ON p.transaction_id = t.id
               WHERE p.account_id = ? AND t.deleted_at IS NULL AND t.status = 'completed'`,
              [p.account_id]
            );
            if (accRes && accRes.balance < 0) {
              throw new Error(`Transaction would result in negative balance for account ${p.account_id}`);
            }
            
            // Check funding pool
            const poolRes = await db.getFirstAsync<{balance: number}>(
              `SELECT SUM(amount) as balance FROM postings p
               JOIN transactions t ON p.transaction_id = t.id
               WHERE p.household_id = ? AND p.funding_pool = ? AND t.deleted_at IS NULL AND t.status = 'completed'`,
              [input.household_id, p.funding_pool]
            );
            
            if (poolRes && poolRes.balance < 0) {
              throw new Error(`Transaction would result in negative balance for funding pool ${p.funding_pool}`);
            }
          }
        }
      }

      // 4. Outbox Insertion
      const outboxUuid = Crypto.randomUUID();
      const payload = JSON.stringify(input);
      await db.runAsync(
        `INSERT INTO outbox (uuid, household_id, operation_type, payload, base_version, device_id, user_id, idempotency_key, creation_timestamp, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [outboxUuid, input.household_id, `${input.type}.create`, payload, 1, 'local_device', input.creator_id, outboxUuid, now, 'pending']
      );
    });

    return txId;
  }

  static async calculateBalances(householdId: string) {
    const db = getDB();
    
    // Sum active completed postings by funding pool for the household
    const res = await db.getAllAsync<{ funding_pool: string, balance: number }>(
      `SELECT funding_pool, SUM(amount) as balance 
       FROM postings p 
       JOIN transactions t ON p.transaction_id = t.id 
       WHERE p.household_id = ? AND t.deleted_at IS NULL AND t.status = 'completed'
       GROUP BY funding_pool`,
      [householdId]
    );

    let remaining = 0;
    let generalSavings = 0;
    let savingsGoal = 0;

    for (const r of res) {
      if (r.funding_pool === 'current_month') remaining += r.balance;
      if (r.funding_pool === 'general_savings') generalSavings += r.balance;
      if (r.funding_pool === 'savings_goal') savingsGoal += r.balance;
    }

    // Spend calculation (Asia/Dhaka)
    const now = new Date();
    // A crude approximation of Dhaka time start of month without date-fns:
    const startOfMonth = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const spentRes = await db.getFirstAsync<{ spent: number }>(
      `SELECT SUM(amount) as spent 
       FROM transactions 
       WHERE household_id = ? AND type = 'expense' AND deleted_at IS NULL AND status = 'completed' AND date >= ?`,
      [householdId, startOfMonth.toISOString()]
    );

    return {
      remaining,
      totalSpent: spentRes?.spent || 0,
      generalSavings,
      totalMoney: remaining + generalSavings + savingsGoal
    };
  }

  static async getTransactions(householdId: string, limit = 50) {
    const db = getDB();
    
    return await db.getAllAsync<TransactionRow>(
      `SELECT id, type, status, amount, date, item, category_id, notes FROM transactions 
       WHERE household_id = ? AND deleted_at IS NULL 
       ORDER BY date DESC LIMIT ?`,
      [householdId, limit]
    );
  }
}
