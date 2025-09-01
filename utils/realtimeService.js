// utils/realtimeService.js - 实时数据管理服务

const StockApiService = require('./stockApi.js')
const StorageService = require('./storage.js')

class RealtimeService {
  // 实时数据更新间隔配置
  static UPDATE_INTERVALS = {
    fast: 5000,    // 5秒 - 用于重要数据
    normal: 15000, // 15秒 - 常规数据
    slow: 60000    // 60秒 - 背景数据
  }

  // 当前活跃的定时器
  static activeTimers = new Map()

  // 数据订阅者
  static subscribers = new Map()

  // 开始实时数据订阅
  static startRealtimeUpdates(stockCodes, interval = 'normal', callback) {
    if (!stockCodes || stockCodes.length === 0) return null

    const timerId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const updateInterval = this.UPDATE_INTERVALS[interval] || this.UPDATE_INTERVALS.normal

    // 立即执行一次
    this.updateStockPrices(stockCodes, callback)

    // 设置定时更新
    const timer = setInterval(() => {
      this.updateStockPrices(stockCodes, callback)
    }, updateInterval)

    this.activeTimers.set(timerId, timer)
    
    console.log(`开始实时数据订阅: ${timerId}, 间隔: ${updateInterval}ms, 股票: ${stockCodes.length}个`)
    
    return timerId
  }

  // 停止实时数据订阅
  static stopRealtimeUpdates(timerId) {
    if (!timerId) return

    const timer = this.activeTimers.get(timerId)
    if (timer) {
      clearInterval(timer)
      this.activeTimers.delete(timerId)
      console.log(`停止实时数据订阅: ${timerId}`)
    }
  }

  // 停止所有实时数据订阅
  static stopAllRealtimeUpdates() {
    this.activeTimers.forEach((timer, timerId) => {
      clearInterval(timer)
      console.log(`停止实时数据订阅: ${timerId}`)
    })
    this.activeTimers.clear()
    this.subscribers.clear()
  }

  // 更新股票价格数据
  static async updateStockPrices(stockCodes, callback) {
    try {
      const result = await StockApiService.getBatchStockPrices(stockCodes)
      
      if (result.success && callback) {
        callback({
          success: true,
          data: result.data,
          timestamp: result.timestamp,
          updateTime: new Date().toLocaleTimeString()
        })
      }
      
      // 更新缓存
      this.updatePriceCache(result.data)
      
    } catch (error) {
      console.error('更新股票价格失败:', error)
      if (callback) {
        callback({
          success: false,
          error: error.message,
          timestamp: Date.now()
        })
      }
    }
  }

  // 更新价格缓存
  static updatePriceCache(priceData) {
    try {
      if (!priceData) return

      Object.entries(priceData).forEach(([code, data]) => {
        StockApiService.cachePrice(code, data)
      })
    } catch (error) {
      console.error('更新价格缓存失败:', error)
    }
  }

  // 获取用户持仓的股票代码
  static getUserStockCodes() {
    try {
      const transactions = StorageService.getTransactions()
      const stockCodes = [...new Set(transactions.map(t => t.stockCode))]
      return stockCodes
    } catch (error) {
      console.error('获取用户股票代码失败:', error)
      return []
    }
  }

  // 获取关注列表的股票代码
  static getWatchlistStockCodes() {
    try {
      const watchlist = wx.getStorageSync('stock_watchlist') || []
      return watchlist.map(item => item.code)
    } catch (error) {
      console.error('获取关注列表失败:', error)
      return []
    }
  }

  // 计算实时盈亏
  static calculateRealtimePositions(positions, priceData) {
    try {
      return positions.map(position => {
        const stockData = priceData[position.stockCode]
        const currentPrice = stockData ? stockData.price : null
        
        let unrealizedPL = 0
        let unrealizedPLPercent = '0.0'
        let totalMarketValue = 0
        
        if (currentPrice && currentPrice > 0) {
          totalMarketValue = currentPrice * position.totalQuantity
          unrealizedPL = totalMarketValue - position.totalCost
          unrealizedPLPercent = position.totalCost > 0 
            ? ((unrealizedPL / position.totalCost) * 100).toFixed(2)
            : '0.0'
        }
        
        return {
          ...position,
          currentPrice,
          totalMarketValue: totalMarketValue.toFixed(2),
          unrealizedPL: unrealizedPL.toFixed(2),
          unrealizedPLPercent,
          stockData: stockData || null,
          lastUpdate: stockData ? stockData.timestamp : null
        }
      })
    } catch (error) {
      console.error('计算实时盈亏失败:', error)
      return positions
    }
  }

