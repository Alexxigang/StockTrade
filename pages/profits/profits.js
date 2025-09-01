// pages/profits/profits.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')
const AnalyticsService = require('../../utils/analyticsService.js')
const RealtimeService = require('../../utils/realtimeService.js')

Page({
  data: {
    // 基础数据
    userProfits: [],
    stockProfits: [],
    monthlyStats: [],
    positions: [],
    
    // 总体概况
    totalInvestment: 0,
    totalProfit: 0,
    profitRate: 0,
    totalMarketValue: 0,
    
    // 高级分析数据
    portfolioAnalysis: null,
    analysisReport: null,
    investmentAdvice: null,
    
    // 页面状态
    loading: true,
    analysisLoading: false,
    currentTab: 'overview', // overview, analysis, advice
    lastUpdateTime: '',
    
    // 显示控制
    showAdvancedAnalysis: false,
    showDetailedStats: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  // 标签页切换
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    
    if (tab === 'analysis' && !this.data.portfolioAnalysis) {
      this.loadAdvancedAnalysis()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ loading: true })
    
    try {
      await this.loadData()
      if (this.data.portfolioAnalysis) {
        await this.loadAdvancedAnalysis()
      }
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 加载数据
  async loadData() {
    if (!this.data.loading) {
      wx.showLoading({
        title: '计算中...'
      })
    }

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()

      if (transactions.length === 0) {
        this.setData({
          userProfits: [],
          stockProfits: [],
          monthlyStats: [],
          positions: [],
          totalInvestment: 0,
          totalProfit: 0,
          profitRate: 0,
          totalMarketValue: 0,
          loading: false,
          lastUpdateTime: new Date().toLocaleTimeString()
        })
        wx.hideLoading()
        return
      }

      // 计算持仓数据
      const positions = CalculationService.calculateUserPositions(transactions)
      
      // 获取实时价格更新持仓
      const stockCodes = [...new Set(positions.map(pos => pos.stockCode))]
      const StockApiService = require('../../utils/stockApi.js')
      
      let priceResults = { data: {}, success: false }
      try {
        priceResults = await StockApiService.getBatchStockPrices(stockCodes)
      } catch (error) {
        console.warn('获取实时价格失败，使用历史数据:', error)
      }
      
      const positionsWithData = positions.map(position => {
        const user = users.find(u => u.id === position.userId)
        const stockData = priceResults.data[position.stockCode]
        const currentPrice = stockData ? stockData.price : null
        
        let totalMarketValue = position.totalCost
        let unrealizedPL = 0
        
        if (currentPrice && currentPrice > 0) {
          totalMarketValue = currentPrice * position.totalQuantity
          unrealizedPL = totalMarketValue - position.totalCost
        }
        
        return {
          ...position,
          userName: user ? user.name : '未知用户',
          currentPrice,
          totalMarketValue: totalMarketValue.toFixed(2),
          unrealizedPL: unrealizedPL.toFixed(2),
          stockData: stockData || null
        }
      })

      // 计算用户收益（包含费用）
      const userProfits = CalculationService.calculateUserProfits(transactions)
        .map(profit => {
          const user = users.find(u => u.id === profit.userId)
          return {
            ...profit,
            userName: user ? user.name : '未知用户',
            realizedPL: profit.realizedPL.toFixed(0),
            netRealizedPL: profit.netRealizedPL.toFixed(0),
            totalFees: profit.totalFees.toFixed(0),
            totalBuyAmount: profit.totalBuyAmount.toFixed(0),
            totalSellAmount: profit.totalSellAmount.toFixed(0)
          }
        })
        .sort((a, b) => parseFloat(b.netRealizedPL) - parseFloat(a.netRealizedPL))

      // 计算股票收益
      const stockProfits = CalculationService.calculateStockProfits(transactions)
        .map(profit => ({
          ...profit,
          realizedPL: profit.realizedPL.toFixed(0)
        }))
        .sort((a, b) => parseFloat(b.realizedPL) - parseFloat(a.realizedPL))

      // 计算月度统计
      const monthlyStats = CalculationService.calculateMonthlyStats(transactions)
        .map(stat => ({
          ...stat,
          buyAmount: stat.buyAmount.toFixed(0),
          sellAmount: stat.sellAmount.toFixed(0),
          netAmount: stat.netAmount.toFixed(0)
        }))

      // 计算总体数据（包含费用）
      let totalBuyAmount = 0
      let totalSellAmount = 0
      let totalBuyFees = 0
      let totalSellFees = 0

      transactions.forEach(t => {
        const amount = t.quantity * t.price
        const fees = CalculationService.calculateTransactionFees(amount, t.type)
        
        if (t.type === 'buy') {
          totalBuyAmount += amount
          totalBuyFees += fees.total
        } else {
          totalSellAmount += amount
          totalSellFees += fees.total
        }
      })

      const grossProfit = totalSellAmount - totalBuyAmount
      const totalFees = totalBuyFees + totalSellFees
      const netProfit = grossProfit - totalFees
      const profitRate = totalBuyAmount > 0 ? ((netProfit / totalBuyAmount) * 100) : 0

      // 更新计算逻辑，使用持仓数据计算市值
      const totalCost = positionsWithData.reduce((sum, pos) => sum + pos.totalCost, 0)
      const totalMarketValue = positionsWithData.reduce((sum, pos) => sum + parseFloat(pos.totalMarketValue || 0), 0)
      const totalUnrealizedPL = totalMarketValue - totalCost

      this.setData({
        userProfits,
        stockProfits,
        monthlyStats,
        positions: positionsWithData,
        totalInvestment: totalCost.toFixed(0),
        totalProfit: totalUnrealizedPL.toFixed(0),
        profitRate: totalCost > 0 ? ((totalUnrealizedPL / totalCost) * 100).toFixed(2) : '0.00',
        totalMarketValue: totalMarketValue.toFixed(0),
        totalFees: totalFees.toFixed(0),
        grossProfit: grossProfit.toFixed(0),
        loading: false,
        lastUpdateTime: new Date().toLocaleTimeString()
      })

    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '计算失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载高级分析
  async loadAdvancedAnalysis() {
    if (this.data.positions.length === 0) {
      wx.showToast({
        title: '暂无持仓数据',
        icon: 'none'
      })
      return
    }

    this.setData({ analysisLoading: true })

    try {
      const transactions = StorageService.getTransactions()
      const analysisResult = AnalyticsService.generateAnalysisReport(this.data.positions, transactions)
      
      if (analysisResult.success) {
        this.setData({
          analysisReport: analysisResult.data,
          portfolioAnalysis: analysisResult.data.analysis,
          investmentAdvice: analysisResult.data.advice,
          showAdvancedAnalysis: true
        })
      } else {
        wx.showToast({
          title: '分析失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('高级分析失败:', error)
      wx.showToast({
        title: '分析失败',
        icon: 'error'
      })
    } finally {
      this.setData({ analysisLoading: false })
    }
  },

  // 导出收益分析
  onExportData() {
    const ExportService = require('../../utils/exportService.js')
    
    wx.showActionSheet({
      itemList: ['导出CSV文件', '分享收益概览'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportProfits()
        } else if (res.tapIndex === 1) {
          this.shareProfits()
        }
      }
    })
  },

  // 导出收益分析
  exportProfits() {
    const ExportService = require('../../utils/exportService.js')
    
    wx.showLoading({
      title: '准备导出...'
    })

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      const profits = CalculationService.calculateUserProfits(transactions)
      
      ExportService.exportProfits(profits, users)
    } catch (error) {
      console.error('导出失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 分享收益
  shareProfits() {
    const ExportService = require('../../utils/exportService.js')
    const users = StorageService.getUsers()
    const transactions = StorageService.getTransactions()
    const profits = CalculationService.calculateUserProfits(transactions)
    
    const shareData = ExportService.shareData('profits', { profits, users })
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 分享
  onShareAppMessage() {
    const ExportService = require('../../utils/exportService.js')
    const users = StorageService.getUsers()
    const transactions = StorageService.getTransactions()
    const profits = CalculationService.calculateUserProfits(transactions)
    
    return ExportService.shareData('profits', { profits, users })
  }
})
