// utils/backupService.js - 数据备份恢复服务

class BackupService {
  // 创建完整数据备份
  static async createBackup() {
    try {
      const StorageService = require('./storage.js')
      const CalculationService = require('./calculation.js')
      
      const backupData = {
        version: '1.0',
        timestamp: Date.now(),
        exportTime: new Date().toISOString(),
        users: StorageService.getUsers(),
        transactions: StorageService.getTransactions(),
        positions: CalculationService.calculateUserPositions(StorageService.getTransactions()),
        metadata: {
          userCount: StorageService.getUsers().length,
          transactionCount: StorageService.getTransactions().length,
          positionCount: CalculationService.calculateUserPositions(StorageService.getTransactions()).length
        }
      }

      return {
        success: true,
        data: backupData,
        size: JSON.stringify(backupData).length
      }
    } catch (error) {
      console.error('创建备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 保存备份到本地存储
  static saveBackupToStorage(backupData, name = null) {
    try {
      const backupName = name || `backup_${Date.now()}`
      const backups = this.getStoredBackups()
      
      backups[backupName] = {
        ...backupData,
        name: backupName,
        savedAt: Date.now()
      }
      
      // 限制备份数量，最多保留10个
      const backupKeys = Object.keys(backups)
      if (backupKeys.length > 10) {
        // 按时间排序，删除最旧的
        const sortedKeys = backupKeys.sort((a, b) => backups[a].savedAt - backups[b].savedAt)
        const keysToDelete = sortedKeys.slice(0, backupKeys.length - 10)
        keysToDelete.forEach(key => delete backups[key])
      }
      
      wx.setStorageSync('stock_backups', backups)
      
      return {
        success: true,
        backupName
      }
    } catch (error) {
      console.error('保存备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取存储的备份列表
  static getStoredBackups() {
    try {
      return wx.getStorageSync('stock_backups') || {}
    } catch (error) {
      console.error('获取备份列表失败:', error)
      return {}
    }
  }

  // 从备份恢复数据
  static async restoreFromBackup(backupName) {
    try {
      const backups = this.getStoredBackups()
      const backup = backups[backupName]
      
      if (!backup) {
        return {
          success: false,
          error: '备份不存在'
        }
      }

      const StorageService = require('./storage.js')
      
      // 清空现有数据
      StorageService.clearAllData()
      
      // 恢复数据
      if (backup.users && Array.isArray(backup.users)) {
        wx.setStorageSync('users', backup.users)
      }
      
      if (backup.transactions && Array.isArray(backup.transactions)) {
        wx.setStorageSync('transactions', backup.transactions)
      }
      
      return {
        success: true,
        restoredData: {
          users: backup.users?.length || 0,
          transactions: backup.transactions?.length || 0
        }
      }
    } catch (error) {
      console.error('恢复备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 删除备份
  static deleteBackup(backupName) {
    try {
      const backups = this.getStoredBackups()
      
      if (backups[backupName]) {
        delete backups[backupName]
        wx.setStorageSync('stock_backups', backups)
        return { success: true }
      }
      
      return {
        success: false,
        error: '备份不存在'
      }
    } catch (error) {
      console.error('删除备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 导出备份到文件
  static async exportBackupToFile(backupName = null) {
    try {
      let backupData
      
      if (backupName) {
        const backups = this.getStoredBackups()
        backupData = backups[backupName]
      } else {
        const result = await this.createBackup()
        if (!result.success) return result
        backupData = result.data
      }
      
      if (!backupData) {
        return {
          success: false,
          error: '备份数据不存在'
        }
      }

      const ExportService = require('./exportService.js')
      const filename = `股票记录备份_${backupName || 'current'}_${this.getCurrentDate()}.json`
      
      return ExportService.downloadFile(
        JSON.stringify(backupData, null, 2),
        filename,
        'application/json;charset=utf-8;'
      )
    } catch (error) {
      console.error('导出备份文件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 从文件导入备份
  static async importBackupFromFile(filePath) {
    try {
      const fs = wx.getFileSystemManager()
      const content = fs.readFileSync(filePath, 'utf8')
      const backupData = JSON.parse(content)
      
      // 验证备份格式
      if (!this.validateBackupFormat(backupData)) {
        return {
          success: false,
          error: '无效的备份文件格式'
        }
      }

      return {
        success: true,
        data: backupData
      }
    } catch (error) {
      console.error('导入备份文件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 验证备份格式
  static validateBackupFormat(backupData) {
    return (
      backupData &&
      typeof backupData === 'object' &&
      backupData.version &&
      backupData.timestamp &&
      Array.isArray(backupData.users) &&
      Array.isArray(backupData.transactions)
    )
  }

  // 自动备份（每天一次）
  static async autoBackup() {
    try {
      const lastBackup = wx.getStorageSync('last_auto_backup') || 0
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      
      if (now - lastBackup > oneDay) {
        const result = await this.createBackup()
        if (result.success) {
          const saveResult = this.saveBackupToStorage(result.data, `auto_${this.getCurrentDate()}`)
          if (saveResult.success) {
            wx.setStorageSync('last_auto_backup', now)
            return {
              success: true,
              backupName: saveResult.backupName
            }
          }
        }
      }
      
      return { success: false, error: '未到自动备份时间' }
    } catch (error) {
      console.error('自动备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取备份统计信息
  static getBackupStats() {
    try {
      const backups = this.getStoredBackups()
      const backupList = Object.values(backups)
      
      return {
        totalCount: backupList.length,
        totalSize: backupList.reduce((sum, backup) => sum + JSON.stringify(backup).length, 0),
        latestBackup: backupList.length > 0 ? 
          Math.max(...backupList.map(b => b.savedAt)) : null,
        oldestBackup: backupList.length > 0 ? 
          Math.min(...backupList.map(b => b.savedAt)) : null
      }
    } catch (error) {
      console.error('获取备份统计失败:', error)
      return {
        totalCount: 0,
        totalSize: 0,
        latestBackup: null,
        oldestBackup: null
      }
    }
  }

  // 清理过期备份（超过30天的自动备份）
  static cleanupOldBackups() {
    try {
      const backups = this.getStoredBackups()
      const now = Date.now()
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      
      let cleanedCount = 0
      
      Object.keys(backups).forEach(key => {
        if (key.startsWith('auto_') && now - backups[key].savedAt > thirtyDays) {
          delete backups[key]
          cleanedCount++
        }
      })
      
      if (cleanedCount > 0) {
        wx.setStorageSync('stock_backups', backups)
      }
      
      return {
        success: true,
        cleanedCount
      }
    } catch (error) {
      console.error('清理过期备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取当前日期字符串
  static getCurrentDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    return `${year}${month}${day}_${hours}${minutes}`
  }
}

module.exports = BackupService