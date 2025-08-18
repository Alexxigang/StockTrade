// utils/storage.js - 微信小程序存储服务

class StorageService {
  // 用户管理
  static getUsers() {
    try {
      return wx.getStorageSync('users') || []
    } catch (error) {
      console.error('获取用户数据失败:', error)
      return []
    }
  }

  static addUser(user) {
    try {
      const users = this.getUsers()
      users.push(user)
      wx.setStorageSync('users', users)
      return true
    } catch (error) {
      console.error('添加用户失败:', error)
      return false
    }
  }

  static updateUser(userId, userData) {
    try {
      const users = this.getUsers()
      const index = users.findIndex(u => u.id === userId)
      if (index !== -1) {
        users[index] = { ...users[index], ...userData }
        wx.setStorageSync('users', users)
        return true
      }
      return false
    } catch (error) {
      console.error('更新用户失败:', error)
      return false
    }
  }

  static deleteUser(userId) {
    try {
      const users = this.getUsers()
      const filteredUsers = users.filter(u => u.id !== userId)
      wx.setStorageSync('users', filteredUsers)
      return true
    } catch (error) {
      console.error('删除用户失败:', error)
      return false
    }
  }

  // 交易记录管理
  static getTransactions() {
    try {
      return wx.getStorageSync('transactions') || []
    } catch (error) {
      console.error('获取交易记录失败:', error)
      return []
    }
  }

  static addTransaction(transaction) {
    try {
      const transactions = this.getTransactions()
      transactions.push(transaction)
      wx.setStorageSync('transactions', transactions)
      return true
    } catch (error) {
      console.error('添加交易记录失败:', error)
      return false
    }
  }

  static updateTransaction(transactionId, transactionData) {
    try {
      const transactions = this.getTransactions()
      const index = transactions.findIndex(t => t.id === transactionId)
      if (index !== -1) {
        transactions[index] = { ...transactions[index], ...transactionData }
        wx.setStorageSync('transactions', transactions)
        return true
      }
      return false
    } catch (error) {
      console.error('更新交易记录失败:', error)
      return false
    }
  }

  static deleteTransaction(transactionId) {
    try {
      const transactions = this.getTransactions()
      const filteredTransactions = transactions.filter(t => t.id !== transactionId)
      wx.setStorageSync('transactions', filteredTransactions)
      return true
    } catch (error) {
      console.error('删除交易记录失败:', error)
      return false
    }
  }

  // 清空所有数据
  static clearAllData() {
    try {
      wx.removeStorageSync('users')
      wx.removeStorageSync('transactions')
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      return false
    }
  }

  // 获取存储使用情况
  static getStorageInfo() {
    try {
      return wx.getStorageInfoSync()
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return null
    }
  }
}

module.exports = StorageService
