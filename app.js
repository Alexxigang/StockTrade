// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化示例数据
    this.initSampleData()

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  
  globalData: {
    userInfo: null
  },

  // 初始化示例数据
  initSampleData() {
    try {
      // 检查是否已有数据
      const users = wx.getStorageSync('users')
      const transactions = wx.getStorageSync('transactions')
      
      if (!users || users.length === 0) {
        // 创建示例用户数据
        const sampleUsers = [
          {
            id: 'user-001',
            name: '张三',
            phone: '13800138001',
            email: 'zhangsan@example.com',
            createTime: '2024-01-01 10:00:00'
          },
          {
            id: 'user-002', 
            name: '李四',
            phone: '13800138002',
            email: 'lisi@example.com',
            createTime: '2024-01-02 10:00:00'
          }
        ]
        wx.setStorageSync('users', sampleUsers)
      }

      if (!transactions || transactions.length === 0) {
        // 创建示例交易数据
        const sampleTransactions = [
          {
            id: 'trans-001',
            userId: 'user-001',
            stockCode: '000001',
            stockName: '平安银行',
            type: 'buy',
            quantity: 1000,
            price: 12.50,
            totalAmount: 12500,
            transactionDate: '2024-01-15',
            notes: '看好银行股',
            createTime: '2024-01-15 09:30:00'
          },
          {
            id: 'trans-002',
            userId: 'user-001', 
            stockCode: '000002',
            stockName: '万科A',
            type: 'buy',
            quantity: 500,
            price: 18.80,
            totalAmount: 9400,
            transactionDate: '2024-01-16',
            notes: '地产龙头',
            createTime: '2024-01-16 10:15:00'
          },
          {
            id: 'trans-003',
            userId: 'user-002',
            stockCode: '600036',
            stockName: '招商银行',
            type: 'buy',
            quantity: 800,
            price: 42.30,
            totalAmount: 33840,
            transactionDate: '2024-01-17',
            notes: '优质银行股',
            createTime: '2024-01-17 14:20:00'
          }
        ]
        wx.setStorageSync('transactions', sampleTransactions)
      }

      console.log('示例数据初始化完成')
    } catch (error) {
      console.error('初始化示例数据失败:', error)
    }
  }
})
