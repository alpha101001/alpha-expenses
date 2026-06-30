import { getDB } from './src/db';
import { TransactionRepository, TransactionInput } from './src/db/repositories/TransactionRepository';

// Mock DB
jest.mock('./src/db', () => ({
  getDB: jest.fn()
}));

describe('TransactionRepository', () => {
  it('should reject expenses with positive posting amounts', async () => {
    const mockDb = {
      withTransactionAsync: jest.fn(cb => cb()),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn().mockResolvedValue({ balance: 100 })
    };
    (getDB as jest.Mock).mockReturnValue(mockDb);

    const tx: TransactionInput = {
      household_id: 'hh1',
      type: 'expense',
      status: 'completed',
      date: new Date().toISOString(),
      amount: 1000,
      creator_id: 'user1',
      postings: [
        { account_id: 'acc1', funding_pool: 'current_month', amount: 1000 } // Should be negative
      ]
    };

    await expect(TransactionRepository.recordTransaction(tx)).rejects.toThrow('Expense postings should represent outflows (negative)');
  });
});
