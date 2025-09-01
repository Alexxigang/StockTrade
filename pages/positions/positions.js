// pages/positions/positions.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')
const RealtimeService = require('../../utils/realtimeService.js')

Page({
  data: {
    positions: [],
    users: [],
    totalCost: 0,
    totalMarketValue: 0,
    totalUnrealizedPL: 0,
    returnRate: 0,
    loading: true,
    refreshing: false,
    lastUpdateTime: '',
    realtimeTimerId: null,
    autoRefresh: true,
    apiStatus: 'unknown' // unknown, success, error
  },

  onLoad() {
    this.loadData()
    this.startRealtimeUpdates()
  },

  onShow() {
    // 每次显示页面都重新加载数据
    this.loadData()
    if (!this.data.realtimeTimerId && this.data.autoRefresh) {
      this.startRealtimeUpdates()
    }
    
    // 通知实时服务页面变为可见
    RealtimeService.handleVisibilityChange(true)
  },

  onHide() {
    // 页面隐藏时降低更新频率
    RealtimeService.handleVisibilityChange(false)
  },

  onUnload() {
    // 页面卸载时停止实时更新
    this.stopRealtimeUpdates()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  // 开始实时数据更新
  startRealtimeUpdates() {
    if (this.data.realtimeTimerId) {
      this.stopRealtimeUpdates()
    }

    const stockCodes = RealtimeService.getUserStockCodes()
    if (stockCodes.length === 0) return

    const timerId = RealtimeService.startRealtimeUpdates(
      stockCodes,
      'normal',
      (result) => {
        if (result.success) {
          this.updatePositionsWithRealtime(result.data)
          this.setData({
            lastUpdateTime: result.updateTime,
            apiStatus: 'success',
            refreshing: false
          })
        } else {
          console.error('实时数据更新失败:', result.error)
          this.setData({
            apiStatus: 'error',
            refreshing: false
          })
        }
      }
    )

    this.setData({ realtimeTimerId: timerId })
  },

  // 停止实时数据更新
  stopRealtimeUpdates() {
    if (this.data.realtimeTimerId) {
      RealtimeService.stopRealtimeUpdates(this.data.realtimeTimerId)
      this.setData({ realtimeTimerId: null })
    }
  },

  // 切换自动刷新
  toggleAutoRefresh() {
    const newAutoRefresh = !this.data.autoRefresh
    this.setData({ autoRefresh: newAutoRefresh })

    if (newAutoRefresh) {
      this.startRealtimeUpdates()
      wx.showToast({
        title: '已开启自动刷新',
        icon: 'success'
      })
    } else {
      this.stopRealtimeUpdates()
      wx.showToast({
        title: '已关闭自动刷新',
        icon: 'none'
      })
    }
  },

  // 手动刷新数据
  async refreshData() {
    this.setData({ refreshing: true })
    
    try {
      await this.loadData()
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
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    }
  },

  // 加载数据
  async loadData() {
    if (!this.data.refreshing) {
      this.setData({ loading: true })
    }

    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      
      // 计算用户持仓
      const calculatedPositions = CalculationService.calculateUserPositions(transactions)
      
      if (calculatedPositions.length === 0) {
        this.setData({
          positions: [],
          users,
          totalCost: '0',
          totalMarketValue: '0',
          totalUnrealizedPL: '0',
          returnRate: '0.0',
          loading: false,
          lastUpdateTime: new Date().toLocaleTimeString()
        })
        return
      }
      
      // 获取实时价格
      const stockCodes = [...new Set(calculatedPositions.map(pos => pos.stockCode))]
      const StockApiService = require('../../utils/stockApi.js')
      const priceResults = await StockApiService.getBatchStockPrices(stockCodes)
      
      // 使用实时服务计算持仓数据
      const positionsWithData = RealtimeService.calculateRealtimePositions(
        calculatedPositions.map(position => {
          const user = users.find(u => u.id === position.userId)
          return {
            ...position,
            userName: user ? user.name : '未知用户',
            totalCost: position.totalCost.toFixed(0),
            averagePrice: position.averagePrice.toFixed(2)
          }
        }),
        priceResults.data || {}
      )

      // 计算汇总数据
      const totalCost = calculatedPositions.reduce((sum, pos) => sum + pos.totalCost, 0)
      const totalMarketValue = positionsWithData.reduce((sum, pos) => sum + parseFloat(pos.totalMarketValue || 0), 0)
      const totalUnrealizedPL = totalMarketValue - totalCost
      const returnRate = totalCost > 0 ? ((totalUnrealizedPL / totalCost) * 100).toFixed(2) : '0.0'

      this.setData({
        positions: positionsWithData,
        users,
        totalCost: totalCost.toFixed(0),
        totalMarketValue: totalMarketValue.toFixed(0),
        totalUnrealizedPL: totalUnrealizedPL.toFixed(0),
        returnRate,
        loading: false,
        lastUpdateTime: new Date().toLocaleTimeString(),
        apiStatus: priceResults.success ? 'success' : 'error'
      })

    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      this.setData({ 
        loading: false,
        apiStatus: 'error'
      })
    }
  },

  // 使用实时数据更新持仓
  updatePositionsWithRealtime(priceData) {
    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      const calculatedPositions = CalculationService.calculateUserPositions(transactions)
      
      const positionsWithData = RealtimeService.calculateRealtimePositions(
        calculatedPositions.map(position => {
          const user = users.find(u => u.id === position.userId)
          return {
            ...position,
            userName: user ? user.name : '未知用户',
            totalCost: position.totalCost.toFixed(0),
            averagePrice: position.averagePrice.toFixed(2)
          }
        }),
        priceData
      )

      // 重新计算汇总数据
      const totalCost = calculatedPositions.reduce((sum, pos) => sum + pos.totalCost, 0)
      const totalMarketValue = positionsWithData.reduce((sum, pos) => sum + parseFloat(pos.totalMarketValue || 0), 0)
      const totalUnrealizedPL = totalMarketValue - totalCost
      const returnRate = totalCost > 0 ? ((totalUnrealizedPL / totalCost) * 100).toFixed(2) : '0.0'

      this.setData({
        positions: positionsWithData,
        totalCost: totalCost.toFixed(0),
        totalMarketValue: totalMarketValue.toFixed(0),
        totalUnrealizedPL: totalUnrealizedPL.toFixed(0),
        returnRate
      })

    } catch (error) {
      console.error('更新实时数据失败:', error)
    }
  },

  // 点击持仓项
  onPositionTap(e) {
    const position = e.currentTarget.dataset.position
    
    wx.showActionSheet({
      itemList: ['查看详情', '价格提醒', '添加交易', '查看K线'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.showPositionDetail(position)
            break
          case 1:
            this.setPriceAlert(position)
            break
          case 2:
            this.addTransaction(position)
            break
          case 3:
            this.viewChart(position)
            break
        }
      }
    })
  },

  // 设置价格提醒
  setPriceAlert(position) {
    wx.showActionSheet({
      itemList: ['价格突破提醒', '跌破价格提醒', '涨幅提醒', '跌幅提醒'],
      success: (res) => {
        const alertTypes = ['above', 'below', 'change_up', 'change_down']
        const alertType = alertTypes[res.tapIndex]
        this.showPriceAlertDialog(position, alertType)
      }
    })
  },

  // 显示价格提醒对话框
  showPriceAlertDialog(position, alertType) {
    const isPercentAlert = alertType.includes('change')
    const title = isPercentAlert ? '设置涨跌幅提醒' : '设置价格提醒'
    const placeholder = isPercentAlert ? '请输入百分比(如:5)' : '请输入价格'
    
    wx.showModal({
      title: title,
      content: `为 ${position.stockName} 设置提醒`,
      editable: true,
      placeholderText: placeholder,
      success: (res) => {
        if (res.confirm && res.content) {
          const value = parseFloat(res.content)
          if (value > 0) {
            this.addPriceAlert(position, alertType, value)
          } else {
            wx.showToast({
              title: '请输入有效数值',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 添加价格提醒
  addPriceAlert(position, alertType, value) {
    try {
      let alerts = wx.getStorageSync('price_alerts') || []
      
      const newAlert = {
        id: Date.now().toString(),
        stockCode: position.stockCode,
        stockName: position.stockName,
        type: alertType,
        price: alertType.includes('change') ? null : value,
        percent: alertType.includes('change') ? value : null,
        createTime: Date.now()
      }
      
      alerts.push(newAlert)
      wx.setStorageSync('price_alerts', alerts)
      
      wx.showToast({
        title: '提醒设置成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('设置价格提醒失败:', error)
      wx.showToast({
        title: '设置失败',
        icon: 'error'
      })
    }
  },

  // 查看K线图（未来可以集成图表组件）
  viewChart(position) {
    wx.showToast({
      title: 'K线功能开发中',
      icon: 'none'
    })
    // 未来可以导航到图表页面
    // wx.navigateTo({
    //   url: `/pages/chart/chart?stockCode=${position.stockCode}&stockName=${position.stockName}`
    // })
  },

  // 显示持仓详情
  showPositionDetail(position) {
    const dataSource = position.stockData?.source || 'unknown'
    const sourceText = dataSource === 'mock' ? '模拟数据' : 
                      dataSource === 'tencent' ? '腾讯财经' :
                      dataSource === 'sina' ? '新浪财经' : '未知来源'
    
    const lastUpdateText = position.lastUpdate ? 
      new Date(position.lastUpdate).toLocaleString() : '无更新时间'
    
    const detail = `
股票代码: ${position.stockCode}
股票名称: ${position.stockName}
持有人: ${position.userName}

持仓信息:
持仓数量: ${position.totalQuantity} 股
平均成本: ¥${position.averagePrice}
总成本: ¥${position.totalCost}

实时行情:
当前价格: ${position.currentPrice ? '¥' + position.currentPrice : '暂无数据'}
市值: ${position.totalMarketValue ? '¥' + position.totalMarketValue : '暂无数据'}
浮动盈亏: ${position.unrealizedPL ? (parseFloat(position.unrealizedPL) >= 0 ? '+' : '') + '¥' + position.unrealizedPL : '暂无数据'}
收益率: ${position.unrealizedPLPercent ? (parseFloat(position.unrealizedPLPercent) >= 0 ? '+' : '') + position.unrealizedPLPercent + '%' : '暂无数据'}

数据来源: ${sourceText}
更新时间: ${lastUpdateText}
    `
    
    wx.showModal({
      title: '持仓详情',
      content: detail.trim(),
      showCancel: true,
      cancelText: '关闭',
      confirmText: '刷新数据',
      success: (res) => {
        if (res.confirm) {
          this.refreshData()
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
      url: `/pages/add-transaction/add-transaction?stockCode=${position.stockCode}&stockName=${position.stockName}&currentPrice=${position.currentPrice || ''}`
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

  // 功能菜单
  onMoreActions() {
    wx.showActionSheet({
      itemList: ['自动刷新开关', '导出数据', '清理缓存', 'API状态', '价格提醒管理'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.toggleAutoRefresh()
            break
          case 1:
            this.onExportData()
            break
          case 2:
            this.clearCache()
            break
          case 3:
            this.showApiStatus()
            break
          case 4:
            this.managePriceAlerts()
            break
        }
      }
    })
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理股价缓存吗？这将重新从服务器获取最新数据。',
      success: (res) => {
        if (res.confirm) {
          RealtimeService.cleanupExpiredCache()
          this.refreshData()
          wx.showToast({
            title: '缓存已清理',
            icon: 'success'
          })
        }
      }
    })
  },

  // 显示API状态
  async showApiStatus() {
    try {
      const status = await StockApiService.checkApiStatus()
      const stats = StockApiService.getApiStats()
      
      const detail = `
API状态检查:
腾讯财经: ${status.tencent ? '✅ 可用' : '❌ 不可用'}
新浪财经: ${status.sina ? '✅ 可用' : '❌ 不可用'}

使用统计:
总请求数: ${stats?.totalRequests || 0}
成功请求: ${stats?.successRequests || 0}
失败请求: ${stats?.errorRequests || 0}
腾讯API: ${stats?.tencentRequests || 0}
新浪API: ${stats?.sinaRequests || 0}
模拟数据: ${stats?.mockRequests || 0}

上次检查: ${new Date(status.lastChecked).toLocaleString()}
      `
      
      wx.showModal({
        title: 'API状态',
        content: detail.trim(),
        showCancel: false,
        confirmText: '确定'
      })
    } catch (error) {
      wx.showToast({
        title: '检查失败',
        icon: 'error'
      })
    }
  },

  // 管理价格提醒
  managePriceAlerts() {
    wx.showToast({
      title: '价格提醒管理开发中',
      icon: 'none'
    })
    // 未来可以导航到价格提醒管理页面
  },

  // 导出持仓数据
  onExportData() {
    wx.showActionSheet({
      itemList: ['导出CSV文件', '分享持仓概览', '生成报告'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.exportPositions()
            break
          case 1:
            this.sharePositions()
            break
          case 2:
            this.generateReport()
            break
        }
      }
    })
  },

  // 导出持仓数据
  exportPositions() {
    wx.showLoading({
      title: '准备导出...'
    })

    try {
      const data = {
        positions: this.data.positions,
        totalCost: this.data.totalCost,
        totalMarketValue: this.data.totalMarketValue,
        totalUnrealizedPL: this.data.totalUnrealizedPL,
        returnRate: this.data.returnRate,
        exportTime: new Date().toLocaleString()
      }

      // 这里可以调用导出服务
      console.log('导出数据:', data)
      wx.showToast({
        title: '导出功能开发中',
        icon: 'none'
      })
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
    const totalPL = parseFloat(this.data.totalUnrealizedPL)
    const isProfit = totalPL >= 0
    const title = `我的股票投资${isProfit ? '盈利' : '亏损'}了¥${Math.abs(totalPL).toFixed(0)}`
    
    return {
      title: title,
      path: '/pages/positions/positions',
      imageUrl: '/images/share-positions.png'
    }
  },

  // 生成报告
  generateReport() {
    wx.showToast({
      title: '报告生成功能开发中',
      icon: 'none'
    })
  },

  // 分享
  onShareAppMessage() {
    return this.sharePositions()
  }
})
