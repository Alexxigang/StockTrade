// utils/stockApi.js - 股票数据API服务

class StockApiService {
  // 支持的交易所代码映射
  static EXCHANGE_MAP = {
    'sh': 'sh',      // 上交所
    'sz': 'sz',      // 深交所
    'hk': 'hk',      // 港交所
    'us': 'us'       // 美股
  }

  // 模拟股票数据（实际项目中应替换为真实API）
  static MOCK_STOCK_DATA = {
    '000001': { name: '平安银行', price: 13.25, change: 0.15, changePercent: 1.15 },
    '000002': { name: '万科A', price: 19.85, change: -0.12, changePercent: -0.60 },
    '600036': { name: '招商银行', price: 45.78, change: 0.42, changePercent: 0.93 },
    '600519': { name: '贵州茅台', price: 1685.50, change: 12.30, changePercent: 0.74 },
    '000858': { name: '五粮液', price: 68.92, change: -0.58, changePercent: -0.83 },
    '601318': { name: '中国平安', price: 48.65, change: 0.25, changePercent: 0.52 },
    '000333': { name: '美的集团', price: 72.18, change: 1.05, changePercent: 1.48 },
    '600000': { name: '浦发银行', price: 7.85, change: -0.05, changePercent: -0.63 },
    '601166': { name: '兴业银行', price: 16.42, change: 0.08, changePercent: 0.49 },
    '000651': { name: '格力电器', price: 42.35, change: -0.45, changePercent: -1.05 }
  }

  // 获取股票代码前缀
  static getStockPrefix(code) {
    if (!code) return null
    
    const cleanCode = code.toString().replace(/[^\d]/g, '')
    
    if (cleanCode.startsWith('6')) return 'sh'
    if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) return 'sz'
    if (cleanCode.startsWith('8')) return 'bj' // 北交所
    
    return 'sz' // 默认深交所
  }

  // 格式化股票代码
  static formatStockCode(code) {
    if (!code) return ''
    
    const cleanCode = code.toString().replace(/[^\d]/g, '')
    const prefix = this.getStockPrefix(cleanCode)
    
    return `${prefix}${cleanCode.padStart(6, '0')}`
  }

  // 获取股票实时价格（模拟）
  static async getStockPrice(stockCode) {
    try {
      const cleanCode = stockCode.toString().replace(/[^\d]/g, '')
      
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
      
      // 返回模拟数据
      if (this.MOCK_STOCK_DATA[cleanCode]) {
        return {
          ...this.MOCK_STOCK_DATA[cleanCode],
          code: cleanCode,
          timestamp: Date.now(),
          success: true
        }
      }
      
      // 随机生成数据（用于未在列表中的股票）
      const basePrice = 10 + Math.random() * 100
      const change = (Math.random() - 0.5) * 2
      const changePercent = (change / basePrice) * 100
      
      return {
        name: `股票${cleanCode}`,
        price: parseFloat(basePrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        code: cleanCode,
        timestamp: Date.now(),
        success: true
      }
    } catch (error) {
      console.error('获取股票价格失败:', error)
      return {
        success: false,
        error: error.message,
        price: null
      }
    }
  }

  // 批量获取股票价格
  static async getBatchStockPrices(stockCodes) {
    try {
      const promises = stockCodes.map(code => this.getStockPrice(code))
      const results = await Promise.all(promises)
      
      const priceMap = {}
      results.forEach((result, index) => {
        if (result.success) {
          priceMap[stockCodes[index]] = result
        }
      })
      
      return {
        success: true,
        data: priceMap,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('批量获取股票价格失败:', error)
      return {
        success: false,
        error: error.message,
        data: {}
      }
    }
  }

  // 获取股票基本信息
  static async getStockInfo(stockCode) {
    try {
      const priceData = await this.getStockPrice(stockCode)
      
      if (!priceData.success) {
        return { success: false, error: priceData.error }
      }

      // 模拟更多股票信息
      const stockInfo = {
        code: priceData.code,
        name: priceData.name,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        turnover: Math.floor(Math.random() * 1000000000) + 100000000,
        high: priceData.price * (1 + Math.random() * 0.05),
        low: priceData.price * (1 - Math.random() * 0.05),
        open: priceData.price * (1 + (Math.random() - 0.5) * 0.02),
        close: priceData.price - priceData.change,
        timestamp: priceData.timestamp
      }

      return {
        success: true,
        data: stockInfo
      }
    } catch (error) {
      console.error('获取股票信息失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 搜索股票（模拟）
  static async searchStocks(keyword) {
    try {
      if (!keyword || keyword.trim().length < 2) {
        return { success: true, data: [] }
      }

      const keywordLower = keyword.toLowerCase()
      const results = []

      // 从模拟数据中搜索
      Object.entries(this.MOCK_STOCK_DATA).forEach(([code, data]) => {
        if (code.includes(keyword) || data.name.toLowerCase().includes(keywordLower)) {
          results.push({
            code,
            name: data.name,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent
          })
        }
      })

      // 添加一些模拟搜索结果
      if (results.length < 5) {
        for (let i = 0; i < 5 - results.length; i++) {
          const mockCode = (Math.floor(Math.random() * 900000) + 100000).toString()
          if (!results.find(r => r.code === mockCode)) {
            results.push({
              code: mockCode,
              name: `模拟股票${mockCode}`,
              price: parseFloat((10 + Math.random() * 100).toFixed(2)),
              change: parseFloat(((Math.random() - 0.5) * 4).toFixed(2)),
              changePercent: parseFloat(((Math.random() - 0.5) * 5).toFixed(2))
            })
          }
        }
      }

      return {
        success: true,
        data: results.slice(0, 10) // 最多返回10条
      }
    } catch (error) {
      console.error('搜索股票失败:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  // 获取市场概览
  static async getMarketOverview() {
    try {
      // 模拟市场数据
      const marketData = {
        shanghai: {
          name: '上证指数',
          code: '000001',
          price: 3125.68,
          change: 15.23,
          changePercent: 0.49,
          volume: 284700000000
        },
        shenzhen: {
          name: '深证成指',
          code: '399001',
          price: 10568.45,
          change: -45.67,
          changePercent: -0.43,
          volume: 356800000000
        },
        gem: {
          name: '创业板指',
          code: '399006',
          price: 2156.78,
          change: 8.92,
          changePercent: 0.42,
          volume: 125600000000
        },
        timestamp: Date.now()
      }

      return {
        success: true,
        data: marketData
      }
    } catch (error) {
      console.error('获取市场概览失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 缓存管理
  static CACHE_KEY = 'stock_price_cache'
  static CACHE_DURATION = 60000 // 60秒缓存

  // 从缓存获取价格
  static getCachedPrice(stockCode) {
    try {
      const cache = wx.getStorageSync(this.CACHE_KEY) || {}
      const cached = cache[stockCode]
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }
      
      return null
    } catch (error) {
      console.error('获取缓存价格失败:', error)
      return null
    }
  }

  // 缓存价格
  static cachePrice(stockCode, data) {
    try {
      const cache = wx.getStorageSync(this.CACHE_KEY) || {}
      cache[stockCode] = {
        data,
        timestamp: Date.now()
      }
      wx.setStorageSync(this.CACHE_KEY, cache)
    } catch (error) {
      console.error('缓存价格失败:', error)
    }
  }

  // 清除缓存
  static clearCache() {
    try {
      wx.removeStorageSync(this.CACHE_KEY)
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }
}

module.exports = StockApiService