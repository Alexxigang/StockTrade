// utils/exportService.js - 数据导出服务

class ExportService {
  // 导出CSV格式数据
  static exportToCSV(data, filename = 'export.csv') {
    try {
      const csvContent = this.convertToCSV(data)
      this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
      return { success: true }
    } catch (error) {
      console.error('导出CSV失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 转换为CSV格式
  static convertToCSV(data) {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    
    const csvRows = data.map(row => 
      headers.map(header => {
        let value = row[header]
        if (value === null || value === undefined) value = ''
        
        // 处理包含逗号的字符串
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`
        }
        
        return value
      }).join(',')
    )

    return [csvHeaders, ...csvRows].join('\n')
  }

  // 导出持仓数据
  static exportPositions(positions, users) {
    const exportData = positions.map(position => {
      const user = users.find(u => u.id === position.userId)
      return {
        用户姓名: user ? user.name : '未知用户',
        股票代码: position.stockCode,
        股票名称: position.stockName,
        持仓数量: position.totalQuantity,
        平均成本: position.averagePrice,
        总成本: position.totalCost,
        当前价格: position.currentPrice || 'N/A',
        浮动盈亏: position.unrealizedPL || 0,
        盈亏比例: position.unrealizedPLPercent ? `${position.unrealizedPLPercent}%` : 'N/A',
        市值: position.currentPrice ? (position.totalQuantity * position.currentPrice).toFixed(2) : 'N/A'
      }
    })

    return this.exportToCSV(exportData, `持仓数据_${this.getCurrentDate()}.csv`)
  }

  // 导出交易记录
  static exportTransactions(transactions, users) {
    const exportData = transactions.map(transaction => {
      const user = users.find(u => u.id === transaction.userId)
      return {
        用户姓名: user ? user.name : '未知用户',
        股票代码: transaction.stockCode,
        股票名称: transaction.stockName,
        交易类型: transaction.type === 'buy' ? '买入' : '卖出',
        交易数量: transaction.quantity,
        交易价格: transaction.price,
        交易金额: transaction.totalAmount || (transaction.quantity * transaction.price),
        交易日期: transaction.transactionDate,
        备注: transaction.notes || '',
        创建时间: transaction.createTime || ''
      }
    })

    return this.exportToCSV(exportData, `交易记录_${this.getCurrentDate()}.csv`)
  }

  // 导出收益分析
  static exportProfits(profits, users) {
    const exportData = profits.map(profit => {
      const user = users.find(u => u.id === profit.userId)
      return {
        用户姓名: user ? user.name : '未知用户',
        总买入金额: profit.totalBuyAmount,
        总卖出金额: profit.totalSellAmount,
        总买入费用: profit.totalBuyFees || 0,
        总卖出费用: profit.totalSellFees || 0,
        毛收益: profit.realizedPL || 0,
        净收益: profit.netRealizedPL || 0,
        交易次数: profit.transactionCount,
        收益率: profit.totalBuyAmount > 0 ? 
          `${((profit.netRealizedPL / profit.totalBuyAmount) * 100).toFixed(2)}%` : 'N/A'
      }
    })

    return this.exportToCSV(exportData, `收益分析_${this.getCurrentDate()}.csv`)
  }

  // 导出用户列表
  static exportUsers(users) {
    const exportData = users.map(user => ({
      用户ID: user.id,
      姓名: user.name,
      电话: user.phone || '',
      邮箱: user.email || '',
      创建时间: user.createTime || ''
    }))

    return this.exportToCSV(exportData, `用户列表_${this.getCurrentDate()}.csv`)
  }

  // 导出完整数据（包含所有信息）
  static exportFullData(users, transactions, positions) {
    const exportData = {
      users: users,
      transactions: transactions,
      positions: positions,
      exportTime: new Date().toISOString(),
      version: '1.0'
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const filename = `完整数据备份_${this.getCurrentDate()}.json`
    
    return this.downloadFile(jsonString, filename, 'application/json;charset=utf-8;')
  }

  // 下载文件
  static downloadFile(content, filename, mimeType) {
    try {
      // 微信小程序环境
      if (typeof wx !== 'undefined') {
        // 使用文件系统保存
        const fs = wx.getFileSystemManager()
        const filePath = `${wx.env.USER_DATA_PATH}/${filename}`
        
        fs.writeFileSync(filePath, content, 'utf8')
        
        // 保存到用户相册或打开文件
        wx.saveFileToDisk({
          filePath: filePath,
          success: () => {
            wx.showToast({
              title: '导出成功',
              icon: 'success'
            })
          },
          fail: (error) => {
            console.error('保存文件失败:', error)
            // 尝试打开文件
            wx.openDocument({
              filePath: filePath,
              fileType: filename.endsWith('.csv') ? 'csv' : 'txt',
              success: () => {
                wx.showToast({
                  title: '请在打开的文档中手动保存',
                  icon: 'none',
                  duration: 3000
                })
              },
              fail: () => {
                wx.showToast({
                  title: '导出失败，请重试',
                  icon: 'error'
                })
              }
            })
          }
        })
      } else {
        // 浏览器环境
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.style.display = 'none'
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        URL.revokeObjectURL(url)
      }
      
      return { success: true }
    } catch (error) {
      console.error('下载文件失败:', error)
      return { success: false, error: error.message }
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

  // 分享数据（微信小程序专用）
  static shareData(type, data) {
    try {
      let shareContent = ''
      
      switch (type) {
        case 'positions':
          shareContent = this.formatPositionsForShare(data.positions, data.users)
          break
        case 'profits':
          shareContent = this.formatProfitsForShare(data.profits, data.users)
          break
        case 'transactions':
          shareContent = this.formatTransactionsForShare(data.transactions, data.users)
          break
        default:
          shareContent = '股票交易记录数据'
      }

      return {
        title: `股票记录 - ${this.getCurrentDate()}`,
        path: '/pages/index/index',
        content: shareContent
      }
    } catch (error) {
      console.error('分享数据失败:', error)
      return {
        title: '股票记录',
        path: '/pages/index/index'
      }
    }
  }

  // 格式化持仓数据用于分享
  static formatPositionsForShare(positions, users) {
    if (!positions || positions.length === 0) return '暂无持仓数据'
    
    const totalValue = positions.reduce((sum, pos) => sum + (pos.totalQuantity * (pos.currentPrice || pos.averagePrice)), 0)
    const totalCost = positions.reduce((sum, pos) => sum + pos.totalCost, 0)
    const totalPL = totalValue - totalCost
    
    return `持仓总览：\n总资产：¥${totalValue.toFixed(0)}\n总成本：¥${totalCost.toFixed(0)}\n总盈亏：¥${totalPL.toFixed(0)}\n持仓股票：${positions.length}只`
  }

  // 格式化收益数据用于分享
  static formatProfitsForShare(profits, users) {
    if (!profits || profits.length === 0) return '暂无收益数据'
    
    const totalProfit = profits.reduce((sum, p) => sum + (p.netRealizedPL || 0), 0)
    return `收益总览：\n总收益：¥${totalProfit.toFixed(0)}\n用户数量：${profits.length}人`
  }

  // 格式化交易数据用于分享
  static formatTransactionsForShare(transactions, users) {
    if (!transactions || transactions.length === 0) return '暂无交易数据'
    
    const buyCount = transactions.filter(t => t.type === 'buy').length
    const sellCount = transactions.filter(t => t.type === 'sell').length
    
    return `交易总览：\n总交易：${transactions.length}笔\n买入：${buyCount}笔\n卖出：${sellCount}笔`
  }
}

module.exports = ExportService