  // 获取市场概况更新
  static async getMarketUpdate() {
    try {
      const result = await StockApiService.getMarketOverview()
      return result
    } catch (error) {
      console.error('获取市场概况失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 价格变动提醒检查
  static checkPriceAlerts(priceData) {
    try {
      const alerts = wx.getStorageSync('price_alerts') || []
      const triggeredAlerts = []

      alerts.forEach(alert => {
        const stockData = priceData[alert.stockCode]
        if (!stockData) return

        const currentPrice = stockData.price
        let triggered = false

        switch (alert.type) {
          case 'above':
            triggered = currentPrice >= alert.price
            break
          case 'below':
            triggered = currentPrice <= alert.price
            break
          case 'change_up':
            triggered = stockData.changePercent >= alert.percent
            break
          case 'change_down':
            triggered = stockData.changePercent <= alert.percent
            break
        }

        if (triggered) {
          triggeredAlerts.push({
            ...alert,
            currentPrice,
            currentChange: stockData.changePercent,
            triggerTime: Date.now()
          })
        }
      })

      // 发送通知
      if (triggeredAlerts.length > 0) {
        this.sendPriceAlerts(triggeredAlerts)
      }

      return triggeredAlerts
    } catch (error) {
      console.error('价格提醒检查失败:', error)
      return []
    }
  }

  // 发送价格提醒通知
  static sendPriceAlerts(alerts) {
    try {
      alerts.forEach(alert => {
        let message = ''
        switch (alert.type) {
          case 'above':
            message = `${alert.stockName}(${alert.stockCode})价格达到¥${alert.currentPrice}，超过设定值¥${alert.price}`
            break
          case 'below':
            message = `${alert.stockName}(${alert.stockCode})价格跌至¥${alert.currentPrice}，低于设定值¥${alert.price}`
            break
          case 'change_up':
            message = `${alert.stockName}(${alert.stockCode})涨幅达到${alert.currentChange}%，超过设定值${alert.percent}%`
            break
          case 'change_down':
            message = `${alert.stockName}(${alert.stockCode})跌幅达到${alert.currentChange}%，超过设定值${alert.percent}%`
            break
        }

        // 显示本地通知
        wx.showToast({
          title: '价格提醒',
          icon: 'none',
          duration: 3000
        })

        // 可以在这里添加更多通知方式，如消息推送等
        console.log('价格提醒:', message)
      })
    } catch (error) {
      console.error('发送价格提醒失败:', error)
    }
  }

  // 数据同步状态管理
  static getSyncStatus() {
    try {
      const status = wx.getStorageSync('sync_status') || {
        lastSyncTime: 0,
        syncSuccess: false,
        apiStatus: {},
        errorCount: 0
      }
      
      return status
    } catch (error) {
      console.error('获取同步状态失败:', error)
      return {
        lastSyncTime: 0,
        syncSuccess: false,
        apiStatus: {},
        errorCount: 0
      }
    }
  }

  // 更新同步状态
  static updateSyncStatus(status) {
    try {
      const currentStatus = this.getSyncStatus()
      const newStatus = {
        ...currentStatus,
        ...status,
        lastSyncTime: Date.now()
      }
      
      wx.setStorageSync('sync_status', newStatus)
    } catch (error) {
      console.error('更新同步状态失败:', error)
    }
  }

  // 网络状态检查
  static checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const networkType = res.networkType
          const isConnected = networkType !== 'none'
          
          resolve({
            isConnected,
            networkType,
            isWifi: networkType === 'wifi',
            isMobile: ['2g', '3g', '4g', '5g'].includes(networkType)
          })
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'unknown',
            isWifi: false,
            isMobile: false
          })
        }
      })
    })
  }

  // 智能更新策略
  static async getSmartUpdateInterval() {
    try {
      const networkStatus = await this.checkNetworkStatus()
      const syncStatus = this.getSyncStatus()
      
      // 根据网络状态和API状态智能调整更新间隔
      if (!networkStatus.isConnected) {
        return this.UPDATE_INTERVALS.slow * 2 // 网络断开时延长间隔
      }
      
      if (networkStatus.isMobile) {
        return this.UPDATE_INTERVALS.normal * 1.5 // 移动网络时适当延长
      }
      
      if (syncStatus.errorCount > 3) {
        return this.UPDATE_INTERVALS.slow // 错误较多时降低频率
      }
      
      return this.UPDATE_INTERVALS.normal
    } catch (error) {
      console.error('获取智能更新间隔失败:', error)
      return this.UPDATE_INTERVALS.normal
    }
  }

  // 页面可见性变化处理
  static handleVisibilityChange(visible) {
    if (visible) {
      // 页面变为可见时，可以提高更新频率
      console.log('页面变为可见，提高数据更新频率')
    } else {
      // 页面变为不可见时，降低更新频率或暂停更新
      console.log('页面变为不可见，降低数据更新频率')
    }
  }

  // 清理过期缓存
  static cleanupExpiredCache() {
    try {
      StockApiService.clearCache()
      console.log('清理过期缓存完成')
    } catch (error) {
      console.error('清理缓存失败:', error)
    }
  }
}

module.exports = RealtimeService
