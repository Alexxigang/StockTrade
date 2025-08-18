// pages/profile/profile.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    users: [],
    stats: {
      userCount: 0,
      transactionCount: 0,
      positionCount: 0,
      storageUsed: 0
    }
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  // 加载数据
  loadData() {
    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      const positions = CalculationService.calculateUserPositions(transactions)
      
      // 获取存储信息
      const storageInfo = StorageService.getStorageInfo()
      const storageUsed = storageInfo ? Math.round(storageInfo.currentSize) : 0

      this.setData({
        users,
        stats: {
          userCount: users.length,
          transactionCount: transactions.length,
          positionCount: positions.length,
          storageUsed
        }
      })
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 添加用户
  onAddUser() {
    wx.navigateTo({
      url: '/pages/add-user/add-user'
    })
  },

  // 长按用户项
  onUserLongPress(e) {
    const user = e.currentTarget.dataset.user
    
    wx.showActionSheet({
      itemList: ['编辑用户', '删除用户'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.editUser(user)
            break
          case 1:
            this.deleteUser(user)
            break
        }
      }
    })
  },

  // 编辑用户
  editUser(user) {
    wx.navigateTo({
      url: `/pages/add-user/add-user?editId=${user.id}`
    })
  },

  // 删除用户
  deleteUser(user) {
    // 检查用户是否有交易记录
    const transactions = StorageService.getTransactions()
    const userTransactions = transactions.filter(t => t.userId === user.id)
    
    if (userTransactions.length > 0) {
      wx.showModal({
        title: '无法删除',
        content: `用户 ${user.name} 还有 ${userTransactions.length} 条交易记录，请先删除相关交易记录。`,
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除用户 ${user.name} 吗？`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const success = StorageService.deleteUser(user.id)
          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadData()
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

  // 数据管理
  onDataManage() {
    wx.showActionSheet({
      itemList: ['导出数据', '清空所有数据', '重置示例数据'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.exportData()
            break
          case 1:
            this.clearAllData()
            break
          case 2:
            this.resetSampleData()
            break
        }
      }
    })
  },

  // 导出数据
  exportData() {
    try {
      const users = StorageService.getUsers()
      const transactions = StorageService.getTransactions()
      
      const exportData = {
        users,
        transactions,
        exportTime: new Date().toISOString(),
        version: '1.0'
      }
      
      console.log('导出数据:', exportData)
      wx.showModal({
        title: '数据导出',
        content: '数据已输出到控制台，请在开发者工具中查看。\n\n实际应用中可以保存到文件或上传到云端。',
        showCancel: false
      })
    } catch (error) {
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      })
    }
  },

  // 清空所有数据
  clearAllData() {
    wx.showModal({
      title: '危险操作',
      content: '确定要清空所有数据吗？此操作不可恢复！',
      confirmText: '确定清空',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const success = StorageService.clearAllData()
          if (success) {
            wx.showToast({
              title: '数据已清空',
              icon: 'success'
            })
            this.loadData()
          } else {
            wx.showToast({
              title: '清空失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 重置示例数据
  resetSampleData() {
    wx.showModal({
      title: '重置数据',
      content: '这将清除所有现有数据并加载示例数据，确定继续吗？',
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          // 清空现有数据
          StorageService.clearAllData()
          
          // 重新初始化示例数据
          getApp().initSampleData()
          
          wx.showToast({
            title: '已重置为示例数据',
            icon: 'success'
          })
          
          this.loadData()
        }
      }
    })
  },

  // 设置
  onSettings() {
    wx.showModal({
      title: '设置',
      content: '暂未开放更多设置选项',
      showCancel: false
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '股票记录小程序',
      path: '/pages/positions/positions'
    }
  }
})
