export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createTime: string;
}

export interface StockTransaction {
  id: string;
  userId: string;
  stockCode: string;
  stockName: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  commission: number; // 手续费
  stampDuty: number; // 印花税
  transferFee: number; // 过户费
  totalFees: number; // 总费用
  netAmount: number; // 净金额
  transactionDate: string;
  notes?: string;
  createTime: string;
}

export interface UserProfit {
  userId: string;
  userName: string;
  totalInvestment: number; // 总投入
  totalReturn: number; // 总回报
  totalProfit: number; // 总盈利
  profitRate: number; // 盈利率
  managementFee: number; // 管理费
  netProfit: number; // 净盈利
}

export interface StockPosition {
  userId: string;
  stockCode: string;
  stockName: string;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
}
