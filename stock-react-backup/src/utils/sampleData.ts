import { User, StockTransaction } from '../types';
import { StorageService } from '../services/storage';
import dayjs from 'dayjs';

// 示例用户数据
const sampleUsers: User[] = [
  {
    id: 'user1',
    name: '张三',
    phone: '13800138001',
    email: 'zhangsan@example.com',
    createTime: '2024-01-01 10:00:00',
  },
  {
    id: 'user2',
    name: '李四',
    phone: '13800138002',
    email: 'lisi@example.com',
    createTime: '2024-01-01 11:00:00',
  },
  {
    id: 'user3',
    name: '王五',
    phone: '13800138003',
    email: 'wangwu@example.com',
    createTime: '2024-01-01 12:00:00',
  },
];

// 示例交易数据
const sampleTransactions: StockTransaction[] = [
  {
    id: 'tx1',
    userId: 'user1',
    stockCode: '000001',
    stockName: '平安银行',
    type: 'buy',
    quantity: 1000,
    price: 12.50,
    totalAmount: 12500,
    commission: 37.5,
    stampDuty: 0,
    transferFee: 0.25,
    totalFees: 37.75,
    netAmount: 12537.75,
    transactionDate: '2024-01-15',
    notes: '张三买入平安银行',
    createTime: '2024-01-15 09:30:00',
  },
  {
    id: 'tx2',
    userId: 'user1',
    stockCode: '000001',
    stockName: '平安银行',
    type: 'sell',
    quantity: 500,
    price: 13.20,
    totalAmount: 6600,
    commission: 19.8,
    stampDuty: 6.6,
    transferFee: 0.132,
    totalFees: 26.532,
    netAmount: 6573.468,
    transactionDate: '2024-01-25',
    notes: '张三部分卖出平安银行',
    createTime: '2024-01-25 14:30:00',
  },
  {
    id: 'tx3',
    userId: 'user2',
    stockCode: '000002',
    stockName: '万科A',
    type: 'buy',
    quantity: 2000,
    price: 8.50,
    totalAmount: 17000,
    commission: 51,
    stampDuty: 0,
    transferFee: 0.34,
    totalFees: 51.34,
    netAmount: 17051.34,
    transactionDate: '2024-01-20',
    notes: '李四买入万科A',
    createTime: '2024-01-20 10:15:00',
  },
  {
    id: 'tx4',
    userId: 'user3',
    stockCode: '600519',
    stockName: '贵州茅台',
    type: 'buy',
    quantity: 100,
    price: 1680.00,
    totalAmount: 168000,
    commission: 504,
    stampDuty: 0,
    transferFee: 3.36,
    totalFees: 507.36,
    netAmount: 168507.36,
    transactionDate: '2024-01-18',
    notes: '王五买入贵州茅台',
    createTime: '2024-01-18 11:00:00',
  },
  {
    id: 'tx5',
    userId: 'user2',
    stockCode: '000002',
    stockName: '万科A',
    type: 'sell',
    quantity: 1000,
    price: 9.20,
    totalAmount: 9200,
    commission: 27.6,
    stampDuty: 9.2,
    transferFee: 0.184,
    totalFees: 36.984,
    netAmount: 9163.016,
    transactionDate: '2024-02-01',
    notes: '李四部分卖出万科A',
    createTime: '2024-02-01 13:45:00',
  },
];

export const loadSampleData = () => {
  // 检查是否已有数据
  const existingUsers = StorageService.getUsers();
  const existingTransactions = StorageService.getTransactions();
  
  if (existingUsers.length === 0 && existingTransactions.length === 0) {
    // 加载示例数据
    StorageService.saveUsers(sampleUsers);
    StorageService.saveTransactions(sampleTransactions);
    return true; // 表示加载了示例数据
  }
  
  return false; // 表示已有数据，未加载示例数据
};

export const clearAllData = () => {
  StorageService.saveUsers([]);
  StorageService.saveTransactions([]);
};

export const resetToSampleData = () => {
  clearAllData();
  StorageService.saveUsers(sampleUsers);
  StorageService.saveTransactions(sampleTransactions);
};

