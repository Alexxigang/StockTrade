// pages/positions/positions.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    positions: [],
    users: [],
    totalCost: 0,
    totalMarketValue: 0,
    totalUnrealizedPL: 0,
    returnRate: 0,
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
  async loadData() {
    wx.showLoading({
      title: '加载中...'
    })

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      
      // 计算用户持仓
      const calculatedPositions = CalculationService.calculateUserPositions(transactions)
      
      // 获取实时价格
      const stockCodes = [...new Set(calculatedPositions.map(pos => pos.stockCode))]
      const StockApiService = require('../../utils/stockApi.js')
      const priceResults = await StockApiService.getBatchStockPrices(stockCodes)
      
      // 添加用户名和实时价格计算
      const positionsWithData = calculatedPositions.map(position => {
        const user = users.find(u => u.id === position.userId)
        const stockData = priceResults.data[position.stockCode]
        const currentPrice = stockData ? stockData.price : null
        
        const unrealizedPL = currentPrice 
          ? (currentPrice * position.totalQuantity) - position.totalCost 
          : 0
        const unrealizedPLPercent = position.totalCost > 0 
          ? ((unrealizedPL / position.totalCost) * 100).toFixed(1) 
          : '0.0'
        
        return {
          ...position,
          userName: user ? user.name : '未知用户',
          currentPrice,
          unrealizedPL: unrealizedPL.toFixed(2),
          unrealizedPLPercent,
          totalCost: position.totalCost.toFixed(0),
          averagePrice: position.averagePrice.toFixed(2),
          stockData: stockData || null
        }
      })

      // 计算汇总数据
      const totalCost = calculatedPositions.reduce((sum, pos) => sum + pos.totalCost, 0)
      const totalMarketValue = calculatedPositions.reduce((sum, pos) => {
        const stockData = priceResults.data[pos.stockCode]
        const currentPrice = stockData ? stockData.price : pos.averagePrice
        return sum + (pos.totalQuantity * currentPrice)
      }, 0)
      const totalUnrealizedPL = totalMarketValue - totalCost
      const returnRate = totalCost > 0 ? ((totalUnrealizedPL / totalCost) * 100).toFixed(1) : '0.0'

      this.setData({
        positions: positionsWithData,
        users,
        totalCost: totalCost.toFixed(0),
        totalMarketValue: totalMarketValue.toFixed(0),
        totalUnrealizedPL: totalUnrealizedPL.toFixed(0),
        returnRate,
        loading: false,
        lastUpdateTime: new Date().toLocaleTimeString()
      })

    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取实时股价
  async getRealTimePrice(stockCode) {
    const StockApiService = require('../../utils/stockApi.js')
    
    try {
      const result = await StockApiService.getStockPrice(stockCode)
      return result.success ? result.price : null
    } catch (error) {
      console.error('获取股价失败:', error)
      return null
    }
  },

  // 点击持仓项
  onPositionTap(e) {
    const position = e.currentTarget.dataset.position
    
    wx.showActionSheet({
      itemList: ['查看详情', '设置价格', '添加交易'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.showPositionDetail(position)
            break
          case 1:
            this.setCurrentPrice(position)
            break
          case 2:
            this.addTransaction(position)
            break
        }
      }
    })
  },

  // 显示持仓详情
  showPositionDetail(position) {
    const detail = `
股票代码: ${position.stockCode}
股票名称: ${position.stockName}
持有人: ${position.userName}
持仓数量: ${position.totalQuantity} 股
平均成本: ¥${position.averagePrice}
总成本: ¥${position.totalCost}
当前价格: ${position.currentPrice ? '¥' + position.currentPrice : '未设置'}
浮动盈亏: ${position.currentPrice ? (position.unrealizedPL >= 0 ? '+' : '') + '¥' + position.unrealizedPL : '未知'}
    `
    
    wx.showModal({
      title: '持仓详情',
      content: detail.trim(),
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 设置当前价格
  setCurrentPrice(position) {
    wx.showModal({
      title: '设置当前价格',
      content: `请输入 ${position.stockCode} 的当前价格`,
      editable: true,
      placeholderText: position.currentPrice || '',
      success: (res) => {
        if (res.confirm && res.content) {
          const price = parseFloat(res.content)
          if (price > 0) {
            // 这里应该保存价格到存储中
            // 简化处理，直接刷新数据
            this.loadData()
            wx.showToast({
              title: '价格已更新',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: '请输入有效价格',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 为该股票添加交易
  addTransaction(position) {
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
      url: `/pages/add-transaction/add-transaction?stockCode=${position.stockCode}&stockName=${position.stockName}`
    })
  },

  // 添加新交易
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

  // 导出持仓数据
  onExportData() {
    const ExportService = require('../../utils/exportService.js')
    
    wx.showActionSheet({
      itemList: ['导出CSV文件', '分享持仓概览'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportPositions()
        } else if (res.tapIndex === 1) {
          this.sharePositions()
        }
      }
    })
  },

  // 导出持仓数据
  exportPositions() {
    const ExportService = require('../../utils/exportService.js')
    
    wx.showLoading({
      title: '准备导出...'
    })

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      const positions = CalculationService.calculateUserPositions(transactions)
      
      // 添加实时价格信息
      const positionsWithData = positions.map(position => {
        const user = users.find(u => u.id === position.userId)
        return {
          ...position,
          userName: user ? user.name : '未知用户',
          currentPrice: position.currentPrice || null,
          unrealizedPL: position.currentPrice ? 
            ((position.currentPrice * position.totalQuantity) - position.totalCost).toFixed(2) : 0
        }
      })

      ExportService.exportPositions(positionsWithData, users)
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

  // 分享持仓
  sharePositions() {
    const ExportService = require('../../utils/exportService.js')
    const users = StorageService.getUsers()
    const transactions = StorageService.getTransactions()
    const positions = CalculationService.calculateUserPositions(transactions)
    
    const shareData = ExportService.shareData('positions', { positions, users })
    
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
    const positions = CalculationService.calculateUserPositions(transactions)
    
    return ExportService.shareData('positions', { positions, users })
  }
})
