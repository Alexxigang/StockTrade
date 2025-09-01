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
      
      // 添加用户名并格式化数据，包含费用计算
      const CalculationService = require('../../utils/calculation.js')
      const transactionsWithData = transactions
        .map(transaction => {
          const user = users.find(u => u.id === transaction.userId)
          const amount = transaction.quantity * transaction.price
          const fees = CalculationService.calculateTransactionFees(amount, transaction.type)
          const netAmount = transaction.type === 'buy' ? 
            amount + fees.total : 
            amount - fees.total
          
          return {
            ...transaction,
            userName: user ? user.name : '未知用户',
            amount: amount.toFixed(0),
            fees: fees.total.toFixed(2),
            netAmount: netAmount.toFixed(0),
            price: transaction.price.toFixed(2),
            feeDetails: fees
          }
        })
        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)) // 按日期倒序

      // 计算统计数据（包含费用）
      let totalBuyAmount = 0
      let totalSellAmount = 0
      
      transactions.forEach(t => {
        const amount = t.quantity * t.price
        const fees = CalculationService.calculateTransactionFees(amount, t.type)
        const netAmount = t.type === 'buy' ? amount + fees.total : amount - fees.total
        
        if (t.type === 'buy') {
          totalBuyAmount += netAmount
        } else {
          totalSellAmount += netAmount
        }
      })

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
交易金额: ¥${transaction.amount}
交易费用: ¥${transaction.fees}
净金额: ¥${transaction.netAmount}
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
    console.log('点击添加交易按钮')
    
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

  // 导出交易记录
  onExportData() {
    const ExportService = require('../../utils/exportService.js')
    
    wx.showActionSheet({
      itemList: ['导出CSV文件', '分享交易概览'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportTransactions()
        } else if (res.tapIndex === 1) {
          this.shareTransactions()
        }
      }
    })
  },

  // 导出交易记录
  exportTransactions() {
    const ExportService = require('../../utils/exportService.js')
    
    wx.showLoading({
      title: '准备导出...'
    })

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      
      ExportService.exportTransactions(transactions, users)
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

  // 分享交易记录
  shareTransactions() {
    const ExportService = require('../../utils/exportService.js')
    const users = StorageService.getUsers()
    const transactions = StorageService.getTransactions()
    
    const shareData = ExportService.shareData('transactions', { transactions, users })
    
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
    
    return ExportService.shareData('transactions', { transactions, users })
  }
})
