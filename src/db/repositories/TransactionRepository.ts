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
  category?: string;
  vendor?: string;
  notes?: string;
  creator_id: string;
  postings: Posting[];
}

export class TransactionRepository {
  static async recordTransaction(input: TransactionInput) {
    const db = getDB();
    if (!db) throw new Error('DB not initialized');
    
    // Invariants Check
    const totalPostings = input.postings.reduce((sum, p) => sum + p.amount, 0);
    
    // Transfers must sum to zero
    if (input.type === 'transfer' && totalPostings !== 0) {
      throw new Error('Transfer postings must sum to zero');
    }
    
    // Expenses must result in negative net posting if money is leaving the household
    // Or we just rely on standard double-entry logic: each posting reflects the effect on the specific physical account/pool.
    // Actually, in an append-only ledger representing external cash flow, an expense is a debit to a physical account.
    // So the postings amount for an expense should be negative.
    
    if (input.type === 'expense' && input.postings.some(p => p.amount > 0)) {
      throw new Error('Expense postings should represent outflows (negative)');
    }
    if (input.type === 'income' && input.postings.some(p => p.amount < 0)) {
      throw new Error('Income postings should represent inflows (positive)');
    }

    const txId = 'tx_' + Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Insert Transaction
      await db.runAsync(
        `INSERT INTO transactions (id, household_id, type, status, amount, date, item, category, vendor, notes, creator_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [txId, input.household_id, input.type, input.status, input.amount, input.date, input.item || null, input.category || null, input.vendor || null, input.notes || null, input.creator_id, now, now]
      );

      // 2. Insert Postings
      let seq = 0;
      for (const p of input.postings) {
        await db.runAsync(
          `INSERT INTO postings (id, transaction_id, account_id, funding_pool, savings_goal_id, amount, sequence, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['post_' + Crypto.randomUUID(), txId, p.account_id, p.funding_pool, p.savings_goal_id || null, p.amount, seq++, now]
        );
      }

      // 3. Negative Balance Invariant Check (for physical accounts)
      for (const p of input.postings) {
        if (p.amount < 0) {
          const res = await db.getFirstAsync<{balance: number}>(
            `SELECT SUM(amount) as balance FROM postings WHERE account_id = ?`,
            [p.account_id]
          );
          if (res && res.balance < 0) {
            throw new Error(`Transaction would result in negative balance for account ${p.account_id}`);
          }
        }
      }
    });

    return txId;
  }

  static async calculateBalances(householdId: string) {
    const db = getDB();
    if (!db) return { remaining: 0, totalSpent: 0, generalSavings: 0, totalMoney: 0 };

    const res = await db.getAllAsync<{ funding_pool: string, balance: number }>(
      `SELECT funding_pool, SUM(amount) as balance 
       FROM postings p 
       JOIN transactions t ON p.transaction_id = t.id 
       WHERE t.household_id = ? AND t.deleted_at IS NULL
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

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const spentRes = await db.getFirstAsync<{ spent: number }>(
      `SELECT SUM(amount) as spent 
       FROM transactions 
       WHERE household_id = ? AND type = 'expense' AND deleted_at IS NULL AND date >= ?`,
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
    if (!db) return [];

    return await db.getAllAsync<any>(
      `SELECT * FROM transactions 
       WHERE household_id = ? AND deleted_at IS NULL 
       ORDER BY date DESC LIMIT ?`,
      [householdId, limit]
    );
  }
}
