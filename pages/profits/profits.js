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
      const CalculationService = require('../../utils/calculation.js')
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

      this.setData({
        userProfits,
        stockProfits,
        monthlyStats,
        totalInvestment: totalBuyAmount.toFixed(0),
        totalProfit: netProfit.toFixed(0),
        profitRate: profitRate.toFixed(1),
        totalFees: totalFees.toFixed(0),
        grossProfit: grossProfit.toFixed(0),
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
