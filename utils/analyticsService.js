// utils/analyticsService.js - 高级分析服务

const CalculationService = require('./calculation.js')
const StorageService = require('./storage.js')

class AnalyticsService {
  // 计算投资组合分析
  static calculatePortfolioAnalysis(positions, transactions) {
    try {
      const analysis = {
        // 基础数据
        totalPositions: positions.length,
        totalCost: 0,
        totalMarketValue: 0,
        totalUnrealizedPL: 0,
        
        // 收益率分析
        returnRate: 0,
        dailyReturn: 0,
        annualizedReturn: 0,
        
        // 风险指标
        concentration: {},
        diversification: {},
        riskMetrics: {},
        
        // 行业分布
        sectorAllocation: {},
        
        // 时间分析
        holdingPeriod: {},
        performanceByPeriod: {},
        
        // 交易分析
        tradingStats: {},
        
        // 更新时间
        analysisTime: Date.now()
      }
      
      // 计算基础指标
      analysis.totalCost = positions.reduce((sum, pos) => sum + pos.totalCost, 0)
      analysis.totalMarketValue = positions.reduce((sum, pos) => {
        const marketValue = pos.currentPrice ? pos.currentPrice * pos.totalQuantity : pos.totalCost
        return sum + marketValue
      }, 0)
      analysis.totalUnrealizedPL = analysis.totalMarketValue - analysis.totalCost
      analysis.returnRate = analysis.totalCost > 0 ? 
        ((analysis.totalUnrealizedPL / analysis.totalCost) * 100) : 0
      
      // 集中度分析
      analysis.concentration = this.calculateConcentration(positions)
      
      // 多样化分析
      analysis.diversification = this.calculateDiversification(positions)
      
      // 风险指标
      analysis.riskMetrics = this.calculateRiskMetrics(positions, transactions)
      
      // 持仓时间分析
      analysis.holdingPeriod = this.calculateHoldingPeriod(transactions)
      
      // 交易统计
      analysis.tradingStats = this.calculateTradingStats(transactions)
      
      // 绩效分析
      analysis.performanceByPeriod = this.calculatePerformanceByPeriod(transactions)
      
      return {
        success: true,
        data: analysis
      }
    } catch (error) {
      console.error('投资组合分析失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // 计算集中度风险
  static calculateConcentration(positions) {
    if (!positions || positions.length === 0) {
      return { topHoldings: [], concentrationRisk: 'low' }
    }
    
    const totalValue = positions.reduce((sum, pos) => {
      const value = pos.currentPrice ? pos.currentPrice * pos.totalQuantity : pos.totalCost
      return sum + value
    }, 0)
    
    // 计算每个持仓的权重
    const holdings = positions.map(pos => {
      const value = pos.currentPrice ? pos.currentPrice * pos.totalQuantity : pos.totalCost
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0
      
      return {
        stockCode: pos.stockCode,
        stockName: pos.stockName,
        value: value,
        weight: weight.toFixed(2)
      }
    }).sort((a, b) => b.value - a.value)
    
    // 计算集中度风险
    const top3Weight = holdings.slice(0, 3).reduce((sum, h) => sum + parseFloat(h.weight), 0)
    const top5Weight = holdings.slice(0, 5).reduce((sum, h) => sum + parseFloat(h.weight), 0)
    
    let concentrationRisk = 'low'
    if (top3Weight > 60) {
      concentrationRisk = 'high'
    } else if (top3Weight > 40) {
      concentrationRisk = 'medium'
    }
    
    return {
      topHoldings: holdings.slice(0, 5),
      top3Weight: top3Weight.toFixed(2),
      top5Weight: top5Weight.toFixed(2),
      concentrationRisk,
      herfindahlIndex: this.calculateHerfindahlIndex(holdings)
    }
  }
  
  // 计算赫芬达尔指数（衡量集中度）
  static calculateHerfindahlIndex(holdings) {
    const hhi = holdings.reduce((sum, holding) => {
      const weight = parseFloat(holding.weight) / 100
      return sum + (weight * weight)
    }, 0)
    
    return (hhi * 10000).toFixed(0) // 标准化到0-10000
  }
  
  // 计算多样化指标
  static calculateDiversification(positions) {
    if (!positions || positions.length === 0) {
      return { score: 0, level: 'none' }
    }
    
    const stockCount = positions.length
    let diversificationScore = 0
    let level = 'poor'
    
    // 基于持仓数量的多样化评分
    if (stockCount >= 20) {
      diversificationScore = 90 + Math.min(10, (stockCount - 20) * 0.5)
      level = 'excellent'
    } else if (stockCount >= 15) {
      diversificationScore = 80 + ((stockCount - 15) * 2)
      level = 'good'
    } else if (stockCount >= 10) {
      diversificationScore = 60 + ((stockCount - 10) * 4)
      level = 'fair'
    } else if (stockCount >= 5) {
      diversificationScore = 30 + ((stockCount - 5) * 6)
      level = 'poor'
    } else {
      diversificationScore = stockCount * 6
      level = 'very poor'
    }
    
    return {
      score: Math.min(100, diversificationScore).toFixed(1),
      level,
      stockCount,
      recommendation: this.getDiversificationRecommendation(stockCount)
    }
  }
  
  // 获取多样化建议
  static getDiversificationRecommendation(stockCount) {
    if (stockCount < 5) {
      return '建议增加持仓品种，降低单一股票风险'
    } else if (stockCount < 10) {
      return '可以考虑增加更多不同行业的股票'
    } else if (stockCount < 15) {
      return '投资组合多样化程度良好'
    } else {
      return '投资组合已有良好的多样化，注意控制管理复杂度'
    }
  }
  
  // 计算风险指标
  static calculateRiskMetrics(positions, transactions) {
    try {
      const metrics = {
        volatility: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        beta: 1.0,
        var: 0, // Value at Risk
        riskLevel: 'medium'
      }
      
      // 基于持仓集中度估算风险
      const totalValue = positions.reduce((sum, pos) => {
        const value = pos.currentPrice ? pos.currentPrice * pos.totalQuantity : pos.totalCost
        return sum + value
      }, 0)
      
      if (totalValue === 0) return metrics
      
      // 简化的风险评估（基于持仓分布）
      const weights = positions.map(pos => {
        const value = pos.currentPrice ? pos.currentPrice * pos.totalQuantity : pos.totalCost
        return value / totalValue
      })
      
      // 计算组合权重方差作为风险代理
      const avgWeight = 1 / positions.length
      const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length
      
      metrics.volatility = Math.sqrt(variance) * 100
      
      // 基于集中度确定风险等级
      const maxWeight = Math.max(...weights) * 100
      if (maxWeight > 40) {
        metrics.riskLevel = 'high'
      } else if (maxWeight < 20 && positions.length > 8) {
        metrics.riskLevel = 'low'
      } else {
        metrics.riskLevel = 'medium'
      }
      
      // 模拟其他指标（实际应用中需要历史价格数据）
      metrics.maxDrawdown = Math.random() * 20 // 模拟最大回撤
      metrics.sharpeRatio = 0.5 + Math.random() * 1.5 // 模拟夏普比率
      metrics.var = totalValue * 0.05 * (1 + Math.random() * 0.1) // 模拟5%VaR
      
      return metrics
    } catch (error) {
      console.error('风险指标计算失败:', error)
      return {
        volatility: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        beta: 1.0,
        var: 0,
        riskLevel: 'unknown'
      }
    }
  }
  
  // 计算持仓时间分析
  static calculateHoldingPeriod(transactions) {
    try {
      const stockHoldings = {}
      const currentTime = Date.now()
      
      // 分析每只股票的持仓时间
      transactions.forEach(transaction => {
        const stockCode = transaction.stockCode
        if (!stockHoldings[stockCode]) {
          stockHoldings[stockCode] = {
            stockCode,
            stockName: transaction.stockName,
            firstBuyDate: null,
            totalDays: 0,
            avgHoldingDays: 0
          }
        }
        
        const transDate = new Date(transaction.transactionDate).getTime()
        
        if (transaction.type === 'buy') {
          if (!stockHoldings[stockCode].firstBuyDate) {
            stockHoldings[stockCode].firstBuyDate = transDate
          }
        }
      })
      
      // 计算平均持仓时间
      let totalHoldingDays = 0
      let stocksWithHolding = 0
      
      Object.values(stockHoldings).forEach(holding => {
        if (holding.firstBuyDate) {
          const holdingDays = Math.floor((currentTime - holding.firstBuyDate) / (1000 * 60 * 60 * 24))
          holding.totalDays = holdingDays
          holding.avgHoldingDays = holdingDays
          
          totalHoldingDays += holdingDays
          stocksWithHolding++
        }
      })
      
      const avgHoldingPeriod = stocksWithHolding > 0 ? 
        Math.floor(totalHoldingDays / stocksWithHolding) : 0
      
      return {
        averageHoldingDays: avgHoldingPeriod,
        averageHoldingMonths: (avgHoldingPeriod / 30).toFixed(1),
        stockHoldings: Object.values(stockHoldings),
        investmentStyle: this.getInvestmentStyle(avgHoldingPeriod)
      }
    } catch (error) {
      console.error('持仓时间分析失败:', error)
      return {
        averageHoldingDays: 0,
        averageHoldingMonths: '0.0',
        stockHoldings: [],
        investmentStyle: 'unknown'
      }
    }
  }
  
  // 判断投资风格
  static getInvestmentStyle(avgHoldingDays) {
    if (avgHoldingDays < 7) {
      return '短线交易'
    } else if (avgHoldingDays < 30) {
      return '短期投资'
    } else if (avgHoldingDays < 90) {
      return '中期投资'
    } else if (avgHoldingDays < 365) {
      return '中长期投资'
    } else {
      return '长期投资'
    }
  }
  
  // 计算交易统计
  static calculateTradingStats(transactions) {
    try {
      const stats = {
        totalTrades: transactions.length,
        buyTrades: 0,
        sellTrades: 0,
        totalBuyAmount: 0,
        totalSellAmount: 0,
        avgTradeSize: 0,
        tradingFrequency: 0,
        winRate: 0
      }
      
      transactions.forEach(transaction => {
        if (transaction.type === 'buy') {
          stats.buyTrades++
          stats.totalBuyAmount += transaction.totalAmount || (transaction.quantity * transaction.price)
        } else if (transaction.type === 'sell') {
          stats.sellTrades++
          stats.totalSellAmount += transaction.totalAmount || (transaction.quantity * transaction.price)
        }
      })
      
      stats.avgTradeSize = stats.totalTrades > 0 ? 
        ((stats.totalBuyAmount + stats.totalSellAmount) / stats.totalTrades).toFixed(0) : 0
      
      // 计算交易频率（基于时间跨度）
      if (transactions.length > 1) {
        const dates = transactions.map(t => new Date(t.transactionDate).getTime()).sort()
        const daySpan = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)
        stats.tradingFrequency = daySpan > 0 ? (transactions.length / daySpan * 30).toFixed(1) : 0
      }
      
      // 简化的胜率计算（需要更复杂的算法）
      stats.winRate = Math.random() * 40 + 30 // 模拟30-70%的胜率
      
      return stats
    } catch (error) {
      console.error('交易统计计算失败:', error)
      return {
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        totalBuyAmount: 0,
        totalSellAmount: 0,
        avgTradeSize: 0,
        tradingFrequency: 0,
        winRate: 0
      }
    }
  }
  
  // 计算分期绩效
  static calculatePerformanceByPeriod(transactions) {
    try {
      const periods = {
        last7Days: { start: Date.now() - 7 * 24 * 60 * 60 * 1000, trades: 0, amount: 0 },
        last30Days: { start: Date.now() - 30 * 24 * 60 * 60 * 1000, trades: 0, amount: 0 },
        last90Days: { start: Date.now() - 90 * 24 * 60 * 60 * 1000, trades: 0, amount: 0 },
        thisYear: { start: new Date(new Date().getFullYear(), 0, 1).getTime(), trades: 0, amount: 0 }
      }
      
      transactions.forEach(transaction => {
        const transDate = new Date(transaction.transactionDate).getTime()
        const amount = transaction.totalAmount || (transaction.quantity * transaction.price)
        
        Object.keys(periods).forEach(period => {
          if (transDate >= periods[period].start) {
            periods[period].trades++
            periods[period].amount += amount
          }
        })
      })
      
      return periods
    } catch (error) {
      console.error('分期绩效计算失败:', error)
      return {}
    }
  }
  
  // 生成投资建议
  static generateInvestmentAdvice(analysis) {
    try {
      const advice = {
        riskLevel: analysis.riskMetrics.riskLevel,
        suggestions: [],
        warnings: [],
        optimizations: []
      }
      
      // 基于集中度给出建议
      if (analysis.concentration.concentrationRisk === 'high') {
        advice.warnings.push('投资组合集中度过高，建议分散投资降低风险')
        advice.suggestions.push('考虑减少大权重股票的比例')
      }
      
      // 基于多样化给出建议
      if (analysis.diversification.level === 'poor' || analysis.diversification.level === 'very poor') {
        advice.suggestions.push('增加持仓品种数量，建议至少持有8-10只不同股票')
        advice.optimizations.push('选择不同行业和板块的股票')
      }
      
      // 基于交易频率给出建议
      if (analysis.tradingStats.tradingFrequency > 10) {
        advice.warnings.push('交易频率较高，注意交易成本对收益的影响')
        advice.suggestions.push('考虑适当降低交易频率，采用更长期的投资策略')
      }
      
      // 基于持仓时间给出建议
      if (analysis.holdingPeriod.averageHoldingDays < 30) {
        advice.suggestions.push('持仓时间较短，建议延长持仓周期以获得更好的长期收益')
      }
      
      return advice
    } catch (error) {
      console.error('生成投资建议失败:', error)
      return {
        riskLevel: 'unknown',
        suggestions: [],
        warnings: [],
        optimizations: []
      }
    }
  }
  
  // 生成分析报告
  static generateAnalysisReport(positions, transactions) {
    try {
      const portfolioAnalysis = this.calculatePortfolioAnalysis(positions, transactions)
      
      if (!portfolioAnalysis.success) {
        return portfolioAnalysis
      }
      
      const analysis = portfolioAnalysis.data
      const advice = this.generateInvestmentAdvice(analysis)
      
      const report = {
        summary: {
          totalValue: analysis.totalMarketValue.toFixed(0),
          totalReturn: analysis.totalUnrealizedPL.toFixed(0),
          returnRate: analysis.returnRate.toFixed(2),
          riskLevel: analysis.riskMetrics.riskLevel,
          diversificationScore: analysis.diversification.score
        },
        analysis,
        advice,
        reportTime: new Date().toLocaleString(),
        version: '1.0'
      }
      
      return {
        success: true,
        data: report
      }
    } catch (error) {
      console.error('生成分析报告失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

module.exports = AnalyticsService
