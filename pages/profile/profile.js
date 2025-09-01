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
      itemList: ['数据备份', '数据恢复', '清空所有数据', '重置示例数据'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.backupData()
            break
          case 1:
            this.restoreData()
            break
          case 2:
            this.clearAllData()
            break
          case 3:
            this.resetSampleData()
            break
        }
      }
    })
  },

  // 数据备份
  async backupData() {
    const BackupService = require('../../utils/backupService.js')
    const ExportService = require('../../utils/exportService.js')
    
    wx.showActionSheet({
      itemList: ['创建本地备份', '导出到文件', '查看备份列表'],
      success: async (res) => {
        switch(res.tapIndex) {
          case 0:
            await this.createLocalBackup()
            break
          case 1:
            await this.exportToFile()
            break
          case 2:
            this.showBackupList()
            break
        }
      }
    })
  },

  // 创建本地备份
  async createLocalBackup() {
    const BackupService = require('../../utils/backupService.js')
    
    wx.showLoading({
      title: '创建备份中...'
    })

    try {
      const result = await BackupService.createBackup()
      if (result.success) {
        const saveResult = BackupService.saveBackupToStorage(result.data)
        if (saveResult.success) {
          wx.showToast({
            title: '备份创建成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: '保存备份失败',
            icon: 'error'
          })
        }
      }
    } catch (error) {
      wx.showToast({
        title: '备份失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 导出到文件
  async exportToFile() {
    const BackupService = require('../../utils/backupService.js')
    
    wx.showLoading({
      title: '准备导出...'
    })

    try {
      const result = await BackupService.exportBackupToFile()
      if (result.success) {
        wx.showToast({
          title: '导出成功',
          icon: 'success'
        })
      }
    } catch (error) {
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 显示备份列表
  showBackupList() {
    const BackupService = require('../../utils/backupService.js')
    const backups = BackupService.getStoredBackups()
    const backupList = Object.values(backups)
    
    if (backupList.length === 0) {
      wx.showModal({
        title: '备份列表',
        content: '暂无备份数据',
        showCancel: false
      })
      return
    }

    const items = backupList.map(backup => 
      `${backup.name} (${new Date(backup.savedAt).toLocaleString()})`
    )

    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const selectedBackup = backupList[res.tapIndex]
        this.showBackupOptions(selectedBackup)
      }
    })
  },

  // 显示备份操作选项
  showBackupOptions(backup) {
    wx.showActionSheet({
      itemList: ['恢复此备份', '导出此备份', '删除此备份'],
      success: async (res) => {
        const BackupService = require('../../utils/backupService.js')
        
        switch(res.tapIndex) {
          case 0:
            await this.restoreFromBackup(backup.name)
            break
          case 1:
            await BackupService.exportBackupToFile(backup.name)
            break
          case 2:
            await this.deleteBackup(backup.name)
            break
        }
      }
    })
  },

  // 数据恢复
  async restoreData() {
    const BackupService = require('../../utils/backupService.js')
    
    wx.showActionSheet({
      itemList: ['从本地备份恢复', '从文件导入恢复'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          this.showBackupList()
        } else {
          await this.importFromFile()
        }
      }
    })
  },

  // 从备份恢复
  async restoreFromBackup(backupName) {
    const BackupService = require('../../utils/backupService.js')
    
    wx.showModal({
      title: '确认恢复',
      content: '恢复备份将覆盖当前所有数据，确定继续吗？',
      confirmText: '确定恢复',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '恢复中...'
          })

          try {
            const result = await BackupService.restoreFromBackup(backupName)
            if (result.success) {
              wx.showToast({
                title: '恢复成功',
                icon: 'success'
              })
              this.loadData()
            } else {
              wx.showToast({
                title: result.error || '恢复失败',
                icon: 'error'
              })
            }
          } catch (error) {
            wx.showToast({
              title: '恢复失败',
              icon: 'error'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 从文件导入恢复
  async importFromFile() {
    try {
      // 选择文件
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['json'],
        success: async (res) => {
          const filePath = res.tempFiles[0].path
          const BackupService = require('../../utils/backupService.js')
          
          const importResult = await BackupService.importBackupFromFile(filePath)
          
          if (importResult.success) {
            wx.showModal({
              title: '确认导入',
              content: '导入备份将覆盖当前所有数据，确定继续吗？',
              confirmText: '确定导入',
              confirmColor: '#ff4d4f',
              success: async (modalRes) => {
                if (modalRes.confirm) {
                  const restoreResult = await BackupService.restoreFromBackup(null, importResult.data)
                  if (restoreResult.success) {
                    wx.showToast({
                      title: '导入成功',
                      icon: 'success'
                    })
                    this.loadData()
                  } else {
                    wx.showToast({
                      title: restoreResult.error || '导入失败',
                      icon: 'error'
                    })
                  }
                }
              }
            })
          } else {
            wx.showToast({
              title: importResult.error || '文件读取失败',
              icon: 'error'
            })
          }
        }
      })
    } catch (error) {
      wx.showToast({
        title: '文件选择失败',
        icon: 'error'
      })
    }
  },

  // 删除备份
  async deleteBackup(backupName) {
    const BackupService = require('../../utils/backupService.js')
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个备份吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          const result = BackupService.deleteBackup(backupName)
          if (result.success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: result.error || '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
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
