// utils/importService.js - 交易数据导入服务
const StorageService = require('./storage.js')
const CalculationService = require('./calculation.js')

class ImportService {
  // 支持的导入格式
  static SUPPORTED_FORMATS = {
    CSV: 'csv',
    EXCEL: 'excel',
    JSON: 'json'
  }

  // 券商模板映射
  static BROKER_TEMPLATES = {
    '华泰证券': {
      columns: {
        '成交日期': 'date',
        '证券代码': 'stockCode',
        '证券名称': 'stockName',
        '买卖标志': 'type', // 买入/卖出
        '成交价格': 'price',
        '成交数量': 'quantity',
        '成交金额': 'amount',
        '手续费': 'fee',
        '印花税': 'tax',
        '过户费': 'transferFee',
        '发生金额': 'totalAmount'
      },
      dateFormat: 'YYYYMMDD',
      typeMapping: {
        '买入': 'buy',
        '卖出': 'sell'
      }
    },
    '东方财富': {
      columns: {
        '成交时间': 'date',
        '证券代码': 'stockCode',
        '证券名称': 'stockName',
        '操作': 'type',
        '成交价格': 'price',
        '成交数量': 'quantity',
        '成交金额': 'amount',
        '手续费': 'fee',
        '印花税': 'tax',
        '其他费用': 'otherFee',
        '发生金额': 'totalAmount'
      },
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      typeMapping: {
        '买入': 'buy',
        '卖出': 'sell',
        '证券买入': 'buy',
        '证券卖出': 'sell'
      }
    },
    '同花顺': {
      columns: {
        '日期': 'date',
        '代码': 'stockCode',
        '名称': 'stockName',
        '方向': 'type',
        '价格': 'price',
        '数量': 'quantity',
        '金额': 'amount',
        '佣金': 'fee',
        '印花税': 'tax',
        '过户费': 'transferFee'
      },
      dateFormat: 'YYYY/MM/DD',
      typeMapping: {
        '买入': 'buy',
        '卖出': 'sell'
      }
    }
  }

  // 通用模板（用户自定义）
  static GENERIC_TEMPLATE = {
    columns: {
      'date': '交易日期',
      'stockCode': '股票代码',
      'stockName': '股票名称',
      'type': '交易类型(buy/sell)',
      'price': '成交价格',
      'quantity': '成交数量',
      'amount': '成交金额',
      'fee': '手续费',
      'tax': '印花税'
    },
    dateFormat: 'auto',
    typeMapping: {
      'buy': 'buy',
      'sell': 'sell',
      '买入': 'buy',
      '卖出': 'sell',
      'B': 'buy',
      'S': 'sell'
    }
  }

  // 解析CSV文件
  static parseCSV(csvText) {
    try {
      const lines = csvText.trim().split('\n')
      if (lines.length < 2) {
        throw new Error('CSV文件至少需要包含标题行和数据行')
      }

      // 解析标题行
      const headers = this.parseCSVLine(lines[0])
      const data = []

      // 解析数据行
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line) {
          const values = this.parseCSVLine(line)
          const row = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          data.push(row)
        }
      }

      return {
        success: true,
        headers,
        data,
        totalRows: data.length
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 解析CSV单行（处理引号和逗号）
  static parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 2
        } else {
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
    
    result.push(current.trim())
    return result
  }

  // 自动检测券商模板
  static detectTemplate(headers) {
    const headerSet = new Set(headers.map(h => h.trim()))
    
    for (const [brokerName, template] of Object.entries(this.BROKER_TEMPLATES)) {
      const templateHeaders = Object.keys(template.columns)
      const matchCount = templateHeaders.filter(h => headerSet.has(h)).length
      
      if (matchCount >= Math.max(3, templateHeaders.length * 0.6)) {
        return {
          broker: brokerName,
          template,
          confidence: matchCount / templateHeaders.length
        }
      }
    }

    return {
      broker: '通用模板',
      template: this.GENERIC_TEMPLATE,
      confidence: 0
    }
  }

