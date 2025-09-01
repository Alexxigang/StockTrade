// pages/add-transaction/add-transaction.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    isEdit: false,
    editId: '',
    users: [],
    userOptions: [],
    userIndex: 0,
    selectedUser: null,
    typeOptions: [
      { value: 'buy', label: '买入' },
      { value: 'sell', label: '卖出' }
    ],
    typeIndex: 0,
    formData: {
      stockCode: '',
      stockName: '',
      type: 'buy',
      quantity: '',
      price: '',
      transactionDate: '',
      notes: ''
    },
    totalAmount: 0,
    canSubmit: false,
    errors: []
  },

  onLoad(options) {
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0]
    this.setData({
      'formData.transactionDate': today
    })

    // 加载用户数据
    this.loadUsers()

    // 检查是否是编辑模式
    if (options.editId) {
      this.setData({
        isEdit: true,
        editId: options.editId
      })
      this.loadTransactionData(options.editId)
    }

    // 检查是否预设了股票信息
    if (options.stockCode && options.stockName) {
      this.setData({
        'formData.stockCode': options.stockCode,
        'formData.stockName': options.stockName
      })
    }
  },

  // 加载用户数据
  loadUsers() {
    const users = StorageService.getUsers()
    this.setData({
      users,
      userOptions: users,
      selectedUser: users.length > 0 ? users[0] : null
    })
  },

  // 加载交易数据（编辑模式）
  loadTransactionData(transactionId) {
    const transactions = StorageService.getTransactions()
    const transaction = transactions.find(t => t.id === transactionId)
    
    if (transaction) {
      // 找到对应的用户和类型索引
      const userIndex = this.data.users.findIndex(u => u.id === transaction.userId)
      const typeIndex = this.data.typeOptions.findIndex(t => t.value === transaction.type)
      
      this.setData({
        userIndex: userIndex >= 0 ? userIndex : 0,
        selectedUser: userIndex >= 0 ? this.data.users[userIndex] : null,
        typeIndex: typeIndex >= 0 ? typeIndex : 0,
        formData: {
          stockCode: transaction.stockCode,
          stockName: transaction.stockName,
          type: transaction.type,
          quantity: transaction.quantity.toString(),
          price: transaction.price.toString(),
          transactionDate: transaction.transactionDate,
          notes: transaction.notes || ''
        }
      })
      
      this.calculateTotal()
      this.checkCanSubmit()
    }
  },

  // 用户选择改变
  onUserChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      userIndex: index,
      selectedUser: this.data.users[index]
    })
    this.checkCanSubmit()
  },

  // 交易类型改变
  onTypeChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      typeIndex: index,
      'formData.type': this.data.typeOptions[index].value
    })
  },

  // 输入框改变
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    this.setData({
      [`formData.${field}`]: value
    })

    // 实时验证
    this.validateField(field, value)
    
    // 如果是数量或价格改变，重新计算总金额
    if (field === 'quantity' || field === 'price') {
      this.calculateTotal()
    }
    
    this.checkCanSubmit()
  },

  // 验证单个字段
  validateField(field, value) {
    // 简化验证，不在此方法中处理错误显示
    this.checkCanSubmit()
  },

  

  // 日期改变
  onDateChange(e) {
    this.setData({
      'formData.transactionDate': e.detail.value
    })
    this.checkCanSubmit()
  },

  // 计算总金额
  calculateTotal() {
    const { quantity, price } = this.data.formData
    const quantityNum = parseFloat(quantity) || 0
    const priceNum = parseFloat(price) || 0
    const total = quantityNum * priceNum
    
    this.setData({
      totalAmount: total.toFixed(2)
    })
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { formData, selectedUser } = this.data
    const errors = []
    
    if (!selectedUser) {
      errors.push('请选择用户')
    }
    if (!formData.stockCode.trim()) {
      errors.push('请输入股票代码')
    } else if (formData.stockCode.trim().length !== 6) {
      errors.push('股票代码必须为6位数字')
    }
    if (!formData.stockName.trim()) {
      errors.push('请输入股票名称')
    }
    if (!formData.quantity) {
      errors.push('请输入交易数量')
    } else if (parseFloat(formData.quantity) <= 0) {
      errors.push('交易数量必须大于0')
    }
    if (!formData.price) {
      errors.push('请输入交易价格')
    } else if (parseFloat(formData.price) <= 0) {
      errors.push('交易价格必须大于0')
    }
    if (!formData.transactionDate) {
      errors.push('请选择交易日期')
    }
    
    const canSubmit = errors.length === 0
    this.setData({ 
      canSubmit,
      errors
    })
    
    return errors
  },

  // 提交表单
  onSubmit() {
    const errors = this.checkCanSubmit()
    
    if (errors.length > 0) {
      wx.showModal({
        title: '请完善以下信息',
        content: errors.join('\n'),
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    const { formData, selectedUser, isEdit, editId } = this.data
    
    // 构建交易数据
    const transactionData = {
      userId: selectedUser.id,
      stockCode: formData.stockCode.toUpperCase(),
      stockName: formData.stockName.trim(),
      type: formData.type,
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price),
      totalAmount: parseFloat(formData.quantity) * parseFloat(formData.price),
      transactionDate: formData.transactionDate,
      notes: formData.notes.trim()
    }

    let success = false
    
    if (isEdit) {
      // 更新交易
      success = StorageService.updateTransaction(editId, transactionData)
    } else {
      // 添加新交易
      const newTransaction = {
        id: CalculationService.generateId('trans'),
        ...transactionData,
        createTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
      }
      success = StorageService.addTransaction(newTransaction)
    }

    if (success) {
      wx.showToast({
        title: isEdit ? '更新成功' : '添加成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      wx.showToast({
        title: isEdit ? '更新失败' : '添加失败',
        icon: 'error'
      })
    }
  },

  // 取消
  onCancel() {
    wx.navigateBack()
  },

  // 删除交易（编辑模式）
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条交易记录吗？此操作不可恢复。',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const success = StorageService.deleteTransaction(this.data.editId)
          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  }
})
