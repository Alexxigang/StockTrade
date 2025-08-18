// pages/profits/profits.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    userProfits: [],
    stockProfits: [],
    monthlyStats: [],
    totalInvestment: 0,
    totalProfit: 0,
    profitRate: 0,
    loading: true
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  // 加载数据
  loadData() {
    wx.showLoading({
      title: '计算中...'
    })

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()

      if (transactions.length === 0) {
        this.setData({
          userProfits: [],
          stockProfits: [],
          monthlyStats: [],
          totalInvestment: 0,
          totalProfit: 0,
          profitRate: 0,
          loading: false
        })
        return
      }

      // 计算用户收益
      const userProfits = CalculationService.calculateUserProfits(transactions)
        .map(profit => {
          const user = users.find(u => u.id === profit.userId)
          return {
            ...profit,
            userName: user ? user.name : '未知用户',
            realizedPL: profit.realizedPL.toFixed(0)
          }
        })
        .sort((a, b) => parseFloat(b.realizedPL) - parseFloat(a.realizedPL))

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

      // 计算总体数据
      const totalBuyAmount = transactions
        .filter(t => t.type === 'buy')
        .reduce((sum, t) => sum + (t.totalAmount || t.quantity * t.price), 0)
      
      const totalSellAmount = transactions
        .filter(t => t.type === 'sell')
        .reduce((sum, t) => sum + (t.totalAmount || t.quantity * t.price), 0)

      const totalProfit = totalSellAmount - totalBuyAmount
      const profitRate = totalBuyAmount > 0 ? ((totalProfit / totalBuyAmount) * 100) : 0

      this.setData({
        userProfits,
        stockProfits,
        monthlyStats,
        totalInvestment: totalBuyAmount.toFixed(0),
        totalProfit: totalProfit.toFixed(0),
        profitRate: profitRate.toFixed(1),
        loading: false
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

  // 分享
  onShareAppMessage() {
    return {
      title: '我的投资收益分析',
      path: '/pages/profits/profits'
    }
  }
})
