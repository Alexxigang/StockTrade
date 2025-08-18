// pages/transactions/transactions.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    transactions: [],
    users: [],
    totalBuyAmount: 0,
    totalSellAmount: 0,
    loading: true
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    // 每次显示页面都重新加载数据
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  // 加载数据
  loadData() {
    wx.showLoading({
      title: '加载中...'
    })

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      
      // 添加用户名并格式化数据
      const transactionsWithData = transactions
        .map(transaction => {
          const user = users.find(u => u.id === transaction.userId)
          return {
            ...transaction,
            userName: user ? user.name : '未知用户',
            totalAmount: (transaction.totalAmount || transaction.quantity * transaction.price).toFixed(0),
            price: transaction.price.toFixed(2)
          }
        })
        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)) // 按日期倒序

      // 计算统计数据
      const totalBuyAmount = transactions
        .filter(t => t.type === 'buy')
        .reduce((sum, t) => sum + (t.totalAmount || t.quantity * t.price), 0)
      
      const totalSellAmount = transactions
        .filter(t => t.type === 'sell')
        .reduce((sum, t) => sum + (t.totalAmount || t.quantity * t.price), 0)

      this.setData({
        transactions: transactionsWithData,
        users,
        totalBuyAmount: totalBuyAmount.toFixed(0),
        totalSellAmount: totalSellAmount.toFixed(0),
        loading: false
      })

    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 点击交易记录
  onTransactionTap(e) {
    const transaction = e.currentTarget.dataset.transaction
    
    const detail = `
股票代码: ${transaction.stockCode}
股票名称: ${transaction.stockName}
交易类型: ${transaction.type === 'buy' ? '买入' : '卖出'}
交易人: ${transaction.userName}
数量: ${transaction.quantity} 股
价格: ¥${transaction.price}
总金额: ¥${transaction.totalAmount}
交易日期: ${transaction.transactionDate}
备注: ${transaction.notes || '无'}
    `
    
    wx.showModal({
      title: '交易详情',
      content: detail.trim(),
      showCancel: true,
      cancelText: '删除',
      cancelColor: '#ff4d4f',
      confirmText: '编辑',
      success: (res) => {
        if (res.confirm) {
          this.editTransaction(transaction)
        } else if (res.cancel) {
          this.deleteTransaction(transaction)
        }
      }
    })
  },

  // 编辑交易
  onEditTransaction(e) {
    e.stopPropagation() // 阻止事件冒泡
    const transaction = e.currentTarget.dataset.transaction
    this.editTransaction(transaction)
  },

  editTransaction(transaction) {
    wx.navigateTo({
      url: `/pages/add-transaction/add-transaction?editId=${transaction.id}`
    })
  },

  // 删除交易
  deleteTransaction(transaction) {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条交易记录吗？\n${transaction.stockCode} ${transaction.type === 'buy' ? '买入' : '卖出'} ${transaction.quantity}股`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const success = StorageService.deleteTransaction(transaction.id)
          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadData() // 重新加载数据
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 添加新交易
  onAddTransaction() {
    wx.navigateTo({
      url: '/pages/add-transaction/add-transaction'
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的交易记录',
      path: '/pages/transactions/transactions'
    }
  }
})
