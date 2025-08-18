import { StockTransaction, UserProfit, StockPosition } from '../types';

export class CalculationService {
  // 计算交易费用
  static calculateTradingFees(amount: number, type: 'buy' | 'sell') {
    const commissionRate = 0.0003; // 佣金费率 0.03%
    const minCommission = 5; // 最低佣金5元
    const stampDutyRate = type === 'sell' ? 0.001 : 0; // 印花税，只有卖出时收取 0.1%
    const transferFeeRate = 0.00002; // 过户费 0.002%

    const commission = Math.max(amount * commissionRate, minCommission);
    const stampDuty = amount * stampDutyRate;
    const transferFee = amount * transferFeeRate;
    const totalFees = commission + stampDuty + transferFee;

    return {
      commission: Number(commission.toFixed(2)),
      stampDuty: Number(stampDuty.toFixed(2)),
      transferFee: Number(transferFee.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
    };
  }

  // 计算用户持仓
  static calculateUserPositions(transactions: StockTransaction[]): StockPosition[] {
    const positionMap = new Map<string, StockPosition>();

    transactions.forEach(transaction => {
      const key = `${transaction.userId}_${transaction.stockCode}`;
      const existing = positionMap.get(key);

      if (!existing) {
        positionMap.set(key, {
          userId: transaction.userId,
          stockCode: transaction.stockCode,
          stockName: transaction.stockName,
          totalQuantity: transaction.type === 'buy' ? transaction.quantity : -transaction.quantity,
          averagePrice: transaction.price,
          totalCost: transaction.type === 'buy' ? transaction.netAmount : -transaction.netAmount,
        });
      } else {
        if (transaction.type === 'buy') {
          const newTotalCost = existing.totalCost + transaction.netAmount;
          const newTotalQuantity = existing.totalQuantity + transaction.quantity;
          existing.averagePrice = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
          existing.totalQuantity = newTotalQuantity;
          existing.totalCost = newTotalCost;
        } else {
          existing.totalQuantity -= transaction.quantity;
          existing.totalCost -= transaction.quantity * existing.averagePrice;
        }
      }
    });

    return Array.from(positionMap.values()).filter(position => position.totalQuantity > 0);
  }

  // 计算用户盈利
  static calculateUserProfits(transactions: StockTransaction[], managementFeeRate: number = 0.1): UserProfit[] {
    const userMap = new Map<string, UserProfit>();

    transactions.forEach(transaction => {
      if (!userMap.has(transaction.userId)) {
        userMap.set(transaction.userId, {
          userId: transaction.userId,
          userName: '',
          totalInvestment: 0,
          totalReturn: 0,
          totalProfit: 0,
          profitRate: 0,
          managementFee: 0,
          netProfit: 0,
        });
      }

      const userProfit = userMap.get(transaction.userId)!;

      if (transaction.type === 'buy') {
        userProfit.totalInvestment += transaction.netAmount;
      } else {
        userProfit.totalReturn += transaction.netAmount;
      }
    });

    // 计算盈利和管理费
    userMap.forEach((userProfit, userId) => {
      userProfit.totalProfit = userProfit.totalReturn - userProfit.totalInvestment;
      userProfit.profitRate = userProfit.totalInvestment > 0 
        ? (userProfit.totalProfit / userProfit.totalInvestment) * 100 
        : 0;
      
      // 只有盈利时才收取管理费
      if (userProfit.totalProfit > 0) {
        userProfit.managementFee = userProfit.totalProfit * managementFeeRate;
        userProfit.netProfit = userProfit.totalProfit - userProfit.managementFee;
      } else {
        userProfit.managementFee = 0;
        userProfit.netProfit = userProfit.totalProfit;
      }
    });

    return Array.from(userMap.values());
  }

  // 计算总体统计
  static calculateOverallStats(transactions: StockTransaction[]) {
    const totalInvestment = transactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.netAmount, 0);

    const totalReturn = transactions
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + t.netAmount, 0);

    const totalFees = transactions.reduce((sum, t) => sum + t.totalFees, 0);
    const totalProfit = totalReturn - totalInvestment;
    const profitRate = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    return {
      totalInvestment: Number(totalInvestment.toFixed(2)),
      totalReturn: Number(totalReturn.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      profitRate: Number(profitRate.toFixed(2)),
      transactionCount: transactions.length,
    };
  }
}
