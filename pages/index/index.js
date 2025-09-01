// pages/index/index.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    stats: {
      userCount: 0,
      transactionCount: 0,
      positionCount: 0,
      totalValue: 0
    }
  },

  onLoad() {
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  // 加载统计数据
  loadStats() {
    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      const positions = CalculationService.calculateUserPositions(transactions)
      
      // 计算总资产（简化计算）
      const totalValue = positions.reduce((sum, pos) => sum + pos.totalCost, 0)

      this.setData({
        stats: {
          userCount: users.length,
          transactionCount: transactions.length,
          positionCount: positions.length,
          totalValue: totalValue.toFixed(0)
        }
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 添加交易
  onAddTransaction() {
    const users = StorageService.getUsers()
    if (users.length === 0) {
      wx.showModal({
        title: '提示',
        content: '请先添加用户，再添加交易记录',
        confirmText: '去添加',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/add-user/add-user'
            })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/add-transaction/add-transaction'
    })
  },

  // 查看持仓
  onViewPositions() {
    wx.switchTab({
      url: '/pages/positions/positions'
    })
  },

  // 收益分析
  onViewProfits() {
    wx.switchTab({
      url: '/pages/profits/profits'
    })
  },

  // 添加用户
  onAddUser() {
    wx.navigateTo({
      url: '/pages/add-user/add-user'
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '股票记录小程序',
      path: '/pages/index/index'
    }
  }
})
