import { User, StockTransaction } from '../types';

const STORAGE_KEYS = {
  USERS: 'stock_tracker_users',
  TRANSACTIONS: 'stock_tracker_transactions',
};

export class StorageService {
  // 用户管理
  static getUsers(): User[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  }

  static updateUser(userId: string, updatedUser: Partial<User>): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index > -1) {
      users[index] = { ...users[index], ...updatedUser };
      this.saveUsers(users);
    }
  }

  static deleteUser(userId: string): void {
    const users = this.getUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    this.saveUsers(filteredUsers);
  }

  // 交易记录管理
  static getTransactions(): StockTransaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  }

  static saveTransactions(transactions: StockTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static addTransaction(transaction: StockTransaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    this.saveTransactions(transactions);
  }

  static updateTransaction(transactionId: string, updatedTransaction: Partial<StockTransaction>): void {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === transactionId);
    if (index > -1) {
      transactions[index] = { ...transactions[index], ...updatedTransaction };
      this.saveTransactions(transactions);
    }
  }

  static deleteTransaction(transactionId: string): void {
    const transactions = this.getTransactions();
    const filteredTransactions = transactions.filter(t => t.id !== transactionId);
    this.saveTransactions(filteredTransactions);
  }

  static getTransactionsByUser(userId: string): StockTransaction[] {
    return this.getTransactions().filter(t => t.userId === userId);
  }

  static getTransactionsByStock(stockCode: string): StockTransaction[] {
    return this.getTransactions().filter(t => t.stockCode === stockCode);
  }
}
