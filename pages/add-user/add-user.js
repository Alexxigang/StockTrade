// pages/add-user/add-user.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    isEdit: false,
    editId: '',
    formData: {
      name: '',
      phone: '',
      email: ''
    },
    canSubmit: false,
    errors: []
  },

  onLoad(options) {
    if (options.editId) {
      this.setData({
        isEdit: true,
        editId: options.editId
      })
      this.loadUserData(options.editId)
    }
  },

  // 加载用户数据（编辑模式）
  loadUserData(userId) {
    const users = StorageService.getUsers()
    const user = users.find(u => u.id === userId)
    
    if (user) {
      this.setData({
        formData: {
          name: user.name,
          phone: user.phone || '',
          email: user.email || ''
        }
      })
      this.checkCanSubmit()
    }
  },

  // 输入框改变
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    this.setData({
      [`formData.${field}`]: value
    })
    
    this.validateField(field, value)
    this.checkCanSubmit()
  },

  // 验证单个字段
  validateField(field, value) {
    this.checkCanSubmit()
  },

  

  // 验证邮箱格式
  isValidEmail(email) {
    const emailRegex = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/
    return emailRegex.test(email)
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { formData } = this.data
    const errors = []
    
    if (!formData.name.trim()) {
      errors.push('请输入用户姓名')
    } else if (formData.name.trim().length < 2) {
      errors.push('姓名至少2个字符')
    }
    
    if (formData.phone.trim() && formData.phone.trim().length !== 11) {
      errors.push('手机号必须为11位')
    }
    
    if (formData.email.trim() && !this.isValidEmail(formData.email.trim())) {
      errors.push('邮箱格式不正确')
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

    const { formData, isEdit, editId } = this.data
    
    // 构建用户数据
    const userData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim()
    }

    let success = false
    
    if (isEdit) {
      // 更新用户
      success = StorageService.updateUser(editId, userData)
    } else {
      // 添加新用户
      const newUser = {
        id: CalculationService.generateId('user'),
        ...userData,
        createTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
      }
      success = StorageService.addUser(newUser)
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
  }
})