  // 转换日期格式
  static parseDate(dateStr, format = 'auto') {
    try {
      if (!dateStr) return null

      dateStr = dateStr.toString().trim()

      // 自动检测格式
      if (format === 'auto') {
        // YYYYMMDD
        if (/^\d{8}$/.test(dateStr)) {
          const year = dateStr.substring(0, 4)
          const month = dateStr.substring(4, 6)
          const day = dateStr.substring(6, 8)
          return `${year}-${month}-${day}`
        }
        
        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr
        }
        
        // YYYY/MM/DD
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
          return dateStr.replace(/\//g, '-')
        }
        
        // YYYY-MM-DD HH:mm:ss
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          return dateStr.split(' ')[0]
        }
        
        // YYYY/MM/DD HH:mm:ss
        if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          return dateStr.split(' ')[0].replace(/\//g, '-')
        }
      }

      return dateStr
    } catch (error) {
      console.error('日期解析失败:', error)
      return null
    }
  }

  // 转换交易类型
  static parseType(typeStr, typeMapping) {
    if (!typeStr) return null
    
    const cleanType = typeStr.toString().trim().toLowerCase()
    return typeMapping[cleanType] || typeMapping[typeStr.toString().trim()] || null
  }

  // 转换数值
  static parseNumber(value, defaultValue = 0) {
    if (!value) return defaultValue
    
    const num = parseFloat(value.toString().replace(/[,，]/g, ''))
    return isNaN(num) ? defaultValue : num
  }

  // 验证交易记录
  static validateTransaction(transaction) {
    const errors = []

    if (!transaction.date) {
      errors.push('交易日期不能为空')
    }

    if (!transaction.stockCode || transaction.stockCode.trim().length < 6) {
      errors.push('股票代码格式不正确')
    }

    if (!transaction.type || !['buy', 'sell'].includes(transaction.type)) {
      errors.push('交易类型必须是买入或卖出')
    }

    if (!transaction.price || transaction.price <= 0) {
      errors.push('成交价格必须大于0')
    }

    if (!transaction.quantity || transaction.quantity <= 0) {
      errors.push('成交数量必须大于0')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 转换原始数据为交易记录
  static convertToTransaction(rawData, template) {
    try {
      const transaction = {
        id: CalculationService.generateId('transaction'),
        date: null,
        stockCode: null,
        stockName: null,
        type: null,
        price: 0,
        quantity: 0,
        amount: 0,
        fee: 0,
        tax: 0,
        otherFee: 0,
        totalAmount: 0,
        notes: '导入数据',
        createTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
      }

      // 映射字段
      for (const [templateField, sourceField] of Object.entries(template.columns)) {
        const value = rawData[sourceField]
        if (value !== undefined && value !== null && value !== '') {
          switch (templateField) {
            case 'date':
              transaction.date = this.parseDate(value, template.dateFormat)
              break
            case 'stockCode':
              transaction.stockCode = value.toString().replace(/[^\d]/g, '').padStart(6, '0')
              break
            case 'stockName':
              transaction.stockName = value.toString().trim()
              break
            case 'type':
              transaction.type = this.parseType(value, template.typeMapping)
              break
            case 'price':
              transaction.price = this.parseNumber(value)
              break
            case 'quantity':
              transaction.quantity = Math.abs(this.parseNumber(value))
              break
            case 'amount':
              transaction.amount = Math.abs(this.parseNumber(value))
              break
            case 'fee':
              transaction.fee = this.parseNumber(value)
              break
            case 'tax':
              transaction.tax = this.parseNumber(value)
              break
            case 'otherFee':
            case 'transferFee':
              transaction.otherFee += this.parseNumber(value)
              break
            case 'totalAmount':
              transaction.totalAmount = this.parseNumber(value)
              break
          }
        }
      }

      // 计算缺失的字段
      if (transaction.amount === 0 && transaction.price > 0 && transaction.quantity > 0) {
        transaction.amount = transaction.price * transaction.quantity
      }

      if (transaction.totalAmount === 0) {
        transaction.totalAmount = transaction.amount + transaction.fee + transaction.tax + transaction.otherFee
      }

      return transaction
    } catch (error) {
      console.error('转换交易记录失败:', error)
      return null
    }
  }

  // 导入交易数据
  static async importTransactions(fileContent, brokerName = 'auto') {
    try {
      // 解析CSV
      const parseResult = this.parseCSV(fileContent)
      if (!parseResult.success) {
        return parseResult
      }

      const { headers, data } = parseResult

      // 检测模板
      const templateInfo = brokerName === 'auto' 
        ? this.detectTemplate(headers) 
        : { broker: brokerName, template: this.BROKER_TEMPLATES[brokerName] || this.GENERIC_TEMPLATE }

      if (!templateInfo.template) {
        return {
          success: false,
          error: '无法识别的数据格式'
        }
      }

      // 转换数据
      const transactions = []
      const errors = []

      data.forEach((row, index) => {
        const transaction = this.convertToTransaction(row, templateInfo.template)
        
        if (!transaction) {
          errors.push(`第${index + 2}行：数据转换失败`)
          return
        }

        const validation = this.validateTransaction(transaction)
        if (!validation.isValid) {
          errors.push(`第${index + 2}行：${validation.errors.join(', ')}`)
          return
        }

        // 格式化价格
        transaction.price = parseFloat(transaction.price.toFixed(2))
        transactions.push(transaction)
      })

      return {
        success: true,
        transactions,
        errors,
        summary: {
          total: data.length,
          valid: transactions.length,
          invalid: errors.length,
          broker: templateInfo.broker,
          confidence: templateInfo.confidence,
          confidencePercent: Math.round(templateInfo.confidence * 100)
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 保存导入的交易记录
  static async saveImportedTransactions(transactions, userId) {
    try {
      let successCount = 0
      let duplicateCount = 0
      const errors = []

      // 获取现有交易记录，检查重复
      const existingTransactions = StorageService.getTransactions()
      
      for (const transaction of transactions) {
        // 检查是否已存在相同交易（基于日期、股票代码、价格、数量）
        const isDuplicate = existingTransactions.some(t => 
          t.date === transaction.date &&
          t.stockCode === transaction.stockCode &&
          t.price === transaction.price &&
          t.quantity === transaction.quantity &&
          t.type === transaction.type
        )

        if (isDuplicate) {
          duplicateCount++
          continue
        }

        // 添加用户ID
        transaction.userId = userId
        
        // 保存交易记录
        const saved = StorageService.addTransaction(transaction)
        if (saved) {
          successCount++
        } else {
          errors.push(`保存失败：${transaction.stockName} ${transaction.date}`)
        }
      }

      return {
        success: true,
        summary: {
          total: transactions.length,
          saved: successCount,
          duplicates: duplicateCount,
          errors: errors.length
        },
        errors
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 生成导入模板
  static generateTemplate(brokerName = 'generic') {
    const template = brokerName === 'generic' 
      ? this.GENERIC_TEMPLATE 
      : this.BROKER_TEMPLATES[brokerName]

    if (!template) {
      return null
    }

    const headers = Object.keys(template.columns)
    const sampleData = [
      {
        '交易日期': '2024-01-15',
        '股票代码': '000001',
        '股票名称': '平安银行',
        '交易类型(buy/sell)': 'buy',
        '成交价格': 10.50,
        '成交数量': 1000,
        '成交金额': 10500.00,
        '手续费': 5.25,
        '印花税': 0.00
      },
      {
        '交易日期': '2024-01-16',
        '股票代码': '000001',
        '股票名称': '平安银行',
        '交易类型(buy/sell)': 'sell',
        '成交价格': 11.20,
        '成交数量': 500,
        '成交金额': 5600.00,
        '手续费': 2.80,
        '印花税': 5.60
      }
    ]

    return {
      headers,
      sampleData,
      description: `${brokerName}交易记录导入模板`
    }
  }

  // 导出错误报告
  static generateErrorReport(errors) {
    const csvContent = [
      ['行号', '错误描述'],
      ...errors.map(error => {
        const match = error.match(/第(\d+)行：(.+)/)
        return match ? [match[1], match[2]] : ['', error]
      })
    ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

    return {
      filename: `导入错误报告_${new Date().toISOString().slice(0, 10)}.csv`,
      content: csvContent,
      mimeType: 'text/csv'
    }
  }
}

module.exports = ImportService