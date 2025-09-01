// pages/index/index.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')
const StockApiService = require('../../utils/stockApi.js')

Page({
  data: {
    stats: {
      userCount: 0,
      transactionCount: 0,
      positionCount: 0,
      totalValue: 0
    },
    marketData: null,
    marketIndexes: [],
    hotStocks: [],
    showSearchModal: false,
    searchKeyword: '',
    searchResults: [],
    searchHistory: [],
    lastUpdateTime: '',
    loading: false
  },

  onLoad() {
    this.loadAllData()
    this.loadSearchHistory()
  },

  onShow() {
    this.loadAllData()
  },

  onPullDownRefresh() {
    this.loadAllData()
    wx.stopPullDownRefresh()
  },

  // 加载所有数据
  async loadAllData() {
    try {
      this.setData({ loading: true })
      
      // 并行加载数据
      await Promise.all([
        this.loadStats(),
        this.loadMarketData(),
        this.loadHotStocks()
      ])

      this.setData({ 
        loading: false,
        lastUpdateTime: new Date().toLocaleTimeString()
      })
    } catch (error) {
      console.error('加载数据失败:', error)
      this.setData({ loading: false })
    }
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

  // 加载市场数据
  async loadMarketData() {
    try {
      const result = await StockApiService.getMarketOverview()
      if (result.success) {
        const marketIndexes = [
          result.data.shanghai,
          result.data.shenzhen,
          result.data.gem
        ].filter(item => item)

        this.setData({
          marketData: result.data,
          marketIndexes
        })
      }
    } catch (error) {
      console.error('加载市场数据失败:', error)
    }
  },

  // 加载热门股票
  async loadHotStocks() {
    try {
      const result = await StockApiService.getHotStocks()
      if (result.success) {
        this.setData({
          hotStocks: result.data.slice(0, 5) // 只显示前5个
        })
      }
    } catch (error) {
      console.error('加载热门股票失败:', error)
    }
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('search_history') || []
      this.setData({ searchHistory: history.slice(0, 10) })
    } catch (error) {
      console.error('加载搜索历史失败:', error)
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    try {
      if (!keyword || keyword.trim().length < 2) return
      
      let history = wx.getStorageSync('search_history') || []
      
      // 去重并添加到开头
      history = history.filter(item => item !== keyword)
      history.unshift(keyword)
      
      // 限制历史记录数量
      history = history.slice(0, 20)
      
      wx.setStorageSync('search_history', history)
      this.setData({ searchHistory: history.slice(0, 10) })
    } catch (error) {
      console.error('保存搜索历史失败:', error)
    }
  },

  // 显示搜索模态框
  onShowSearch() {
    this.setData({ 
      showSearchModal: true,
      searchResults: []
    })
  },

  // 隐藏搜索模态框
  onHideSearch() {
    this.setData({ 
      showSearchModal: false,
      searchKeyword: '',
      searchResults: []
    })
  },

  // 搜索输入
  async onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })

    if (!keyword || keyword.trim().length < 2) {
      this.setData({ searchResults: [] })
      return
    }

    try {
      const result = await StockApiService.searchStocks(keyword.trim())
      if (result.success) {
        this.setData({ searchResults: result.data })
      }
    } catch (error) {
      console.error('搜索失败:', error)
    }
  },

  // 清除搜索
  onClearSearch() {
    this.setData({
      searchKeyword: '',
      searchResults: []
    })
  },

  // 选择股票
  onSelectStock(e) {
    const stock = e.currentTarget.dataset.stock
    this.saveSearchHistory(stock.name)
    
    // 导航到添加交易页面，预填股票信息
    this.setData({ showSearchModal: false })
    wx.navigateTo({
      url: `/pages/add-transaction/add-transaction?stockCode=${stock.code}&stockName=${stock.name}`
    })
  },

  // 搜索历史点击
  onSearchHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ searchKeyword: keyword })
    this.onSearchInput({ detail: { value: keyword } })
  },

  // 股票点击
  onStockTap(e) {
    const stock = e.currentTarget.dataset.stock
    wx.showActionSheet({
      itemList: ['查看详情', '添加交易', '设为关注'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.showStockDetail(stock)
            break
          case 1:
            wx.navigateTo({
              url: `/pages/add-transaction/add-transaction?stockCode=${stock.code}&stockName=${stock.name}`
            })
            break
          case 2:
            this.addToWatchlist(stock)
            break
        }
      }
    })
  },

  // 显示股票详情
  showStockDetail(stock) {
    const detail = `
股票代码: ${stock.code}
股票名称: ${stock.name}
当前价格: ¥${stock.price}
涨跌金额: ${stock.change >= 0 ? '+' : ''}${stock.change}
涨跌幅度: ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%
数据来源: ${stock.source === 'mock' ? '模拟数据' : '实时数据'}
    `
    
    wx.showModal({
      title: '股票详情',
      content: detail.trim(),
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 添加到关注列表
  addToWatchlist(stock) {
    try {
      let watchlist = wx.getStorageSync('stock_watchlist') || []
      
      // 检查是否已存在
      if (watchlist.find(item => item.code === stock.code)) {
        wx.showToast({
          title: '已在关注列表中',
          icon: 'none'
        })
        return
      }
      
      watchlist.push({
        code: stock.code,
        name: stock.name,
        addTime: Date.now()
      })
      
      wx.setStorageSync('stock_watchlist', watchlist)
      wx.showToast({
        title: '添加关注成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('添加关注失败:', error)
      wx.showToast({
        title: '添加失败',
        icon: 'error'
      })
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

  // 导入数据
  onImportData() {
    wx.navigateTo({
      url: '/pages/import-data/import-data'
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
      title: '智能股票管家 - 专业的投资记录工具',
      path: '/pages/index/index',
      imageUrl: '/images/share.png' // 可以添加分享图片
    }
  }
})
