// utils/calculation.js - 计算服务

class CalculationService {
  // 交易费用配置
  static FEE_CONFIG = {
    commissionRate: 0.0003,    // 佣金费率 0.03%
    minCommission: 5,          // 最低佣金 5元
    stampDutyRate: 0.001,      // 印花税 0.1%（卖出时收取）
    transferFeeRate: 0.00002   // 过户费 0.002%
  }

  // 计算交易费用
  static calculateTransactionFees(amount, type) {
    const fees = {
      commission: 0,
      stampDuty: 0,
      transferFee: 0,
      total: 0
    }

    // 佣金计算
    fees.commission = Math.max(amount * this.FEE_CONFIG.commissionRate, this.FEE_CONFIG.minCommission)
    
    // 过户费计算
    fees.transferFee = amount * this.FEE_CONFIG.transferFeeRate
    
    // 印花税（仅卖出时收取）
    if (type === 'sell') {
      fees.stampDuty = amount * this.FEE_CONFIG.stampDutyRate
    }
    
    // 总费用
    fees.total = fees.commission + fees.stampDuty + fees.transferFee
    
    return fees
  }

  // 计算用户持仓（包含费用）
  static calculateUserPositions(transactions) {
    const positionMap = new Map()
    
    transactions.forEach(transaction => {
      const key = `${transaction.userId}_${transaction.stockCode}`
      
      if (!positionMap.has(key)) {
        positionMap.set(key, {
          userId: transaction.userId,
          stockCode: transaction.stockCode,
          stockName: transaction.stockName,
          totalQuantity: 0,
          totalCost: 0,
          totalFees: 0,
          averagePrice: 0,
          averageCost: 0,
          currentPrice: null,
        })
      }
      
      const position = positionMap.get(key)
      const amount = transaction.quantity * transaction.price
      const fees = this.calculateTransactionFees(amount, transaction.type)
      
      if (transaction.type === 'buy') {
        // 买入：增加持仓，费用计入成本
        const totalCostWithFees = amount + fees.total
        const newTotalCost = position.totalCost + totalCostWithFees
        const newTotalQuantity = position.totalQuantity + transaction.quantity
        const newTotalFees = position.totalFees + fees.total
        
        position.totalCost = newTotalCost
        position.totalQuantity = newTotalQuantity
        position.totalFees = newTotalFees
        position.averagePrice = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0
        position.averageCost = position.averagePrice
      } else if (transaction.type === 'sell') {
        // 卖出：减少持仓，费用从收入中扣除
        position.totalQuantity -= transaction.quantity
        
        if (position.totalQuantity <= 0) {
          // 全部卖出，清除持仓
          positionMap.delete(key)
        } else {
          // 部分卖出，按比例减少成本
          const sellRatio = transaction.quantity / (position.totalQuantity + transaction.quantity)
          position.totalCost *= (1 - sellRatio)
          position.totalFees *= (1 - sellRatio)
          position.averagePrice = position.totalQuantity > 0 ? position.totalCost / position.totalQuantity : 0
          position.averageCost = position.averagePrice
        }
      }
    })
    
    return Array.from(positionMap.values()).filter(position => position.totalQuantity > 0)
  }
  
  // 计算用户收益（包含费用）
  static calculateUserProfits(transactions) {
    const userProfits = {}
    
    transactions.forEach(transaction => {
      if (!userProfits[transaction.userId]) {
        userProfits[transaction.userId] = {
          userId: transaction.userId,
          totalBuyAmount: 0,
          totalSellAmount: 0,
          totalBuyFees: 0,
          totalSellFees: 0,
          realizedPL: 0,
          netRealizedPL: 0,
          transactionCount: 0,
        }
      }
      
      const profit = userProfits[transaction.userId]
      profit.transactionCount++
      
      const amount = transaction.quantity * transaction.price
      const fees = this.calculateTransactionFees(amount, transaction.type)
      
      if (transaction.type === 'buy') {
        profit.totalBuyAmount += amount
        profit.totalBuyFees += fees.total
      } else if (transaction.type === 'sell') {
        profit.totalSellAmount += amount
        profit.totalSellFees += fees.total
      }
    })
    
    // 计算已实现盈亏
    Object.values(userProfits).forEach(profit => {
      const grossProfit = profit.totalSellAmount - profit.totalBuyAmount
      const totalFees = profit.totalBuyFees + profit.totalSellFees
      
      profit.realizedPL = grossProfit
      profit.netRealizedPL = grossProfit - totalFees
      profit.totalFees = totalFees
    })
    
    return Object.values(userProfits)
  }
  
  // 计算股票收益
  static calculateStockProfits(transactions) {
    const stockProfits = {}
    
    transactions.forEach(transaction => {
      const key = transaction.stockCode
      
      if (!stockProfits[key]) {
        stockProfits[key] = {
          stockCode: transaction.stockCode,
          stockName: transaction.stockName,
          totalBuyAmount: 0,
          totalSellAmount: 0,
          totalBuyQuantity: 0,
          totalSellQuantity: 0,
          averageBuyPrice: 0,
          averageSellPrice: 0,
          realizedPL: 0,
          transactionCount: 0,
        }
      }
      
      const profit = stockProfits[key]
      profit.transactionCount++
      
      const amount = transaction.totalAmount || transaction.quantity * transaction.price
      
      if (transaction.type === 'buy') {
        profit.totalBuyAmount += amount
        profit.totalBuyQuantity += transaction.quantity
        profit.averageBuyPrice = profit.totalBuyQuantity > 0 ? profit.totalBuyAmount / profit.totalBuyQuantity : 0
      } else if (transaction.type === 'sell') {
        profit.totalSellAmount += amount
        profit.totalSellQuantity += transaction.quantity
        profit.averageSellPrice = profit.totalSellQuantity > 0 ? profit.totalSellAmount / profit.totalSellQuantity : 0
      }
      
      profit.realizedPL = profit.totalSellAmount - profit.totalBuyAmount
    })
    
    return Object.values(stockProfits)
  }
  
  // 计算月度统计
  static calculateMonthlyStats(transactions) {
    const monthlyStats = {}
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          buyAmount: 0,
          sellAmount: 0,
          buyCount: 0,
          sellCount: 0,
          netAmount: 0,
        }
      }
      
      const stats = monthlyStats[monthKey]
      const amount = transaction.totalAmount || transaction.quantity * transaction.price
      
      if (transaction.type === 'buy') {
        stats.buyAmount += amount
        stats.buyCount++
      } else if (transaction.type === 'sell') {
        stats.sellAmount += amount
        stats.sellCount++
      }
      
      stats.netAmount = stats.sellAmount - stats.buyAmount
    })
    
    return Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month))
  }
  
  // 生成ID
  static generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  // 格式化货币
  static formatCurrency(amount, showSign = false) {
    const formatted = amount.toFixed(2)
    if (showSign && amount > 0) {
      return `+¥${formatted}`
    } else if (showSign && amount < 0) {
      return `-¥${Math.abs(amount).toFixed(2)}`
    }
    return `¥${formatted}`
  }
  
  // 格式化百分比
  static formatPercent(value, showSign = false) {
    const formatted = value.toFixed(2)
    if (showSign && value > 0) {
      return `+${formatted}%`
    } else if (showSign && value < 0) {
      return `${formatted}%`
    }
    return `${formatted}%`
  }
  
  // 计算收益率
  static calculateReturnRate(cost, currentValue) {
    if (cost <= 0) return 0
    return ((currentValue - cost) / cost) * 100
  }
}

module.exports = CalculationService
