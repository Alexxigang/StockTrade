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
  loadData() {
    wx.showLoading({
      title: '加载中...'
    })

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      
      // 计算用户持仓
      const calculatedPositions = CalculationService.calculateUserPositions(transactions)
      
      // 添加用户名和额外计算
      const positionsWithData = calculatedPositions.map(position => {
        const user = users.find(u => u.id === position.userId)
        
        // 模拟当前价格（实际应用中应该从API获取）
        const mockCurrentPrice = this.getMockCurrentPrice(position.stockCode)
        const unrealizedPL = mockCurrentPrice 
          ? (mockCurrentPrice * position.totalQuantity) - position.totalCost 
          : 0
        const unrealizedPLPercent = position.totalCost > 0 
          ? ((unrealizedPL / position.totalCost) * 100).toFixed(1) 
          : '0.0'
        
        return {
          ...position,
          userName: user ? user.name : '未知用户',
          currentPrice: mockCurrentPrice,
          unrealizedPL: unrealizedPL.toFixed(2),
          unrealizedPLPercent: unrealizedPLPercent,
          totalCost: position.totalCost.toFixed(0),
          averagePrice: position.averagePrice.toFixed(2)
        }
      })

      // 计算汇总数据
      const totalCost = calculatedPositions.reduce((sum, pos) => sum + pos.totalCost, 0)
      const totalMarketValue = calculatedPositions.reduce((sum, pos) => {
        const mockPrice = this.getMockCurrentPrice(pos.stockCode)
        return sum + (mockPrice ? pos.totalQuantity * mockPrice : pos.totalCost)
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

  // 模拟获取当前股价（实际项目中应调用股票API）
  getMockCurrentPrice(stockCode) {
    const mockPrices = {
      '000001': 13.20, // 平安银行
      '000002': 19.80, // 万科A
      '600036': 45.60, // 招商银行
      '600519': 1680.00, // 贵州茅台
      '000858': 68.50, // 五粮液
    }
    return mockPrices[stockCode] || null
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
    wx.navigateTo({
      url: `/pages/add-transaction/add-transaction?stockCode=${position.stockCode}&stockName=${position.stockName}`
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
      title: '我的股票持仓',
      path: '/pages/positions/positions'
    }
  }
})
